// Custom Server with Socket.IO for Real-time Chat
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3001', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Global storage for events and socket instance
global.__chatEvents = [];
global.__io = null;

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Initialize Socket.IO
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Store io instance globally for API routes to access
  global.__io = io;

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join all rooms channel for receiving all messages
    socket.on('join-all-rooms', () => {
      socket.join('all-rooms');
      console.log(`[Socket.IO] ${socket.id} joined all-rooms`);
    });

    // Join specific chat room
    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      console.log(`[Socket.IO] ${socket.id} joined room: ${roomId}`);
    });

    // Leave chat room
    socket.on('leave-room', (roomId) => {
      socket.leave(roomId);
      console.log(`[Socket.IO] ${socket.id} left room: ${roomId}`);
    });

    // Message read acknowledgment
    socket.on('message-read', ({ roomId, messageIds }) => {
      io.to(roomId).emit('messages-read', { roomId, messageIds });
      io.to('all-rooms').emit('messages-read', { roomId, messageIds });
    });

    // Typing indicators
    socket.on('typing-start', ({ roomId, userName }) => {
      socket.to(roomId).emit('user-typing', { roomId, userName, isTyping: true });
    });

    socket.on('typing-stop', ({ roomId, userName }) => {
      socket.to(roomId).emit('user-typing', { roomId, userName, isTyping: false });
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    socket.on('error', (error) => {
      console.error(`[Socket.IO] Socket error:`, error);
    });
  });

  server.listen(port, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 Server ready on http://${hostname}:${port}                 ║
║   📡 Socket.IO enabled for real-time chat                 ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down...');
    io.close();
    server.close(() => {
      process.exit(0);
    });
  });
});
