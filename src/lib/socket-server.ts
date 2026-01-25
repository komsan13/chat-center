// Socket.IO Server for LINE Chat Real-time Communication
import { Server as SocketServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketServer | null = null;

export interface ChatMessage {
  id: string;
  roomId: string;
  lineMessageId?: string;
  messageType: 'text' | 'image' | 'sticker' | 'video' | 'audio' | 'file' | 'location';
  content?: string;
  mediaUrl?: string;
  stickerId?: string;
  packageId?: string;
  sender: 'user' | 'agent';
  senderName?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  replyToId?: string;
  createdAt: string;
}

export interface ChatRoom {
  id: string;
  lineUserId: string;
  lineTokenId?: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  lastMessage?: ChatMessage;
  lastMessageAt?: string;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  tags: string[];
  status: 'active' | 'archived' | 'blocked';
  createdAt: string;
  updatedAt: string;
}

export function initSocketServer(httpServer: HTTPServer) {
  if (io) return io;

  io = new SocketServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    path: '/api/socket',
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join chat room
    socket.on('join-room', (roomId: string) => {
      socket.join(roomId);
      console.log(`[Socket.IO] Client ${socket.id} joined room: ${roomId}`);
    });

    // Leave chat room
    socket.on('leave-room', (roomId: string) => {
      socket.leave(roomId);
      console.log(`[Socket.IO] Client ${socket.id} left room: ${roomId}`);
    });

    // Join all rooms (for dashboard view)
    socket.on('join-all-rooms', () => {
      socket.join('all-rooms');
      console.log(`[Socket.IO] Client ${socket.id} joined all-rooms channel`);
    });

    // Message read status
    socket.on('message-read', ({ roomId, messageIds }: { roomId: string; messageIds: string[] }) => {
      socket.to(roomId).emit('messages-read', { roomId, messageIds });
    });

    // Typing indicator
    socket.on('typing-start', ({ roomId, userName }: { roomId: string; userName: string }) => {
      socket.to(roomId).emit('user-typing', { roomId, userName, isTyping: true });
    });

    socket.on('typing-stop', ({ roomId, userName }: { roomId: string; userName: string }) => {
      socket.to(roomId).emit('user-typing', { roomId, userName, isTyping: false });
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    socket.on('error', (error) => {
      console.error(`[Socket.IO] Error: ${error}`);
    });
  });

  console.log('[Socket.IO] Server initialized');
  return io;
}

export function getSocketServer(): SocketServer | null {
  return io;
}

// Emit new message to all connected clients
export function emitNewMessage(message: ChatMessage) {
  if (!io) {
    console.warn('[Socket.IO] Server not initialized');
    return;
  }
  
  // Emit to specific room
  io.to(message.roomId).emit('new-message', message);
  // Emit to dashboard (all-rooms channel)
  io.to('all-rooms').emit('new-message', message);
  
  console.log(`[Socket.IO] Emitted new message to room ${message.roomId}`);
}

// Emit room update
export function emitRoomUpdate(room: ChatRoom) {
  if (!io) return;
  
  io.to('all-rooms').emit('room-update', room);
  console.log(`[Socket.IO] Emitted room update for ${room.id}`);
}

// Emit message status update
export function emitMessageStatus(roomId: string, messageId: string, status: string) {
  if (!io) return;
  
  io.to(roomId).emit('message-status', { messageId, status });
}
