// Custom Server with Socket.IO for Real-time Chat
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3001', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Global storage for socket instance and connected clients
global.__chatEvents = [];
global.__io = null;
global.__connectedClients = new Map();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Initialize Socket.IO with optimized settings for stability
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    // Stability settings
    pingTimeout: 30000,
    pingInterval: 10000,
    upgradeTimeout: 30000,
    maxHttpBufferSize: 1e6,
    // Reconnection settings
    connectTimeout: 45000,
    allowEIO3: true,
  });

  // Store io instance globally for API routes to access
  global.__io = io;

  // Connection monitoring
  let totalConnections = 0;

  io.on('connection', (socket) => {
    totalConnections++;
    const clientInfo = {
      id: socket.id,
      connectedAt: new Date().toISOString(),
      rooms: new Set(['all-rooms']),
    };
    global.__connectedClients.set(socket.id, clientInfo);
    
    console.log(`[Socket.IO] ✅ Client connected: ${socket.id} (Total: ${totalConnections})`);

    // Auto join all-rooms for broadcast
    socket.join('all-rooms');

    // Join all rooms channel for receiving all messages
    socket.on('join-all-rooms', () => {
      socket.join('all-rooms');
      clientInfo.rooms.add('all-rooms');
      console.log(`[Socket.IO] ${socket.id} joined all-rooms`);
    });

    // Join specific chat room
    socket.on('join-room', (roomId) => {
      if (roomId) {
        socket.join(roomId);
        clientInfo.rooms.add(roomId);
        console.log(`[Socket.IO] ${socket.id} joined room: ${roomId}`);
      }
    });

    // Leave chat room
    socket.on('leave-room', (roomId) => {
      if (roomId) {
        socket.leave(roomId);
        clientInfo.rooms.delete(roomId);
        console.log(`[Socket.IO] ${socket.id} left room: ${roomId}`);
      }
    });

    // Message read acknowledgment
    socket.on('message-read', ({ roomId, messageIds }) => {
      if (roomId && messageIds) {
        io.to(roomId).emit('messages-read', { roomId, messageIds });
        io.to('all-rooms').emit('messages-read', { roomId, messageIds });
      }
    });

    // Typing indicators
    socket.on('typing-start', ({ roomId, userName }) => {
      if (roomId) {
        socket.to(roomId).emit('user-typing', { roomId, userName, isTyping: true });
      }
    });

    socket.on('typing-stop', ({ roomId, userName }) => {
      if (roomId) {
        socket.to(roomId).emit('user-typing', { roomId, userName, isTyping: false });
      }
    });

    // Heartbeat/ping from client
    socket.on('ping-server', () => {
      socket.emit('pong-server', { timestamp: Date.now() });
    });

    socket.on('disconnect', (reason) => {
      totalConnections--;
      global.__connectedClients.delete(socket.id);
      console.log(`[Socket.IO] ❌ Client disconnected: ${socket.id}, reason: ${reason} (Total: ${totalConnections})`);
    });

    socket.on('error', (error) => {
      console.error(`[Socket.IO] Socket error for ${socket.id}:`, error.message);
    });

    // Send initial connection success
    socket.emit('connection-success', { 
      socketId: socket.id, 
      serverTime: new Date().toISOString(),
      totalClients: totalConnections 
    });
  });

  // Broadcast helper function for API routes
  global.__broadcast = (event, data) => {
    if (global.__io) {
      global.__io.to('all-rooms').emit(event, data);
      console.log(`[Socket.IO] 📡 Broadcast: ${event}`);
    }
  };

  // Broadcast to specific room
  global.__broadcastToRoom = (roomId, event, data) => {
    if (global.__io && roomId) {
      global.__io.to(roomId).emit(event, data);
      global.__io.to('all-rooms').emit(event, data);
      console.log(`[Socket.IO] 📡 Broadcast to ${roomId}: ${event}`);
    }
  };

  server.listen(port, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 Server ready on http://${hostname}:${port}                 ║
║   📡 Socket.IO enabled for real-time chat                 ║
║   ⚡ Optimized for stability and reliability              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    io.close();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    io.close();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  // Handle uncaught errors
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
});
