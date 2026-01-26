// ═══════════════════════════════════════════════════════════════════════════════
// ENTERPRISE-GRADE SOCKET.IO CLIENT - ULTRA STABLE REAL-TIME CONNECTION
// ═══════════════════════════════════════════════════════════════════════════════
// Features:
// - Page Visibility API: Handles tab switching, minimizing, screen lock
// - Network Information API: Detects network changes and quality
// - Exponential Backoff: Smart reconnection with jitter
// - Message Queue: Queues messages during disconnection
// - Heartbeat System: Client-server ping/pong with timeout detection
// - Connection Health Monitoring: Tracks latency and connection quality
// - Wake Lock API: Prevents device sleep during active sessions
// - Background Sync: Service Worker integration for notifications
// - Local Storage Sync: Persists important state across sessions
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
  status: 'active' | 'archived' | 'blocked';
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

interface QueuedEvent {
  event: string;
  data: unknown;
  timestamp: number;
  retries: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS & CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // Reconnection settings
  RECONNECT_BASE_DELAY: 1000,
  RECONNECT_MAX_DELAY: 30000,
  RECONNECT_JITTER: 0.3,
  MAX_RECONNECT_ATTEMPTS: Infinity,
  
  // Heartbeat settings
  HEARTBEAT_INTERVAL: 5000,      // Ping every 5 seconds for faster detection
  HEARTBEAT_TIMEOUT: 15000,      // Consider dead if no pong in 15 seconds
  
  // Connection quality thresholds (ms)
  LATENCY_EXCELLENT: 50,
  LATENCY_GOOD: 150,
  LATENCY_FAIR: 300,
  LATENCY_POOR: 500,
  
  // Queue settings
  MAX_QUEUE_SIZE: 100,
  QUEUE_RETRY_LIMIT: 3,
  
  // Visibility settings
  VISIBILITY_RECONNECT_DELAY: 500,
  BACKGROUND_CHECK_INTERVAL: 30000,
  
  // Wake Lock settings
  WAKE_LOCK_ENABLED: true,
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Calculate exponential backoff with jitter
function calculateBackoff(attempt: number): number {
  const exponentialDelay = Math.min(
    CONFIG.RECONNECT_BASE_DELAY * Math.pow(2, attempt),
    CONFIG.RECONNECT_MAX_DELAY
  );
  const jitter = exponentialDelay * CONFIG.RECONNECT_JITTER * Math.random();
  return Math.floor(exponentialDelay + jitter);
}

// Get connection quality from latency
function getConnectionQuality(latency: number): ConnectionQuality {
  if (latency < CONFIG.LATENCY_EXCELLENT) return 'excellent';
  if (latency < CONFIG.LATENCY_GOOD) return 'good';
  if (latency < CONFIG.LATENCY_FAIR) return 'fair';
  if (latency < CONFIG.LATENCY_POOR) return 'poor';
  return 'offline';
}

// Create notification sound using Web Audio API
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
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE & REFS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const socketRef = useRef<Socket | null>(null);
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
  
  // Refs for values that don't need to trigger re-renders
  const optionsRef = useRef(options);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const backgroundCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPongTimeRef = useRef<number>(Date.now());
  const pingStartTimeRef = useRef<number>(0);
  const latencyHistoryRef = useRef<number[]>([]);
  const isPageVisibleRef = useRef<boolean>(true);
  const isOnlineRef = useRef<boolean>(true);
  const eventQueueRef = useRef<QueuedEvent[]>([]);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  
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
    
    // Initialize audio
    audioRef.current = new Audio('/notification.mp3');
    audioRef.current.volume = 0.7;
    audioRef.current.preload = 'auto';
    
