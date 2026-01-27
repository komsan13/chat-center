// ═══════════════════════════════════════════════════════════════════════════════
// ULTRA-STABLE SOCKET.IO CLIENT - BACKGROUND TAB RESISTANT
// ═══════════════════════════════════════════════════════════════════════════════
// Key Features:
// 1. Uses Socket.IO's built-in ping/pong (not throttled by Chrome)
// 2. Web Worker for background heartbeat (immune to tab throttling)
// 3. Aggressive reconnection on visibility change
// 4. Multiple fallback mechanisms
// ═══════════════════════════════════════════════════════════════════════════════

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

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
  status: 'active' | 'archived' | 'blocked' | 'spam';
  createdAt: string;
  updatedAt: string;
}

interface RoomUpdate {
  id: string;
  lastMessage?: ChatMessage;
  lastMessageAt?: string;
  unreadCount?: number;
}

interface RoomPropertyUpdate {
  isPinned?: boolean;
  isMuted?: boolean;
  tags?: string[];
  status?: 'active' | 'archived' | 'blocked' | 'spam';
}

interface UseSocketOptions {
  onNewMessage?: (message: ChatMessage) => void;
  onNewRoom?: (room: ChatRoom) => void;
  onRoomUpdate?: (data: RoomUpdate) => void;
  onMessagesRead?: (data: { roomId: string; messageIds: string[] }) => void;
  onUserTyping?: (data: { roomId: string; userName: string; isTyping: boolean }) => void;
  onRoomReadUpdate?: (data: { roomId: string; readAt: string }) => void;
  onRoomPropertyChanged?: (data: { roomId: string; updates: RoomPropertyUpdate; updatedAt: string }) => void;
  onRoomDeleted?: (data: { roomId: string; deletedAt: string }) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onConnectionChange?: (connected: boolean) => void;
  onConnectionQualityChange?: (quality: ConnectionQuality) => void;
  enableSound?: boolean;
  currentRoomId?: string | null;
  // Note: selectedTokenIds and roomsRef removed - filtering done at page level
}

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'suspended';
type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

