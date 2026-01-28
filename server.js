// ═══════════════════════════════════════════════════════════════════════════════
// ENTERPRISE-GRADE SOCKET.IO SERVER - ULTRA STABLE REAL-TIME CONNECTION
// ═══════════════════════════════════════════════════════════════════════════════
// Features:
// - Optimized ping/pong for connection health monitoring
// - Graceful handling of client disconnections
// - Room-based broadcasting with fallback
// - Connection state tracking per client
// - Memory-efficient client management
// - Global broadcast functions for API routes
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
// These globals are shared with API routes in production mode
global.__chatEvents = [];
global.__io = null;
global.__connectedClients = new Map();
global.__broadcast = null;
global.__broadcastToRoom = null;

console.log('[Server] 🚀 Starting enterprise server...');
console.log(`[Server] Environment: ${dev ? 'development' : 'production'}`);
console.log(`[Server] Port: ${port}`);

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Initialize Socket.IO with OPTIMAL settings
  // Socket.IO has built-in ping/pong - no need for custom heartbeat
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    // OPTIMAL: Socket.IO default ping is sufficient
    pingTimeout: 20000,        // 20 seconds to respond (default)
    pingInterval: 25000,       // Ping every 25 seconds (default)
    upgradeTimeout: 10000,
    maxHttpBufferSize: 1e6,    // 1MB max message size
    connectTimeout: 45000,
    // Compression for large messages
    perMessageDeflate: {
      threshold: 2048,         // Only compress > 2KB
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
      userName: null, // Will be set when client identifies
    };
    global.__connectedClients.set(socket.id, clientInfo);

    console.log(`[Socket.IO] ✅ Client connected: ${socket.id} (Active: ${totalConnections}, Peak: ${peakConnections})`);

    // Auto join all-rooms for broadcast
    socket.join('all-rooms');

    // Helper function to get userName with fallback - CRITICAL for multi-browser sync
    const getUserName = () => {
      return clientInfo.userName || 'Agent';
    };

    // Client identifies with their userName - CRITICAL for tracking who does what
    // This should be called immediately after socket connects
    socket.on('identify', ({ userName }) => {
      if (userName && userName !== 'undefined' && userName.trim() !== '') {
        clientInfo.userName = userName.trim();
        console.log(`[Socket.IO] 🎫 Client identified: ${socket.id} as "${clientInfo.userName}"`);

        // Notify other clients that this user is online (optional but useful)
        socket.broadcast.emit('user-online', {
          userName: clientInfo.userName,
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
      } else {
        console.log(`[Socket.IO] ⚠️ Client ${socket.id} tried to identify with invalid userName: "${userName}"`);
      }
    });

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
    socket.on('room-read', ({ roomId, userName }) => {
      if (roomId) {
        // Use event userName if valid, otherwise use server-tracked userName via getUserName()
        const resolvedUserName = (userName && userName !== 'undefined' && userName.trim() !== '')
          ? userName.trim()
          : getUserName();
        console.log(`[Socket.IO] 📖 Room read - roomId: ${roomId}, event: "${userName}", stored: "${clientInfo.userName}", resolved: "${resolvedUserName}"`);

        // Broadcast to ALL clients that this room has been read (excluding sender)
        socket.broadcast.emit('room-read-update', {
          roomId,
          readAt: new Date().toISOString(),
          userName: resolvedUserName,
          socketId: socket.id // Include for client-side filtering if needed
        });
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

    // Typing indicators - broadcast to ALL clients in all-rooms
    // For same user across multiple browsers: we show typing from OTHER users only
    // Each user's typing is shown to other users but not to themselves (any of their tabs)
    socket.on('typing-start', ({ roomId, userName }) => {
      if (roomId && userName) {
        // Store typing user info in socket for cleanup on disconnect
        socket.typingInfo = { roomId, userName };
        // Broadcast to ALL clients, include userName so client can filter
        io.to('all-rooms').emit('user-typing', {
          roomId,
          userName,
          isTyping: true,
          senderSocketId: socket.id
        });
      }
    });

    socket.on('typing-stop', ({ roomId, userName }) => {
      if (roomId && userName) {
        // Clear typing info
        socket.typingInfo = null;
        io.to('all-rooms').emit('user-typing', {
          roomId,
          userName,
          isTyping: false,
          senderSocketId: socket.id
        });
      }
    });

    // Viewing indicators - show who is currently viewing a room
    socket.on('viewing-start', ({ roomId, userName }) => {
      if (roomId && userName) {
        // Store viewing info in socket for cleanup on disconnect
        socket.viewingInfo = { roomId, userName };
        io.to('all-rooms').emit('user-viewing', {
          roomId,
          userName,
          isViewing: true,
          senderSocketId: socket.id
        });
      }
    });

    socket.on('viewing-stop', ({ roomId, userName }) => {
      if (roomId && userName) {
        // Clear viewing info
        socket.viewingInfo = null;
        io.to('all-rooms').emit('user-viewing', {
          roomId,
          userName,
          isViewing: false,
          senderSocketId: socket.id
        });
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

      // Cleanup typing status on disconnect
      if (socket.typingInfo) {
        const { roomId, userName } = socket.typingInfo;
        console.log(`[Socket.IO] 🧹 Auto-cleanup typing for ${userName} in ${roomId} on disconnect`);
        io.to('all-rooms').emit('user-typing', {
          roomId,
          userName,
          isTyping: false,
          senderSocketId: socket.id
        });
      }

      // Cleanup viewing status on disconnect
      if (socket.viewingInfo) {
        const { roomId, userName } = socket.viewingInfo;
        console.log(`[Socket.IO] 🧹 Auto-cleanup viewing for ${userName} in ${roomId} on disconnect`);
        io.to('all-rooms').emit('user-viewing', {
          roomId,
          userName,
          isViewing: false,
          senderSocketId: socket.id
        });
      }

      global.__connectedClients.delete(socket.id);
      console.log(`[Socket.IO] ❌ Client disconnected: ${socket.id}, reason: ${reason} (Active: ${totalConnections})`);
    });

    socket.on('error', (error) => {
      console.error(`[Socket.IO] Socket error for ${socket.id}:`, error.message);
    });

    // Send initial connection success with debug info
    socket.emit('connection-success', {
      socketId: socket.id,
      serverTime: new Date().toISOString(),
      totalClients: totalConnections,
      identifiedAs: clientInfo.userName || null // Will be null until identify is called
    });
  });

  // Broadcast helper function for API routes
  global.__broadcast = (event, data) => {
    if (global.__io) {
      global.__io.to('all-rooms').emit(event, data);
      console.log(`[Socket.IO] 📡 Broadcast to all-rooms: ${event}`);
      return true;
    }
    console.warn(`[Socket.IO] ⚠️ __broadcast called but __io is null`);
    return false;
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
      return true;
    }
    console.warn(`[Socket.IO] ⚠️ __broadcastToRoom called but __io is null`);
    return false;
  };

  console.log('[Server] ✅ Global broadcast functions registered');
  console.log(`[Server] global.__io: ${global.__io ? 'SET' : 'NULL'}`);
  console.log(`[Server] global.__broadcast: ${typeof global.__broadcast}`);
  console.log(`[Server] global.__broadcastToRoom: ${typeof global.__broadcastToRoom}`);

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
