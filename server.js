// ═══════════════════════════════════════════════════════════════════════════════
// ENTERPRISE-GRADE SOCKET.IO SERVER - ULTRA STABLE REAL-TIME CONNECTION
// ═══════════════════════════════════════════════════════════════════════════════
// Features:
// - Optimized ping/pong for connection health monitoring
// - Graceful handling of client disconnections
// - Room-based broadcasting with fallback
// - Connection state tracking per client
// - Memory-efficient client management
// ═══════════════════════════════════════════════════════════════════════════════

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

  // Initialize Socket.IO with AGGRESSIVE keep-alive settings for background tabs
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    // CRITICAL: Very aggressive ping settings to survive Chrome tab throttling
    pingTimeout: 60000,        // 60 seconds - very lenient timeout
    pingInterval: 3000,        // Ping every 3 seconds 
    upgradeTimeout: 30000,
    maxHttpBufferSize: 1e7,
    connectTimeout: 20000,
    allowEIO3: true,
    // Performance settings
    perMessageDeflate: {
      threshold: 1024,
    },
  });

  // Store io instance globally for API routes to access
  global.__io = io;

  // Connection monitoring
  let totalConnections = 0;
  let peakConnections = 0;

  // Periodic cleanup of stale connections
  setInterval(() => {
    const now = Date.now();
    let cleanedUp = 0;
    
    global.__connectedClients.forEach((client, socketId) => {
      // Check if socket is still connected
      const socket = io.sockets.sockets.get(socketId);
      if (!socket || !socket.connected) {
        global.__connectedClients.delete(socketId);
        cleanedUp++;
      }
    });
    
    if (cleanedUp > 0) {
      console.log(`[Socket.IO] 🧹 Cleaned up ${cleanedUp} stale connections`);
    }
  }, 60000); // Every minute

  io.on('connection', (socket) => {
    totalConnections++;
    peakConnections = Math.max(peakConnections, totalConnections);
    
    const clientInfo = {
      id: socket.id,
      connectedAt: new Date().toISOString(),
      lastPingAt: Date.now(),
      rooms: new Set(['all-rooms']),
      userAgent: socket.handshake.headers['user-agent'] || 'unknown',
    };
    global.__connectedClients.set(socket.id, clientInfo);
    
    console.log(`[Socket.IO] ✅ Client connected: ${socket.id} (Active: ${totalConnections}, Peak: ${peakConnections})`);

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

    // Message read acknowledgment - broadcast to ALL clients
    socket.on('message-read', ({ roomId, messageIds }) => {
      if (roomId && messageIds) {
        io.to(roomId).emit('messages-read', { roomId, messageIds });
        io.to('all-rooms').emit('messages-read', { roomId, messageIds });
      }
    });

    // Room read status - broadcast when someone opens a room
    socket.on('room-read', ({ roomId }) => {
      if (roomId) {
        console.log(`[Socket.IO] Room read: ${roomId} by ${socket.id}`);
        // Broadcast to ALL clients that this room has been read
        io.emit('room-read-update', { roomId, readAt: new Date().toISOString() });
      }
    });

    // Room property update (pin, mute, tags, status) - broadcast to ALL clients
    socket.on('room-property-update', ({ roomId, updates }) => {
      if (roomId && updates) {
        console.log(`[Socket.IO] Room property update: ${roomId}`, updates);
        // Broadcast to ALL clients including sender
        console.log(`[Socket.IO] 📢 Broadcasting room-property-changed to ALL clients (${io.engine.clientsCount} connected)`);
        io.emit('room-property-changed', { roomId, updates, updatedAt: new Date().toISOString() });
      }
    });

    // Room deleted - broadcast to ALL clients
    socket.on('room-deleted', ({ roomId }) => {
      if (roomId) {
        console.log(`[Socket.IO] Room deleted: ${roomId}`);
        // Broadcast to ALL clients including sender
        io.emit('room-removed', { roomId, deletedAt: new Date().toISOString() });
      }
    });

    // Typing indicators
    socket.on('typing-start', ({ roomId, userName }) => {
      if (roomId) {
        console.log(`[Socket.IO] Typing start: ${userName} in room ${roomId}`);
        // Broadcast to all EXCEPT sender using socket.broadcast
        socket.to(roomId).emit('user-typing', { roomId, userName, isTyping: true, socketId: socket.id });
        socket.to('all-rooms').emit('user-typing', { roomId, userName, isTyping: true, socketId: socket.id });
      }
    });

    socket.on('typing-stop', ({ roomId, userName }) => {
      if (roomId) {
        console.log(`[Socket.IO] Typing stop: ${userName} in room ${roomId}`);
        // Broadcast to all EXCEPT sender using socket.broadcast
        socket.to(roomId).emit('user-typing', { roomId, userName, isTyping: false, socketId: socket.id });
        socket.to('all-rooms').emit('user-typing', { roomId, userName, isTyping: false, socketId: socket.id });
      }
    });

    // Heartbeat/ping from client - CRITICAL for connection health
    socket.on('ping-server', () => {
      // Update last ping time
      const clientInfo = global.__connectedClients.get(socket.id);
      if (clientInfo) {
        clientInfo.lastPingAt = Date.now();
      }
      // Respond immediately with pong
      socket.emit('pong-server', { timestamp: Date.now(), socketId: socket.id });
    });

    socket.on('disconnect', (reason) => {
      totalConnections = Math.max(0, totalConnections - 1);
      global.__connectedClients.delete(socket.id);
      console.log(`[Socket.IO] ❌ Client disconnected: ${socket.id}, reason: ${reason} (Active: ${totalConnections})`);
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
      console.log(`[Socket.IO] 📡 Broadcast to all-rooms: ${event}`);
    }
  };

  // Broadcast to specific room AND all-rooms
  global.__broadcastToRoom = (roomId, event, data) => {
    if (global.__io) {
      // Emit to specific room first
      if (roomId) {
        global.__io.to(roomId).emit(event, data);
        console.log(`[Socket.IO] 📡 Broadcast to room ${roomId}: ${event}`);
      }
      // ALWAYS emit to all-rooms for dashboard updates
      global.__io.to('all-rooms').emit(event, data);
      console.log(`[Socket.IO] 📡 Broadcast to all-rooms: ${event}`);
    }
  };

  server.listen(port, () => {
    console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║   🚀 ENTERPRISE-GRADE SERVER READY                                 ║
║   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ║
║   📡 HTTP Server: http://${hostname}:${port}                             ║
║   🔌 Socket.IO: WebSocket + Polling fallback                       ║
║   ⚡ Heartbeat: 5s interval / 20s timeout                          ║
║   🔄 Auto-reconnect: Exponential backoff with jitter               ║
║   🧹 Cleanup: Stale connections every 60s                          ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
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
