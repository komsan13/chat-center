// Socket.IO Client Hook for React with Stability and Notification Sound
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
  onConnectionChange?: (connected: boolean) => void;
  enableSound?: boolean;
}

// Connection state type
type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

// Simple beep sound generator using Web Audio API
function createBeepSound(audioContext: AudioContext) {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800Hz tone
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.3);
}

export function useSocket(options: UseSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const optionsRef = useRef(options);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const lastPongTime = useRef<number>(Date.now());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundEnabledRef = useRef(false);
  
  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Initialize audio for notification sound
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Try to create Audio element for MP3
      audioRef.current = new Audio('/notification.mp3');
      audioRef.current.volume = 0.7;
      audioRef.current.load();
      
      // Enable sound after any user interaction
      const enableSound = () => {
        soundEnabledRef.current = true;
        // Initialize AudioContext
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
        // Pre-play audio at 0 volume to unlock
        if (audioRef.current) {
          audioRef.current.volume = 0;
          audioRef.current.play().then(() => {
            audioRef.current!.pause();
            audioRef.current!.currentTime = 0;
            audioRef.current!.volume = 0.7;
          }).catch(() => {});
        }
      };
      
      document.addEventListener('click', enableSound, { once: true });
      document.addEventListener('keydown', enableSound, { once: true });
      document.addEventListener('touchstart', enableSound, { once: true });
      
      return () => {
        document.removeEventListener('click', enableSound);
        document.removeEventListener('keydown', enableSound);
        document.removeEventListener('touchstart', enableSound);
      };
    }
    return () => {
      audioRef.current = null;
    };
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (optionsRef.current.enableSound === false) return;
    
    // Try HTML5 Audio first
    if (audioRef.current && soundEnabledRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.log('[Socket] MP3 play failed, trying Web Audio:', err.message);
        // Fallback to Web Audio API beep
        if (audioContextRef.current) {
          createBeepSound(audioContextRef.current);
        }
      });
    } else if (audioContextRef.current) {
      // Use Web Audio API beep as fallback
      try {
        createBeepSound(audioContextRef.current);
      } catch (err) {
        console.log('[Socket] Web Audio failed:', err);
      }
    }
  }, []);

  // Start heartbeat to monitor connection
  const startHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
    }
    
    heartbeatInterval.current = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('ping-server');
        
        // Check if we haven't received pong in 30 seconds
        if (Date.now() - lastPongTime.current > 30000) {
          console.log('[Socket] No pong received, reconnecting...');
          socketRef.current.disconnect();
          socketRef.current.connect();
        }
      }
    }, 10000);
  }, []);

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
  }, []);

  // Initialize socket connection
  useEffect(() => {
    setConnectionState('connecting');
    
    const socketUrl = typeof window !== 'undefined' ? window.location.origin : '';
    
    const socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 45000,
      forceNew: false,
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] ✅ Connected:', socket.id);
      setIsConnected(true);
      setConnectionState('connected');
      setConnectionError(null);
      setReconnectAttempts(0);
      lastPongTime.current = Date.now();
      
      // Auto join all-rooms channel
      socket.emit('join-all-rooms');
      
      // Start heartbeat
      startHeartbeat();
      
      optionsRef.current.onConnect?.();
      optionsRef.current.onConnectionChange?.(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] ❌ Disconnected:', reason);
      setIsConnected(false);
      setConnectionState('disconnected');
      stopHeartbeat();
      
      optionsRef.current.onDisconnect?.();
      optionsRef.current.onConnectionChange?.(false);
      
      // Auto reconnect for certain disconnect reasons
      if (reason === 'io server disconnect' || reason === 'transport close') {
        setTimeout(() => {
          socket.connect();
        }, 1000);
      }
    });

    socket.on('reconnect_attempt', (attempt) => {
      console.log('[Socket] 🔄 Reconnecting... attempt:', attempt);
      setConnectionState('reconnecting');
      setReconnectAttempts(attempt);
    });

    socket.on('reconnect', (attempt) => {
      console.log('[Socket] ✅ Reconnected after', attempt, 'attempts');
      setConnectionState('connected');
      setReconnectAttempts(0);
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    // Pong from server
    socket.on('pong-server', () => {
      lastPongTime.current = Date.now();
    });

    // Connection success from server
    socket.on('connection-success', (data) => {
      console.log('[Socket] Server confirmed connection:', data);
    });

    // Chat events
    socket.on('new-message', (message: ChatMessage) => {
      console.log('[Socket] 📨 New message:', message.id);
      
      // Play notification sound for incoming messages from LINE users
      if (message.sender === 'user') {
        playNotificationSound();
      }
      
      optionsRef.current.onNewMessage?.(message);
    });

    socket.on('new-room', (room: ChatRoom) => {
      console.log('[Socket] 🆕 New room:', room.id);
      playNotificationSound();
      optionsRef.current.onNewRoom?.(room);
    });

    socket.on('messages-read', (data: { roomId: string; messageIds: string[] }) => {
      console.log('[Socket] ✓ Messages read:', data.roomId);
      optionsRef.current.onMessagesRead?.(data);
    });

    socket.on('user-typing', (data: { roomId: string; userName: string; isTyping: boolean }) => {
      optionsRef.current.onUserTyping?.(data);
    });

    // Visibility change handler - reconnect when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !socket.connected) {
        console.log('[Socket] Page visible, reconnecting...');
        socket.connect();
      }
    };

    // Online/offline handlers
    const handleOnline = () => {
      console.log('[Socket] Network online, reconnecting...');
      if (!socket.connected) {
        socket.connect();
      }
    };

    const handleOffline = () => {
      console.log('[Socket] Network offline');
      setConnectionState('disconnected');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      stopHeartbeat();
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [startHeartbeat, stopHeartbeat, playNotificationSound]);

  // Join a specific room
  const joinRoom = useCallback((roomId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join-room', roomId);
    }
  }, []);

  // Leave a specific room
  const leaveRoom = useCallback((roomId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave-room', roomId);
    }
  }, []);

  // Send typing indicator
  const sendTyping = useCallback((roomId: string, userName: string, isTyping: boolean) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(isTyping ? 'typing-start' : 'typing-stop', { roomId, userName });
    }
  }, []);

  // Mark messages as read
  const markAsRead = useCallback((roomId: string, messageIds: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('message-read', { roomId, messageIds });
    }
  }, []);

  // Manual reconnect
  const reconnect = useCallback(() => {
    if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect();
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    connectionState,
    connectionError,
    reconnectAttempts,
    joinRoom,
    leaveRoom,
    sendTyping,
    markAsRead,
    reconnect,
    playNotificationSound,
  };
}

export default useSocket;
