// Socket.IO Client Hook for React
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface ChatMessage {
  id: string;
  roomId: string;
  lineMessageId?: string;
  messageType: 'text' | 'image' | 'sticker' | 'video' | 'audio' | 'file' | 'location';
  content?: string;
  mediaUrl?: string;
  stickerId?: string;
  packageId?: string;
  sender: 'user' | 'agent' | 'system';
  senderName?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  replyToId?: string;
  createdAt: string;
}

interface ChatRoom {
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

interface UseSocketOptions {
  onNewMessage?: (message: ChatMessage) => void;
  onNewRoom?: (room: ChatRoom) => void;
  onMessagesRead?: (data: { roomId: string; messageIds: string[] }) => void;
  onUserTyping?: (data: { roomId: string; userName: string; isTyping: boolean }) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const optionsRef = useRef(options);
  
  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Initialize socket connection
  useEffect(() => {
    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      setIsConnected(true);
      setConnectionError(null);
      // Auto join all-rooms channel
      socket.emit('join-all-rooms');
      optionsRef.current.onConnect?.();
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
      optionsRef.current.onDisconnect?.();
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    // Chat events
    socket.on('new-message', (message: ChatMessage) => {
      console.log('[Socket] New message:', message.id);
      optionsRef.current.onNewMessage?.(message);
    });

    socket.on('new-room', (room: ChatRoom) => {
      console.log('[Socket] New room:', room.id);
      optionsRef.current.onNewRoom?.(room);
    });

    socket.on('messages-read', (data: { roomId: string; messageIds: string[] }) => {
      optionsRef.current.onMessagesRead?.(data);
    });

    socket.on('user-typing', (data: { roomId: string; userName: string; isTyping: boolean }) => {
      optionsRef.current.onUserTyping?.(data);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Join a specific room
  const joinRoom = useCallback((roomId: string) => {
    socketRef.current?.emit('join-room', roomId);
  }, []);

  // Leave a specific room
  const leaveRoom = useCallback((roomId: string) => {
    socketRef.current?.emit('leave-room', roomId);
  }, []);

  // Send typing indicator
  const sendTyping = useCallback((roomId: string, userName: string, isTyping: boolean) => {
    socketRef.current?.emit(isTyping ? 'typing-start' : 'typing-stop', { roomId, userName });
  }, []);

  // Mark messages as read
  const markAsRead = useCallback((roomId: string, messageIds: string[]) => {
    socketRef.current?.emit('message-read', { roomId, messageIds });
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    joinRoom,
    leaveRoom,
    sendTyping,
    markAsRead,
  };
}

export default useSocket;