interface ConnectionHealth {
  latency: number;
  quality: ConnectionQuality;
  lastPingTime: number;
  consecutiveFailures: number;
  isStable: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getConnectionQuality(latency: number): ConnectionQuality {
  if (latency < 50) return 'excellent';
  if (latency < 150) return 'good';
  if (latency < 300) return 'fair';
  if (latency < 500) return 'poor';
  return 'offline';
}

function createNotificationSound(audioContext: AudioContext) {
  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.warn('[Socket] Audio error:', e);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useSocket(options: UseSocketOptions = {}) {
  // State
  const socketRef = useRef<Socket | null>(null);
  const socketIdRef = useRef<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth>({
    latency: 0,
    quality: 'offline',
    lastPingTime: 0,
    consecutiveFailures: 0,
    isStable: false,
  });

  // Refs
  const optionsRef = useRef(options);
  const workerRef = useRef<Worker | null>(null);
  const lastPongTimeRef = useRef<number>(Date.now());
  const pingStartTimeRef = useRef<number>(0);
  const latencyHistoryRef = useRef<number[]>([]);
  const reconnectAttemptsRef = useRef<number>(0);
  const isPageVisibleRef = useRef<boolean>(true);
  const isOnlineRef = useRef<boolean>(true);
  
  // Audio refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundUnlockedRef = useRef(false);

  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIO SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    audioRef.current = new Audio('/notification.mp3');
    audioRef.current.volume = 0.7;
    audioRef.current.preload = 'auto';
    
    const unlockAudio = () => {
      soundUnlockedRef.current = true;
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || 
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      if (audioRef.current) {
        audioRef.current.volume = 0;
        audioRef.current.play().then(() => {
          audioRef.current!.pause();
          audioRef.current!.currentTime = 0;
          audioRef.current!.volume = 0.7;
        }).catch(() => {});
      }
    };
    
    ['click', 'keydown', 'touchstart', 'mousedown'].forEach(event => {
      document.addEventListener(event, unlockAudio, { once: true, passive: true });
    });
    
    return () => {
      ['click', 'keydown', 'touchstart', 'mousedown'].forEach(event => {
        document.removeEventListener(event, unlockAudio);
      });
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    if (optionsRef.current.enableSound === false) return;
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    if (audioRef.current && soundUnlockedRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        if (audioContextRef.current) createNotificationSound(audioContextRef.current);
      });
    } else if (audioContextRef.current) {
      createNotificationSound(audioContextRef.current);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // CONNECTION HEALTH
  // ═══════════════════════════════════════════════════════════════════════════

  const updateConnectionHealth = useCallback((latency: number) => {
    latencyHistoryRef.current.push(latency);
    if (latencyHistoryRef.current.length > 10) latencyHistoryRef.current.shift();
    
    const avgLatency = latencyHistoryRef.current.reduce((a, b) => a + b, 0) / latencyHistoryRef.current.length;
    const quality = getConnectionQuality(avgLatency);
    
    setConnectionHealth({
      latency: Math.round(avgLatency),
      quality,
      lastPingTime: Date.now(),
      consecutiveFailures: 0,
      isStable: true,
    });
    optionsRef.current.onConnectionQualityChange?.(quality);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // WEB WORKER FOR BACKGROUND HEARTBEAT
  // ═══════════════════════════════════════════════════════════════════════════

  const initWorker = useCallback(() => {
    if (typeof window === 'undefined' || workerRef.current) return;
    
    try {
      workerRef.current = new Worker('/socket-worker.js');
      
      workerRef.current.onmessage = (e) => {
        if (e.data.type === 'ping' && socketRef.current?.connected) {
          pingStartTimeRef.current = Date.now();
          socketRef.current.emit('ping-server');
        }
      };
      
      workerRef.current.onerror = (err) => {
        console.error('[Socket] Worker error:', err);
      };
      
      console.log('[Socket] 🔧 Web Worker initialized');
    } catch (err) {
      console.warn('[Socket] Web Worker not available:', err);
    }
  }, []);

  const startWorkerHeartbeat = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'start', data: { interval: 3000 } });
    }
  }, []);

  const stopWorkerHeartbeat = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'stop' });
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN SOCKET INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    setConnectionState('connecting');
    initWorker();
    
    const socketUrl = window.location.origin;
    
    // Initialize socket with AGGRESSIVE keep-alive settings
    const socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      // Let Socket.IO handle reconnection
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      // Very aggressive timeout/ping settings
      timeout: 10000,
      // These are critical for background tabs
      forceNew: false,
      autoConnect: true,
    });

    socketRef.current = socket;

    // ═══════════════════════════════════════════════════════════════════════
    // CONNECTION EVENTS
    // ═══════════════════════════════════════════════════════════════════════

    socket.on('connect', () => {
      console.log(`[Socket] ✅ Connected: ${socket.id}`);
      socketIdRef.current = socket.id || null;
      setIsConnected(true);
      setConnectionState('connected');
      setConnectionError(null);
      reconnectAttemptsRef.current = 0;
      setReconnectAttempts(0);
      lastPongTimeRef.current = Date.now();
      latencyHistoryRef.current = [];
      
      socket.emit('join-all-rooms');
      startWorkerHeartbeat();
      
      optionsRef.current.onConnect?.();
      optionsRef.current.onConnectionChange?.(true);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] ❌ Disconnected: ${reason}`);
      setIsConnected(false);
      setConnectionState('disconnected');
      stopWorkerHeartbeat();
      
      optionsRef.current.onDisconnect?.();
      optionsRef.current.onConnectionChange?.(false);
      
      // Force reconnect immediately for certain reasons
      if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'transport error') {
        console.log('[Socket] 🔄 Force reconnecting...');
        setTimeout(() => socket.connect(), 100);
      }
    });

    socket.on('reconnect_attempt', (attempt) => {
      console.log(`[Socket] 🔄 Reconnecting... attempt ${attempt}`);
      setConnectionState('reconnecting');
      reconnectAttemptsRef.current = attempt;
      setReconnectAttempts(attempt);
    });

    socket.on('reconnect', () => {
      console.log('[Socket] ✅ Reconnected');
      setConnectionState('connected');
      reconnectAttemptsRef.current = 0;
      setReconnectAttempts(0);
      socket.emit('join-all-rooms');
      startWorkerHeartbeat();
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      setConnectionError(error.message);
    });

    // Pong from server
    socket.on('pong-server', () => {
      const latency = Date.now() - pingStartTimeRef.current;
      lastPongTimeRef.current = Date.now();
      updateConnectionHealth(latency);
    });

    socket.on('connection-success', (data) => {
      console.log('[Socket] Server confirmed:', data);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // CHAT EVENTS - Always pass data to callbacks, let page handle filtering
    // ═══════════════════════════════════════════════════════════════════════

    socket.on('new-message', (message: ChatMessage) => {
      console.log(`[Socket] 📨 New message: ${message.id}`);
      // Always call the callback - let the page decide what to do
      // This ensures all messages are recorded regardless of channel selection
      optionsRef.current.onNewMessage?.(message);
    });

    socket.on('new-room', (room: ChatRoom) => {
      console.log(`[Socket] 🆕 New room: ${room.id}`);
      // Always call the callback - let the page decide what to do
      // This ensures all rooms are recorded regardless of channel selection
      optionsRef.current.onNewRoom?.(room);
    });

    socket.on('room-update', (data: RoomUpdate) => {
      optionsRef.current.onRoomUpdate?.(data);
    });

    socket.on('messages-read', (data: { roomId: string; messageIds: string[] }) => {
      optionsRef.current.onMessagesRead?.(data);
    });

    socket.on('user-typing', (data: { roomId: string; userName: string; isTyping: boolean; senderSocketId?: string }) => {
      // Filter out typing events from this same socket (same browser tab)
      // But allow events from same user on different browser tabs
      if (data.senderSocketId && data.senderSocketId === socketIdRef.current) {
        return; // Ignore typing event from self
      }
      optionsRef.current.onUserTyping?.(data);
    });

    socket.on('room-read-update', (data: { roomId: string; readAt: string }) => {
      optionsRef.current.onRoomReadUpdate?.(data);
    });

    socket.on('room-property-changed', (data: { roomId: string; updates: RoomPropertyUpdate; updatedAt: string }) => {
      console.log('[Socket] 📥 Received room-property-changed:', data);
      optionsRef.current.onRoomPropertyChanged?.(data);
    });

    socket.on('room-removed', (data: { roomId: string; deletedAt: string }) => {
      optionsRef.current.onRoomDeleted?.(data);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // VISIBILITY & NETWORK HANDLERS
    // ═══════════════════════════════════════════════════════════════════════

    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      isPageVisibleRef.current = isVisible;
      
      if (isVisible) {
        console.log('[Socket] 👁️ Tab visible - checking connection');
        
        // Resume audio context
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume();
        }
        
        // AGGRESSIVE reconnect check when tab becomes visible
        if (!socket.connected) {
          console.log('[Socket] 🔄 Tab visible but disconnected - reconnecting NOW');
          socket.connect();
        } else {
          // Verify connection is alive
          pingStartTimeRef.current = Date.now();
          socket.emit('ping-server');
        }
        
        setConnectionState(socket.connected ? 'connected' : 'reconnecting');
      } else {
        console.log('[Socket] 🙈 Tab hidden');
        // Don't set suspended - let socket handle it
      }
    };

    const handleOnline = () => {
      console.log('[Socket] 🌐 Network online');
      isOnlineRef.current = true;
      if (!socket.connected) {
        socket.connect();
      }
    };

    const handleOffline = () => {
      console.log('[Socket] 📴 Network offline');
      isOnlineRef.current = false;
      setConnectionHealth(prev => ({ ...prev, quality: 'offline' }));
    };

    const handleFocus = () => {
      console.log('[Socket] 👁️ Window focused');
      if (!socket.connected && isOnlineRef.current) {
        socket.connect();
      }
    };

    // Register event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleFocus);

    // ═══════════════════════════════════════════════════════════════════════
    // CLEANUP
    // ═══════════════════════════════════════════════════════════════════════

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleFocus);
      
      stopWorkerHeartbeat();
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [initWorker, startWorkerHeartbeat, stopWorkerHeartbeat, updateConnectionHealth, playNotificationSound]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SOCKET ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const joinRoom = useCallback((roomId: string) => {
    socketRef.current?.emit('join-room', roomId);
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    socketRef.current?.emit('leave-room', roomId);
  }, []);

  const sendTyping = useCallback((roomId: string, userName: string, isTyping: boolean) => {
    socketRef.current?.emit(isTyping ? 'typing-start' : 'typing-stop', { roomId, userName });
  }, []);

  const markAsRead = useCallback((roomId: string, messageIds: string[]) => {
    socketRef.current?.emit('message-read', { roomId, messageIds });
  }, []);

  const emitRoomRead = useCallback((roomId: string) => {
    socketRef.current?.emit('room-read', { roomId });
  }, []);

  const emitRoomPropertyUpdate = useCallback((roomId: string, updates: RoomPropertyUpdate) => {
    console.log('[Socket] 📤 Emitting room-property-update:', roomId, updates, 'socket connected:', socketRef.current?.connected);
    socketRef.current?.emit('room-property-update', { roomId, updates });
  }, []);

  const emitRoomDeleted = useCallback((roomId: string) => {
    socketRef.current?.emit('room-deleted', { roomId });
  }, []);

  const reconnect = useCallback(() => {
    if (socketRef.current && !socketRef.current.connected) {
      reconnectAttemptsRef.current = 0;
      setReconnectAttempts(0);
      socketRef.current.connect();
    }
  }, []);

  const forceReconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      setTimeout(() => {
        reconnectAttemptsRef.current = 0;
        setReconnectAttempts(0);
        socketRef.current?.connect();
      }, 100);
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    connectionState,
    connectionError,
    reconnectAttempts,
    connectionHealth,
    joinRoom,
    leaveRoom,
    sendTyping,
    markAsRead,
    emitRoomRead,
    emitRoomPropertyUpdate,
    emitRoomDeleted,
    reconnect,
    forceReconnect,
    playNotificationSound,
  };
}

export default useSocket;