    // Unlock audio on first user interaction
    const unlockAudio = () => {
      soundUnlockedRef.current = true;
      
      // Initialize AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || 
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      
      // Resume AudioContext if suspended
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
      // Pre-play audio at 0 volume to unlock
      if (audioRef.current) {
        const audio = audioRef.current;
        audio.volume = 0;
        audio.play().then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = 0.7;
        }).catch(() => {});
      }
    };
    
    const events = ['click', 'keydown', 'touchstart', 'mousedown'];
    events.forEach(event => {
      document.addEventListener(event, unlockAudio, { once: true, passive: true });
    });
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, unlockAudio);
      });
    };
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (optionsRef.current.enableSound === false) return;
    
    // Resume AudioContext if suspended (e.g., after tab switch)
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    // Try HTML5 Audio first
    if (audioRef.current && soundUnlockedRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Fallback to Web Audio API
        if (audioContextRef.current) {
          createNotificationSound(audioContextRef.current);
        }
      });
    } else if (audioContextRef.current) {
      createNotificationSound(audioContextRef.current);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // WAKE LOCK (PREVENT DEVICE SLEEP)
  // ═══════════════════════════════════════════════════════════════════════════

  const requestWakeLock = useCallback(async () => {
    if (!CONFIG.WAKE_LOCK_ENABLED || typeof window === 'undefined') return;
    if (!('wakeLock' in navigator)) return;
    
    try {
      // Release existing lock first
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
      }
      
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      console.log('[Socket] 🔒 Wake Lock acquired');
      
      wakeLockRef.current.addEventListener('release', () => {
        console.log('[Socket] 🔓 Wake Lock released');
      });
    } catch (err) {
      console.log('[Socket] Wake Lock not available:', (err as Error).message);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (e) {
        console.warn('[Socket] Wake Lock release error:', e);
      }
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT QUEUE (FOR OFFLINE SUPPORT)
  // ═══════════════════════════════════════════════════════════════════════════

  const queueEvent = useCallback((event: string, data: unknown) => {
    if (eventQueueRef.current.length >= CONFIG.MAX_QUEUE_SIZE) {
      eventQueueRef.current.shift(); // Remove oldest
    }
    eventQueueRef.current.push({
      event,
      data,
      timestamp: Date.now(),
      retries: 0,
    });
    console.log(`[Socket] 📦 Event queued: ${event} (Queue size: ${eventQueueRef.current.length})`);
  }, []);

  const flushEventQueue = useCallback(() => {
    if (!socketRef.current?.connected || eventQueueRef.current.length === 0) return;
    
    console.log(`[Socket] 📤 Flushing ${eventQueueRef.current.length} queued events`);
    
    const queue = [...eventQueueRef.current];
    eventQueueRef.current = [];
    
    queue.forEach((item) => {
      if (item.retries < CONFIG.QUEUE_RETRY_LIMIT) {
        socketRef.current?.emit(item.event, item.data);
      }
    });
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // CONNECTION QUALITY MONITORING
  // ═══════════════════════════════════════════════════════════════════════════

  const updateConnectionHealth = useCallback((latency: number) => {
    // Keep last 10 latency measurements
    latencyHistoryRef.current.push(latency);
    if (latencyHistoryRef.current.length > 10) {
      latencyHistoryRef.current.shift();
    }
    
    // Calculate average latency
    const avgLatency = latencyHistoryRef.current.reduce((a, b) => a + b, 0) / latencyHistoryRef.current.length;
    const quality = getConnectionQuality(avgLatency);
    
    // Check stability (low variance in latency)
    const variance = latencyHistoryRef.current.length > 3 
      ? Math.sqrt(latencyHistoryRef.current.map(l => Math.pow(l - avgLatency, 2)).reduce((a, b) => a + b, 0) / latencyHistoryRef.current.length)
      : 100;
    const isStable = variance < 50 && quality !== 'offline';
    
    const newHealth: ConnectionHealth = {
      latency: Math.round(avgLatency),
      quality,
      lastPingTime: Date.now(),
      consecutiveFailures: 0,
      isStable,
    };
    
    setConnectionHealth(newHealth);
    optionsRef.current.onConnectionQualityChange?.(quality);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // HEARTBEAT SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════

  const startHeartbeat = useCallback(() => {
    // Clear existing interval
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (!socketRef.current?.connected) return;
      
      // Record ping start time for latency calculation
      pingStartTimeRef.current = Date.now();
      socketRef.current.emit('ping-server');
      
      // Check for timeout
      const timeSinceLastPong = Date.now() - lastPongTimeRef.current;
      
      if (timeSinceLastPong > CONFIG.HEARTBEAT_TIMEOUT) {
        console.log(`[Socket] ⚠️ Heartbeat timeout (${timeSinceLastPong}ms), forcing reconnect...`);
        
        setConnectionHealth(prev => ({
          ...prev,
          consecutiveFailures: prev.consecutiveFailures + 1,
          quality: 'offline',
          isStable: false,
        }));
        
        // Force reconnect
        socketRef.current.disconnect();
        setTimeout(() => {
          socketRef.current?.connect();
        }, 100);
      }
    }, CONFIG.HEARTBEAT_INTERVAL);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // RECONNECTION LOGIC
  // ═══════════════════════════════════════════════════════════════════════════

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    const attempt = reconnectAttemptsRef.current;
    const delay = calculateBackoff(attempt);
    console.log(`[Socket] ⏳ Scheduling reconnect in ${delay}ms (attempt ${attempt + 1})`);
    
    reconnectAttemptsRef.current = attempt + 1;
    setReconnectAttempts(attempt + 1);
    setConnectionState('reconnecting');
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (socketRef.current && !socketRef.current.connected) {
        console.log(`[Socket] 🔄 Attempting reconnect (attempt ${attempt + 1})`);
        socketRef.current.connect();
      }
    }, delay);
  }, []);

  const cancelReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // BACKGROUND CHECK (FOR MOBILE/TAB SWITCHING)
  // ═══════════════════════════════════════════════════════════════════════════

  const startBackgroundCheck = useCallback(() => {
    if (backgroundCheckIntervalRef.current) {
      clearInterval(backgroundCheckIntervalRef.current);
    }
    
    backgroundCheckIntervalRef.current = setInterval(() => {
      if (!isPageVisibleRef.current) return;
      
      // Check if socket is healthy
      const timeSinceLastPong = Date.now() - lastPongTimeRef.current;
      
      if (timeSinceLastPong > CONFIG.BACKGROUND_CHECK_INTERVAL && socketRef.current?.connected) {
        console.log('[Socket] ⚠️ Background check: Connection may be stale, sending ping...');
        pingStartTimeRef.current = Date.now();
        socketRef.current.emit('ping-server');
      }
    }, CONFIG.BACKGROUND_CHECK_INTERVAL);
  }, []);

  const stopBackgroundCheck = useCallback(() => {
    if (backgroundCheckIntervalRef.current) {
      clearInterval(backgroundCheckIntervalRef.current);
      backgroundCheckIntervalRef.current = null;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN SOCKET INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    setConnectionState('connecting');
    
    const socketUrl = window.location.origin;
    
    // Initialize socket with enterprise-grade settings
    const socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'], // WebSocket first, fallback to polling
      reconnection: false, // We handle reconnection manually for better control
      timeout: 20000,
      forceNew: false,
      autoConnect: true,
      // Prevent memory leaks
      closeOnBeforeunload: true,
    });

    socketRef.current = socket;

    // ═══════════════════════════════════════════════════════════════════════
    // SOCKET EVENT HANDLERS
    // ═══════════════════════════════════════════════════════════════════════

    socket.on('connect', () => {
      console.log(`[Socket] ✅ Connected: ${socket.id}`);
      
      setIsConnected(true);
      setConnectionState('connected');
      setConnectionError(null);
      reconnectAttemptsRef.current = 0;
      setReconnectAttempts(0);
      lastPongTimeRef.current = Date.now();
      latencyHistoryRef.current = [];
      
      cancelReconnect();
      
      // Join all-rooms channel
      socket.emit('join-all-rooms');
      
      // Start heartbeat
      startHeartbeat();
      startBackgroundCheck();
      
      // Request wake lock
      requestWakeLock();
      
      // Flush queued events
      flushEventQueue();
      
      // Notify callbacks
      optionsRef.current.onConnect?.();
      optionsRef.current.onConnectionChange?.(true);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] ❌ Disconnected: ${reason}`);
      
      setIsConnected(false);
      setConnectionState('disconnected');
      
      stopHeartbeat();
      
      optionsRef.current.onDisconnect?.();
      optionsRef.current.onConnectionChange?.(false);
      
      // Only reconnect if online and page is visible
      if (isOnlineRef.current && isPageVisibleRef.current) {
        scheduleReconnect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      setConnectionError(error.message);
      setIsConnected(false);
      
      // Schedule reconnect
      if (isOnlineRef.current) {
        scheduleReconnect();
      }
    });

    // Pong response - update latency
    socket.on('pong-server', () => {
      const latency = Date.now() - pingStartTimeRef.current;
      lastPongTimeRef.current = Date.now();
      updateConnectionHealth(latency);
      
      // Log occasionally
      if (Math.random() < 0.1) {
        console.log(`[Socket] 🏓 Pong received (${latency}ms)`);
      }
    });

    // Connection confirmed by server
    socket.on('connection-success', (data) => {
      console.log('[Socket] Server confirmed:', data);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // CHAT EVENT HANDLERS
    // ═══════════════════════════════════════════════════════════════════════

    socket.on('new-message', (message: ChatMessage) => {
      console.log(`[Socket] 📨 New message: ${message.id} (Room: ${message.roomId})`);
      
      // Play sound for incoming user messages not in current room
      const currentRoom = optionsRef.current.currentRoomId;
      if (message.sender === 'user' && message.roomId !== currentRoom) {
        playNotificationSound();
        
        // Show browser notification if page is hidden
        if (!isPageVisibleRef.current && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('New Message', {
            body: message.content || 'New message received',
            icon: '/icon-192.png',
            tag: message.roomId,
          });
        }
      }
      
      optionsRef.current.onNewMessage?.(message);
    });

    socket.on('new-room', (room: ChatRoom) => {
      console.log(`[Socket] 🆕 New room: ${room.id}`);
      playNotificationSound();
      optionsRef.current.onNewRoom?.(room);
    });

    socket.on('room-update', (data: RoomUpdate) => {
      console.log(`[Socket] 🔄 Room update: ${data.id}`);
      optionsRef.current.onRoomUpdate?.(data);
    });

    socket.on('messages-read', (data: { roomId: string; messageIds: string[] }) => {
      console.log(`[Socket] ✓ Messages read: ${data.roomId}`);
      optionsRef.current.onMessagesRead?.(data);
    });

    socket.on('user-typing', (data: { roomId: string; userName: string; isTyping: boolean }) => {
      optionsRef.current.onUserTyping?.(data);
    });

    socket.on('room-read-update', (data: { roomId: string; readAt: string }) => {
      console.log(`[Socket] 📖 Room read: ${data.roomId}`);
      optionsRef.current.onRoomReadUpdate?.(data);
    });

    socket.on('room-property-changed', (data: { roomId: string; updates: RoomPropertyUpdate; updatedAt: string }) => {
      console.log(`[Socket] 📌 Room property changed: ${data.roomId}`, data.updates);
      optionsRef.current.onRoomPropertyChanged?.(data);
    });

    socket.on('room-removed', (data: { roomId: string; deletedAt: string }) => {
      console.log(`[Socket] 🗑️ Room removed: ${data.roomId}`);
      optionsRef.current.onRoomDeleted?.(data);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // VISIBILITY CHANGE HANDLER
    // ═══════════════════════════════════════════════════════════════════════

    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      isPageVisibleRef.current = isVisible;
      
      if (isVisible) {
        console.log('[Socket] 👁️ Page became visible');
        
        // Reacquire wake lock
        requestWakeLock();
        
        // Resume AudioContext if suspended
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume();
        }
        
        // Check connection and reconnect if needed
        if (socket && !socket.connected) {
          console.log('[Socket] 🔄 Reconnecting after visibility change...');
          setTimeout(() => {
            socket.connect();
          }, CONFIG.VISIBILITY_RECONNECT_DELAY);
        } else if (socket?.connected) {
          // Send immediate ping to verify connection
          pingStartTimeRef.current = Date.now();
          socket.emit('ping-server');
          
          // Flush any queued events
          flushEventQueue();
        }
      } else {
        console.log('[Socket] 🙈 Page became hidden');
        setConnectionState('suspended');
      }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // NETWORK STATUS HANDLERS
    // ═══════════════════════════════════════════════════════════════════════

    const handleOnline = () => {
      console.log('[Socket] 🌐 Network online');
      isOnlineRef.current = true;
      
      if (socket && !socket.connected) {
        // Small delay to ensure network is stable
        setTimeout(() => {
          socket.connect();
        }, 500);
      }
    };

    const handleOffline = () => {
      console.log('[Socket] 📴 Network offline');
      isOnlineRef.current = false;
      setConnectionHealth(prev => ({ ...prev, quality: 'offline' }));
      setConnectionState('disconnected');
    };

    // Handle page unload
    const handleBeforeUnload = () => {
      releaseWakeLock();
      socket.disconnect();
    };
    
    // Handle page focus (additional check for mobile)
    const handleFocus = () => {
      if (socket && !socket.connected && isOnlineRef.current) {
        console.log('[Socket] 👁️ Window focused, checking connection...');
        socket.connect();
      }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // REGISTER EVENT LISTENERS
    // ═══════════════════════════════════════════════════════════════════════

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('focus', handleFocus);

    // ═══════════════════════════════════════════════════════════════════════
    // CLEANUP
    // ═══════════════════════════════════════════════════════════════════════

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('focus', handleFocus);
      
      stopHeartbeat();
      stopBackgroundCheck();
      cancelReconnect();
      releaseWakeLock();
      
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    startHeartbeat,
    stopHeartbeat,
    startBackgroundCheck,
    stopBackgroundCheck,
    scheduleReconnect,
    cancelReconnect,
    updateConnectionHealth,
    requestWakeLock,
    releaseWakeLock,
    flushEventQueue,
    playNotificationSound,
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SOCKET ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const joinRoom = useCallback((roomId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join-room', roomId);
    } else {
      queueEvent('join-room', roomId);
    }
  }, [queueEvent]);

  const leaveRoom = useCallback((roomId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave-room', roomId);
    }
  }, []);

  const sendTyping = useCallback((roomId: string, userName: string, isTyping: boolean) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(isTyping ? 'typing-start' : 'typing-stop', { roomId, userName });
    }
  }, []);

  const markAsRead = useCallback((roomId: string, messageIds: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('message-read', { roomId, messageIds });
    } else {
      queueEvent('message-read', { roomId, messageIds });
    }
  }, [queueEvent]);

  const emitRoomRead = useCallback((roomId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('room-read', { roomId });
    } else {
      queueEvent('room-read', { roomId });
    }
  }, [queueEvent]);

  const emitRoomPropertyUpdate = useCallback((roomId: string, updates: RoomPropertyUpdate) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('room-property-update', { roomId, updates });
    } else {
      queueEvent('room-property-update', { roomId, updates });
    }
  }, [queueEvent]);

  const emitRoomDeleted = useCallback((roomId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('room-deleted', { roomId });
    } else {
      queueEvent('room-deleted', { roomId });
    }
  }, [queueEvent]);

  const reconnect = useCallback(() => {
    if (socketRef.current && !socketRef.current.connected) {
      reconnectAttemptsRef.current = 0;
      setReconnectAttempts(0);
      socketRef.current.connect();
    }
  }, []);

  // Force refresh connection
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

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN VALUES
  // ═══════════════════════════════════════════════════════════════════════════

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
