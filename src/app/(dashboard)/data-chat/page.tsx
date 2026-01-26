'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, Send, Smile, Filter,
  Plus, Check, CheckCheck, Pin, X,
  MessageCircle, Settings, Clock,
  Loader2, Paperclip, Image as ImageIcon, FileText, 
  Phone, Video, Bookmark, VolumeX, Volume2, Trash2, AlertTriangle,
  ChevronDown, ChevronLeft, ChevronRight, User, Tag, FileEdit, Bell, BellOff, XCircle
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSocket } from '@/hooks/useSocket';

interface LineEmoji {
  index: number;
  length: number;
  productId: string;
  emojiId: string;
  url: string;
}

interface Message {
  id: string;
  roomId: string;
  lineMessageId?: string;
  messageType: 'text' | 'image' | 'sticker' | 'video' | 'audio' | 'file' | 'location';
  content?: string;
  mediaUrl?: string;
  stickerId?: string;
  packageId?: string;
  emojis?: LineEmoji[];
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
  lastMessage?: Message;
  lastMessageAt?: string;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  tags: string[];
  status: 'active' | 'archived' | 'blocked' | 'spam';
  createdAt: string;
  updatedAt: string;
  recentMessages?: Message[];
}

const quickReplies = [
  { id: 1, label: 'ดำเนินการฝาก-ถอน รบกวนแอดไลน์นี้นะคะ 🙏', icon: '💳' },
  { id: 2, label: 'กรุณาส่งสลิปด้วยค่ะ', icon: '🧾' },
  { id: 3, label: 'รบกวนแจ้งยืนตรวจสอบให้หน่อยนะคะ', icon: '✅' },
  { id: 4, label: 'รบกวนลูกค้าติดต่อไลน์หลักนะคะ', icon: '📱' },
];

export default function DataChatPage() {
  const { isDark } = useTheme();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null); // Start with no room selected
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'pinned' | 'archived' | 'spam'>('all');
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ [roomId: string]: { userName: string; timeout: NodeJS.Timeout } }>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; username: string } | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [chatSearchTerm, setChatSearchTerm] = useState('');
  const [showChatSearch, setShowChatSearch] = useState(false);
  
  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isSmallDesktop, setIsSmallDesktop] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(true); // On mobile, show sidebar by default
  
  // Detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      setIsSmallDesktop(width >= 1024 && width < 1280);
      // On larger screens, always show sidebar
      if (width >= 768) {
        setShowMobileSidebar(true);
      }
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  // When selecting a room on mobile, hide sidebar and show chat
  useEffect(() => {
    if (isMobile && selectedRoom) {
      setShowMobileSidebar(false);
    }
  }, [selectedRoom, isMobile]);
  
  const messagesCacheRef = useRef<Map<string, Message[]>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedRoomRef = useRef<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('selectedChatRoom') : null
  );
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundUnlockedRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const sendTypingRef = useRef<((roomId: string, userName: string, isTyping: boolean) => void) | null>(null);

  // ═══════════════════════════════════════════════════════════════════
  // THEME COLORS - Clean Professional Design
  // ═══════════════════════════════════════════════════════════════════
  const colors = useMemo(() => ({
    // Background colors - matching main theme
    bgPrimary: isDark ? '#1D1E24' : '#f8fafc',
    bgSecondary: isDark ? '#23262B' : '#ffffff',
    bgTertiary: isDark ? '#2A313C' : '#f1f5f9',
    bgHover: isDark ? '#2f353f' : '#f1f5f9',
    bgActive: isDark ? 'rgba(34, 197, 94, 0.12)' : 'rgba(34, 197, 94, 0.08)',
    bgInput: isDark ? '#1D1E24' : '#ffffff',
    
    // Border colors
    border: isDark ? '#2A313C' : '#e2e8f0',
    borderLight: isDark ? '#363d4a' : '#f1f5f9',
    
    // Text colors
    textPrimary: isDark ? '#f1f5f9' : '#1e293b',
    textSecondary: isDark ? '#94a3b8' : '#64748b',
    textMuted: isDark ? '#64748b' : '#94a3b8',
    
    // Brand color - Green (matching main theme #22c55e)
    accent: '#22c55e',
    accentHover: '#16a34a',
    accentLight: isDark ? 'rgba(34, 197, 94, 0.12)' : 'rgba(34, 197, 94, 0.08)',
    
    // Status colors
    online: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    
    // Chat bubble colors
    bubbleOutgoing: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    bubbleIncoming: isDark ? '#2A313C' : '#ffffff',
    
    // Shadow - very subtle
    shadow: isDark 
      ? '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)'
      : '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
    shadowMd: isDark
      ? '0 4px 6px rgba(0,0,0,0.12)'
      : '0 4px 6px rgba(0,0,0,0.04)',
  }), [isDark]);

  const selectedRoomData = rooms.find(r => r.id === selectedRoom);

  // ═══════════════════════════════════════════════════════════════════
  // AUDIO SETUP
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (typeof window !== 'undefined') {
      notificationAudioRef.current = new Audio('/notification.mp3');
      notificationAudioRef.current.volume = 0.7;
      notificationAudioRef.current.load();
      
      const unlockAudio = () => {
        soundUnlockedRef.current = true;
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
        if (notificationAudioRef.current) {
          const audio = notificationAudioRef.current;
          audio.volume = 0;
          audio.play().then(() => {
            audio.pause();
            audio.currentTime = 0;
            audio.volume = 0.7;
          }).catch(() => {});
        }
      };
      
      document.addEventListener('click', unlockAudio, { once: true });
      document.addEventListener('keydown', unlockAudio, { once: true });
      
      return () => {
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
      };
    }
  }, []);

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          const userName = data.user?.name || data.user?.email || data.name || data.username || 'Agent';
          setCurrentUser({ name: userName, username: data.user?.email || data.username || '' });
        }
      } catch (error) {
        console.error('Failed to fetch current user:', error);
      }
    };
    fetchCurrentUser();
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // API & DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════
  const fetchRooms = useCallback(async () => {
    try {
      const params = new URLSearchParams({ filter: filterStatus });
      if (searchTerm) params.append('search', searchTerm);
      const response = await fetch(`/api/chat/rooms?${params}`);
      if (response.ok) {
        const data = await response.json();
        const currentRoom = selectedRoomRef.current;
        if (currentRoom) {
          setRooms(data.map((r: ChatRoom) => r.id === currentRoom ? { ...r, unreadCount: 0 } : r));
        } else {
          setRooms(data);
        }
        data.forEach((room: ChatRoom) => {
          if (room.recentMessages && room.recentMessages.length > 0) {
            messagesCacheRef.current.set(room.id, room.recentMessages);
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    } finally {
      setIsLoadingRooms(false);
    }
  }, [filterStatus, searchTerm]);

  const fetchMessages = useCallback(async (roomId: string) => {
    if (messagesCacheRef.current.has(roomId)) {
      const cached = messagesCacheRef.current.get(roomId)!;
      setMessages(cached);
      setIsLoadingMessages(false);
      fetch(`/api/chat/rooms/${roomId}/messages`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.length > cached.length) {
            messagesCacheRef.current.set(roomId, data);
            setMessages(data);
          }
        })
        .catch(() => {});
      fetch(`/api/chat/rooms/${roomId}/messages`, { method: 'POST' }).catch(() => {});
      return;
    }

    setIsLoadingMessages(true);
    try {
      const response = await fetch(`/api/chat/rooms/${roomId}/messages`);
      if (response.ok) {
        const data = await response.json();
        messagesCacheRef.current.set(roomId, data);
        setMessages(data);
        await fetch(`/api/chat/rooms/${roomId}/messages`, { method: 'POST' });
        setRooms(prev => prev.map(r => r.id === roomId ? { ...r, unreadCount: 0 } : r));
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const playSound = useCallback(() => {
    if (notificationAudioRef.current && soundUnlockedRef.current) {
      notificationAudioRef.current.currentTime = 0;
      notificationAudioRef.current.play().catch(() => {
        if (audioContextRef.current) {
          const ctx = audioContextRef.current;
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(800, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
        }
      });
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // SOCKET CONNECTION
  // ═══════════════════════════════════════════════════════════════════
  const handleNewMessage = useCallback((msg: Message) => {
    // Skip if this is a temp message (we already have it locally)
    if (msg.id?.startsWith('temp-')) return;
    
    // Update cache
    if (messagesCacheRef.current.has(msg.roomId)) {
      const cached = messagesCacheRef.current.get(msg.roomId)!;
      // Check for duplicates by id or lineMessageId
      const exists = cached.find(m => 
        m.id === msg.id || 
        (m.lineMessageId && m.lineMessageId === msg.lineMessageId) ||
        (m.id?.startsWith('temp-') && m.content === msg.content && m.sender === msg.sender)
      );
      if (!exists) {
        messagesCacheRef.current.set(msg.roomId, [...cached, msg]);
      } else if (exists.id?.startsWith('temp-')) {
        // Replace temp message with real one
        messagesCacheRef.current.set(msg.roomId, cached.map(m => 
          m.id === exists.id ? msg : m
        ));
      }
    }
    
    // Update messages if viewing this room
    if (selectedRoomRef.current === msg.roomId) {
      setMessages(prev => {
        // Check for duplicates
        const exists = prev.find(m => 
          m.id === msg.id || 
          (m.lineMessageId && m.lineMessageId === msg.lineMessageId) ||
          (m.id?.startsWith('temp-') && m.content === msg.content && m.sender === msg.sender)
        );
        if (!exists) {
          return [...prev, msg];
        } else if (exists.id?.startsWith('temp-')) {
          // Replace temp message with real one
          return prev.map(m => m.id === exists.id ? msg : m);
        }
        return prev;
      });
      // Mark as read
      fetch(`/api/chat/rooms/${msg.roomId}/messages`, { method: 'POST' }).catch(() => {});
    }
    
    // Update rooms list
    setRooms(prev => {
      const roomIndex = prev.findIndex(r => r.id === msg.roomId);
      if (roomIndex === -1) return prev;
      
      const updatedRooms = [...prev];
      const room = { ...updatedRooms[roomIndex] };
      room.lastMessage = msg;
      room.lastMessageAt = msg.createdAt;
      
      // Only increment unread and play sound for incoming user messages
      // Skip notification for spam rooms
      if (selectedRoomRef.current !== msg.roomId && msg.sender === 'user' && room.status !== 'spam') {
        // Increment locally for immediate UI feedback
        room.unreadCount = (room.unreadCount || 0) + 1;
        playSound();
      }
      
      // Move room to top (but not spam rooms)
      updatedRooms.splice(roomIndex, 1);
      if (room.status !== 'spam') {
        updatedRooms.unshift(room);
      } else {
        updatedRooms.push(room); // Keep spam at the end
      }
      return updatedRooms;
    });
  }, [playSound]);

  const handleTypingEvent = useCallback((data: { roomId: string; userName: string; isTyping: boolean }) => {
    // Server broadcasts to everyone EXCEPT sender, so no need to filter here
    console.log('[Typing Event]', data);
    if (data.isTyping) {
      setTypingUsers(prev => {
        // Clear existing timeout if any
        if (prev[data.roomId]?.timeout) {
          clearTimeout(prev[data.roomId].timeout);
        }
        // Set new timeout to auto-clear after 5 seconds (in case stop event is missed)
        const timeout = setTimeout(() => {
          setTypingUsers(p => {
            const newState = { ...p };
            delete newState[data.roomId];
            return newState;
          });
        }, 5000);
        return { ...prev, [data.roomId]: { userName: data.userName, timeout } };
      });
    } else {
      setTypingUsers(prev => {
        if (prev[data.roomId]?.timeout) {
          clearTimeout(prev[data.roomId].timeout);
        }
        const newState = { ...prev };
        delete newState[data.roomId];
        return newState;
      });
    }
  }, []);

  const handleRoomReadSync = useCallback((data: { roomId: string; readAt?: string }) => {
    // Update message statuses to 'read'
    setMessages(prev => prev.map(m => 
      m.roomId === data.roomId && m.sender === 'agent' ? { ...m, status: 'read' } : m
    ));
    if (messagesCacheRef.current.has(data.roomId)) {
      const cached = messagesCacheRef.current.get(data.roomId)!;
      messagesCacheRef.current.set(data.roomId, cached.map(m => 
        m.sender === 'agent' ? { ...m, status: 'read' } : m
      ));
    }
    
    // Update unreadCount to 0 for this room across all browsers
    setRooms(prev => prev.map(room => 
      room.id === data.roomId ? { ...room, unreadCount: 0 } : room
    ));
  }, []);

  // Handle room update from socket - update rooms list when other browsers send messages
  const handleRoomUpdate = useCallback((data: { id: string; lastMessage?: Message; lastMessageAt?: string; unreadCount?: number; displayName?: string; pictureUrl?: string; status?: 'active' | 'spam' | 'archived' | 'blocked' }) => {
    console.log('[Chat] Room update received:', data.id);
    
    setRooms(prev => {
      const roomIndex = prev.findIndex(r => r.id === data.id);
      
      // If room doesn't exist and we have enough info, add it
      if (roomIndex === -1) {
        // Only add if it's not spam and we have display name
        if (data.status === 'spam') return prev;
        
        // Create a minimal room entry
        const newRoom: ChatRoom = {
          id: data.id,
          lineUserId: '',
          displayName: data.displayName || 'New Customer',
          pictureUrl: data.pictureUrl,
          lastMessage: data.lastMessage,
          lastMessageAt: data.lastMessageAt,
          unreadCount: data.unreadCount || 1,
          isPinned: false,
          isMuted: false,
          tags: [],
          status: data.status || 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        console.log('[Chat] Adding new room from update:', newRoom.id, newRoom.displayName);
        // Sound is played by handleNewMessage, no need to play here
        return [newRoom, ...prev];
      }
      
      const updatedRooms = [...prev];
      const room = { ...updatedRooms[roomIndex] };
      
      if (data.lastMessage) {
        room.lastMessage = data.lastMessage;
      }
      if (data.lastMessageAt) {
        room.lastMessageAt = data.lastMessageAt;
      }
      if (typeof data.unreadCount === 'number') {
        // Only update unread count if not currently viewing this room
        if (selectedRoomRef.current !== data.id) {
          room.unreadCount = data.unreadCount;
        }
      }
      
      updatedRooms[roomIndex] = room;
      
      // Sort by lastMessageAt
      updatedRooms.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return timeB - timeA;
      });
      
      return updatedRooms;
    });
  }, [playSound]);

  // Handle new room from socket (when a new customer starts chatting)
  const handleNewRoom = useCallback((room: ChatRoom) => {
    console.log('[Chat] New room received:', room.id, room.displayName);
    
    // Don't add spam rooms to the list immediately
    if (room.status === 'spam') return;
    
    setRooms(prev => {
      // Check if room already exists
      if (prev.some(r => r.id === room.id)) {
        return prev;
      }
      // Add new room to the top
      return [room, ...prev];
    });
    
    // Sound is played by handleNewMessage when first message arrives
  }, []);

  // Handle room property changes from other browsers (pin, mute, tags, status)
  const handleRoomPropertyChanged = useCallback((data: { roomId: string; updates: {
    isPinned?: boolean;
    isMuted?: boolean;
    tags?: string[];
    status?: 'active' | 'archived' | 'blocked' | 'spam';
  }; updatedAt: string }) => {
    console.log('[Chat] Room property changed:', data.roomId, data.updates);
    setRooms(prev => {
      const updatedRooms = prev.map(r => r.id === data.roomId ? { ...r, ...data.updates } : r);
      // Re-sort if isPinned changed
      if (data.updates.isPinned !== undefined) {
        updatedRooms.sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return timeB - timeA;
        });
      }
      return updatedRooms;
    });
  }, []);

  const { isConnected, connectionState, reconnect, sendTyping, markAsRead, emitRoomRead, emitRoomPropertyUpdate } = useSocket({
    onNewMessage: handleNewMessage,
    onNewRoom: handleNewRoom,
    onUserTyping: handleTypingEvent,
    onRoomReadUpdate: handleRoomReadSync,
    onRoomUpdate: handleRoomUpdate,
    onRoomPropertyChanged: handleRoomPropertyChanged,
  });

  // Store sendTyping in ref
  useEffect(() => {
    sendTypingRef.current = sendTyping;
  }, [sendTyping]);

  // Initial load
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Fallback polling when socket is disconnected - poll every 5 seconds
  useEffect(() => {
    if (!isConnected) {
      console.log('[Chat] Socket disconnected, starting fallback polling');
      const pollInterval = setInterval(() => {
        fetchRooms();
        if (selectedRoomRef.current) {
          fetchMessages(selectedRoomRef.current);
        }
      }, 5000);
      
      return () => clearInterval(pollInterval);
    }
  }, [isConnected, fetchRooms, fetchMessages]);

  // Load messages when room changes
  useEffect(() => {
    if (selectedRoom) {
      localStorage.setItem('selectedChatRoom', selectedRoom);
      selectedRoomRef.current = selectedRoom;
      fetchMessages(selectedRoom);
      
      // Clear message input when changing rooms
      setMessage('');
      
      // Clear notes and tags UI state
      setRoomNotes([]);
      setShowNoteInput(false);
      setNewNoteContent('');
      setShowTagInput(false);
      setNewTag('');
      
      // Fetch room details including notes
      fetch(`/api/chat/rooms/${selectedRoom}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.notes) {
            setRoomNotes(data.notes);
          }
        })
        .catch(err => console.error('Failed to fetch room details:', err));
      
      // Mark as read locally
      if (markAsRead) markAsRead(selectedRoom, []);
      
      // Broadcast room read to all clients
      if (emitRoomRead) emitRoomRead(selectedRoom);
      
      // Update local unreadCount immediately
      setRooms(prev => prev.map(room => 
        room.id === selectedRoom ? { ...room, unreadCount: 0 } : room
      ));
    }
  }, [selectedRoom, fetchMessages, markAsRead, emitRoomRead]);

  // Auto-scroll - instant for initial load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [messages]);

  // ═══════════════════════════════════════════════════════════════════
  // TYPING INDICATOR & INPUT HANDLING
  // ═══════════════════════════════════════════════════════════════════
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    
    if (selectedRoom && currentUser && sendTypingRef.current) {
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        sendTypingRef.current(selectedRoom, currentUser.name, true);
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        if (sendTypingRef.current && selectedRoom && currentUser) {
          sendTypingRef.current(selectedRoom, currentUser.name, false);
        }
      }, 2000);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // SEND MESSAGE
  // ═══════════════════════════════════════════════════════════════════
  const sendMessage = async (content: string) => {
    if (!content.trim() || !selectedRoom || isSending) return;
    setIsSending(true);
    
    const tempId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      id: tempId,
      roomId: selectedRoom,
      messageType: 'text',
      content: content.trim(),
      sender: 'agent',
      senderName: currentUser?.name || 'Agent',
      status: 'sending',
      createdAt: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, tempMessage]);
    setMessage('');
    setShowQuickReplies(false);
    setShowEmojiPicker(false);
    
    if (isTypingRef.current && sendTypingRef.current && currentUser) {
      isTypingRef.current = false;
      sendTypingRef.current(selectedRoom, currentUser.name, false);
    }
    
    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: selectedRoom, content: content.trim(), senderName: currentUser?.name || 'Agent' }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const sentMessage = { ...data.message, status: 'sent' };
        
        // Update messages list
        setMessages(prev => prev.map(m => m.id === tempId ? sentMessage : m));
        
        // Update cache
        if (messagesCacheRef.current.has(selectedRoom)) {
          const cached = messagesCacheRef.current.get(selectedRoom)!;
          messagesCacheRef.current.set(selectedRoom, cached.map(m => m.id === tempId ? sentMessage : m));
        }
        
        // Update room's lastMessage in rooms list
        setRooms(prev => prev.map(room => 
          room.id === selectedRoom 
            ? { ...room, lastMessage: sentMessage, lastMessageAt: sentMessage.createdAt }
            : room
        ));
        
        // Scroll to bottom after successful send
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
    } finally {
      setIsSending(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // CHAT ROOM ACTIONS (Pin, Mute, Archive, Spam, Delete)
  // ═══════════════════════════════════════════════════════════════════
  const updateRoom = async (roomId: string, updates: {
    isPinned?: boolean;
    isMuted?: boolean;
    tags?: string[];
    status?: 'active' | 'archived' | 'blocked' | 'spam';
  }) => {
    try {
      const response = await fetch(`/api/chat/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (response.ok) {
        // Update local state and re-sort if isPinned changed
        setRooms(prev => {
          const updatedRooms = prev.map(r => r.id === roomId ? { ...r, ...updates } : r);
          // Re-sort if isPinned changed
          if (updates.isPinned !== undefined) {
            updatedRooms.sort((a, b) => {
              if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
              const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
              const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
              return timeB - timeA;
            });
          }
          return updatedRooms;
        });
        // Broadcast to all other browsers via socket
        emitRoomPropertyUpdate(roomId, updates);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update room:', error);
      return false;
    }
  };

  const togglePinRoom = async (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      await updateRoom(roomId, { isPinned: !room.isPinned });
    }
  };

  const toggleMuteRoom = async (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      await updateRoom(roomId, { isMuted: !room.isMuted });
    }
  };

  const archiveRoom = async (roomId: string) => {
    const success = await updateRoom(roomId, { status: 'archived' });
    if (success && selectedRoom === roomId) {
      setSelectedRoom(null);
    }
  };

  const markAsSpam = async (roomId: string) => {
    const success = await updateRoom(roomId, { status: 'spam' });
    if (success && selectedRoom === roomId) {
      setSelectedRoom(null);
    }
  };

  const unmarkSpam = async (roomId: string) => {
    const success = await updateRoom(roomId, { status: 'active' });
    if (success) {
      // Refresh rooms list
      fetchRooms();
    }
  };

  const deleteRoom = async (roomId: string, permanent: boolean = false) => {
    try {
      const response = await fetch(`/api/chat/rooms/${roomId}?permanent=${permanent}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setRooms(prev => prev.filter(r => r.id !== roomId));
        if (selectedRoom === roomId) {
          setSelectedRoom(null);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete room:', error);
      return false;
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // FILE UPLOAD
  // ═══════════════════════════════════════════════════════════════════
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRoom || isUploading) return;

    // Check file size before upload
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    
    if (file.size > maxSize) {
      alert(`ไฟล์มีขนาดใหญ่เกินไป! ขนาดสูงสุด: ${isVideo ? '50MB' : '10MB'}`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('roomId', selectedRoom);
      formData.append('senderName', currentUser?.name || 'Agent');

      const response = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        const { message: uploadedMessage, lineResult } = data;
        setMessages(prev => [...prev, uploadedMessage]);
        
        // Update room's lastMessage
        setRooms(prev => prev.map(room => 
          room.id === selectedRoom 
            ? { ...room, lastMessage: uploadedMessage, lastMessageAt: uploadedMessage.createdAt }
            : room
        ));
        
        // Show warning if LINE send failed
        if (lineResult && !lineResult.success) {
          console.warn('LINE send failed:', lineResult.error);
          alert(`บันทึกไฟล์สำเร็จ แต่ส่งไปยัง LINE ไม่สำเร็จ: ${lineResult.error || 'Unknown error'}`);
        }
        
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        // Show error message
        alert(`อัพโหลดไม่สำเร็จ: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('อัพโหลดไม่สำเร็จ: เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // NOTES MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════
  const [roomNotes, setRoomNotes] = useState<{ id: string; content: string; createdBy: string; createdAt: string }[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);

  const addNote = async () => {
    if (!newNoteContent.trim() || !selectedRoom) return;
    setIsAddingNote(true);
    
    try {
      const response = await fetch(`/api/chat/rooms/${selectedRoom}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: {
            action: 'add',
            content: newNoteContent.trim(),
            createdBy: currentUser?.name || 'Agent',
          }
        }),
      });

      if (response.ok) {
        const newNote = {
          id: `note_${Date.now()}`,
          content: newNoteContent.trim(),
          createdBy: currentUser?.name || 'Agent',
          createdAt: new Date().toISOString(),
        };
        setRoomNotes(prev => [newNote, ...prev]);
        setNewNoteContent('');
        setShowNoteInput(false);
      }
    } catch (error) {
      console.error('Failed to add note:', error);
    } finally {
      setIsAddingNote(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!selectedRoom) return;
    
    try {
      const response = await fetch(`/api/chat/rooms/${selectedRoom}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: {
            action: 'delete',
            noteId,
          }
        }),
      });

      if (response.ok) {
        setRoomNotes(prev => prev.filter(n => n.id !== noteId));
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // TAGS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');
  const predefinedTags = ['VIP', 'New', 'Important', 'Follow-up', 'Resolved', 'Pending'];

  const addTag = async (tag: string) => {
    if (!selectedRoom || !tag.trim()) return;
    const room = rooms.find(r => r.id === selectedRoom);
    if (!room) return;
    
    const currentTags = room.tags || [];
    if (currentTags.includes(tag)) return;
    
    const newTags = [...currentTags, tag.trim()];
    await updateRoom(selectedRoom, { tags: newTags });
  };

  const removeTag = async (tag: string) => {
    if (!selectedRoom) return;
    const room = rooms.find(r => r.id === selectedRoom);
    if (!room) return;
    
    const newTags = (room.tags || []).filter(t => t !== tag);
    await updateRoom(selectedRoom, { tags: newTags });
  };

  // ═══════════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  };

  const renderSticker = (packageId?: string, stickerId?: string) => {
    if (!packageId || !stickerId) return null;
    return (
      <img 
        src={`https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/iPhone/sticker.png`}
        alt="Sticker"
        style={{ width: 120, height: 120 }}
        onError={(e) => { e.currentTarget.src = `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/android/sticker.png`; }}
      />
    );
  };

  const convertStickerText = (text: string): string => {
    // LINE Characters emoji mapping
    const lineCharacters: { [key: string]: string } = {
      'brown': '🐻', 'cony': '🐰', 'sally': '🐥', 'moon': '🌙', 'james': '👱',
      'boss': '🦁', 'jessica': '👩', 'leonard': '🐸', 'edward': '🐛', 'pangyo': '🐧',
      'choco': '🐻', 'rangers': '🦸', 'friends': '👥',
    };

    // Compound phrases - check these first (multi-word expressions)
    const compoundPhrases: { [key: string]: string } = {
      'heart hands': '🫶', 'heart eyes': '😍', 'thumbs up': '👍', 'thumbs down': '👎',
      'high five': '🙏', 'face palm': '🤦', 'rolling eyes': '🙄', 'mind blown': '🤯',
      'crossed fingers': '🤞', 'rock on': '🤘', 'call me': '🤙', 'pinched fingers': '🤌',
      'folded hands': '🙏', 'raised hands': '🙌', 'open hands': '👐', 'palms up': '🤲',
      'writing hand': '✍️', 'nail polish': '💅', 'selfie': '🤳', 'flexed biceps': '💪',
      'serious moon': '🌙😐', 'sick moon': '🌙🤒', 'pleading moon': '🌙🥺', 
      'heart eyes moon': '🌙😍', 'love moon': '🌙😍', 'happy moon': '🌙😊',
      'crying brown': '🐻😭', 'happy brown': '🐻😊', 'love brown': '🐻😍',
      'crying cony': '🐰😭', 'happy cony': '🐰😊', 'love cony': '🐰😍',
      'crying sally': '🐥😭', 'happy sally': '🐥😊', 'love sally': '🐥😍',
      // More common expressions
      'on fire': '🔥', 'broken heart': '💔', 'sparkling heart': '💖', 'beating heart': '💓',
      'two hearts': '💕', 'growing heart': '💗', 'revolving hearts': '💞', 
      'red heart': '❤️', 'orange heart': '🧡', 'yellow heart': '💛', 
      'green heart': '💚', 'blue heart': '💙', 'purple heart': '💜',
      'see no evil': '🙈', 'hear no evil': '🙉', 'speak no evil': '🙊',
      'party popper': '🎉', 'confetti ball': '🎊', 'shooting star': '🌠',
    };

    // Emotion/Action to emoji mapping
    const emotionEmojis: { [key: string]: string } = {
      'happy': '😊', 'sad': '😢', 'cry': '😢', 'crying': '😭', 'laugh': '😂', 'laughing': '😂',
      'angry': '😠', 'love': '😍', 'heart': '❤️', 'kiss': '😘', 'wink': '😉', 'cool': '😎',
      'shock': '😱', 'shocked': '😱', 'surprise': '😲', 'surprised': '😲', 'omg': '😱',
      'sleepy': '😴', 'sleep': '😴', 'tired': '😫', 'bored': '😑', 'shy': '🙈',
      'hello': '👋', 'hi': '👋', 'bye': '👋', 'wave': '👋', 'ok': '👌', 'okay': '👌',
      'yes': '👍', 'no': '👎', 'clap': '👏', 'pray': '🙏', 'please': '🙏', 
      'thank': '🙏', 'thanks': '🙏', 'muscle': '💪', 'strong': '💪', 'flex': '💪', 
      'peace': '✌️', 'victory': '✌️', 'funny': '😄', 'lol': '🤣', 'rofl': '🤣', 
      'haha': '😂', 'cute': '🥰', 'what': '🤔', 'think': '🤔', 'thinking': '🤔', 
      'hmm': '🤔', 'wonder': '🤔', 'wow': '🤩', 'amazing': '🤩', 'yay': '🥳', 
      'party': '🎉', 'celebrate': '🎉', 'fire': '🔥', 'hot': '🔥', 'cold': '🥶', 
      'sick': '🤒', 'money': '💰', 'rich': '🤑', 'gift': '🎁', 'present': '🎁', 
      'star': '⭐', 'sparkle': '✨', 'shine': '✨', 'idea': '💡', 'bulb': '💡', 
      'coffee': '☕', 'tea': '🍵', 'cake': '🎂', 'good': '👍', 'great': '👍', 
      'nice': '👍', 'bad': '👎', 'work': '💼', 'home': '🏠', 'run': '🏃', 
      'running': '🏃', 'walk': '🚶', 'dance': '💃', 'dancing': '💃',
      'eat': '🍽️', 'eating': '🍽️', 'hungry': '😋', 'yummy': '😋', 'delicious': '😋',
      'sticker': '📦', 'hands': '🙌', 'hand': '✋', 'fist': '✊', 'punch': '👊',
      'point': '👉', 'pointing': '👉', 'call': '📞', 'phone': '📱', 'camera': '📷',
      'photo': '📸', 'music': '🎵', 'sing': '🎤', 'game': '🎮', 'play': '🎮',
      'win': '🏆', 'winner': '🏆', 'trophy': '🏆', 'medal': '🏅', 'crown': '👑',
      'king': '👑', 'queen': '👑', 'angel': '😇', 'devil': '😈', 'ghost': '👻',
      'skull': '💀', 'poop': '💩', 'alien': '👽', 'robot': '🤖', 'cat': '🐱',
      'dog': '🐶', 'bear': '🐻', 'rabbit': '🐰', 'bird': '🐦', 'fish': '🐟',
      'flower': '🌸', 'rose': '🌹', 'sun': '☀️', 'rain': '🌧️', 'snow': '❄️',
      'rainbow': '🌈', 'umbrella': '☂️', 'car': '🚗', 'bike': '🚲', 'plane': '✈️',
      'banana': '🍌', 'apple': '🍎', 'orange': '🍊', 'grapes': '🍇', 'watermelon': '🍉',
      'strawberry': '🍓', 'cherry': '🍒', 'peach': '🍑', 'mango': '🥭', 'pineapple': '🍍',
      'pleading': '🥺', 'begging': '🥺', 'serious': '😐', 'neutral': '😐', 'straight': '😐',
      'confused': '😕', 'worried': '😟', 'anxious': '😰', 'nervous': '😬', 'scared': '😨',
      'crying out loud': '😭', 'tears of joy': '😂', 'rolling on floor': '🤣',
      // Thai keywords
      'ยิ้ม': '😊', 'หัวเราะ': '😂', 'ร้องไห้': '😢', 'โกรธ': '😠', 'รัก': '❤️',
      'ถูกใจ': '👍', 'ตกใจ': '😱', 'เศร้า': '😢', 'สับสน': '🤔', 'งง': '😕',
      'ขอบคุณ': '🙏', 'สวัสดี': '👋', 'บาย': '👋', 'โอเค': '👌', 'ดี': '👍',
    };

    const lowerText = text.toLowerCase().trim();
    
    // Try to match pattern like "(action character)" or "(action)"
    const stickerMatch = lowerText.match(/^\(([^)]+)\)$/);
    if (stickerMatch) {
      const content = stickerMatch[1].toLowerCase().trim();
      
      // First check compound phrases
      if (compoundPhrases[content]) {
        return compoundPhrases[content];
      }
      
      const words = content.split(/\s+/);
      
      // Check if last word is a LINE character
      const lastWord = words[words.length - 1];
      const characterEmoji = lineCharacters[lastWord];
      
      if (characterEmoji && words.length > 1) {
        // It's "(action character)" format
        const action = words.slice(0, -1).join(' ');
        // Check compound action first
        if (compoundPhrases[action]) {
          return characterEmoji + compoundPhrases[action];
        }
        const actionEmoji = emotionEmojis[action] || emotionEmojis[words[0]] || '';
        return characterEmoji + (actionEmoji || '');
      }
      
      // Check if it's just an emotion/action
      const actionEmoji = emotionEmojis[content];
      if (actionEmoji) return actionEmoji;
      
      // Check individual words
      for (const word of words) {
        if (emotionEmojis[word]) {
          return emotionEmojis[word];
        }
      }
      
      // Default: return a generic sticker emoji
      return '📦';
    }
    
    // Handle [sticker:xxx/xxx] format
    if (text.startsWith('[sticker')) {
      const match = text.match(/packageId=(\d+).*?stickerId=(\d+)/);
      if (match) return '📦 Sticker';
      return '📦';
    }
    
    return text;
  };

  // Render content with LINE emoji images
  const renderMessageContent = (msg: Message) => {
    const content = msg.content || '';
    
    // If message has LINE emojis, render them as images (check this FIRST)
    if (msg.emojis && msg.emojis.length > 0) {
      const elements: React.ReactNode[] = [];
      let lastIndex = 0;
      
      // Sort emojis by index
      const sortedEmojis = [...msg.emojis].sort((a, b) => a.index - b.index);
      
      for (const emoji of sortedEmojis) {
        // Add text before this emoji
        if (emoji.index > lastIndex) {
          elements.push(
            <span key={`text-${lastIndex}`}>{content.slice(lastIndex, emoji.index)}</span>
          );
        }
        
        // Add emoji image
        elements.push(
          <img 
            key={`emoji-${emoji.index}`}
            src={emoji.url}
            alt="LINE emoji"
            style={{ 
              width: 24, 
              height: 24, 
              display: 'inline-block', 
              verticalAlign: 'middle',
              margin: '0 1px',
            }}
            onError={(e) => {
              // Fallback: try alternative URL format
              const target = e.target as HTMLImageElement;
              if (!target.dataset.retried) {
                target.dataset.retried = 'true';
                target.src = `https://stickershop.line-scdn.net/sticonshop/v1/sticon/${emoji.productId}/android/${emoji.emojiId}.png`;
              }
            }}
          />
        );
        
        lastIndex = emoji.index + emoji.length;
      }
      
      // Add remaining text after last emoji
      if (lastIndex < content.length) {
        elements.push(
          <span key={`text-end`}>{content.slice(lastIndex)}</span>
        );
      }
      
      return (
        <p style={{ fontSize: 14, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
          {elements}
        </p>
      );
    }
    
    // Check for sticker pattern (like "[sticker]" or "(crying Cony)(sick Moon)") - only if no emojis data
    if (content.startsWith('[sticker') || (content && /^\([a-zA-Z\s]+\)(\([a-zA-Z\s]+\))*$/.test(content.trim()))) {
      return (
        <p style={{ fontSize: 40, margin: 0, textAlign: 'center' }}>
          {convertStickerText(content)}
        </p>
      );
    }
    
    // Regular text message
    return (
      <p style={{ fontSize: 14, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
        {content}
      </p>
    );
  };

  // Emoji list
  const commonEmojis = ['😊', '😂', '❤️', '👍', '🙏', '😍', '🎉', '🔥', '✨', '💯', '😢', '😱', '🤔', '👏', '💪', '🙌', '😎', '🥳', '💕', '✅', '❌', '⭐', '🌟', '💰', '📱', '💳', '🧾', '📝', '🎁', '🏆'];

  // Typing indicator component - shows who is typing
  const TypingIndicator = ({ userName }: { userName?: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: colors.bgTertiary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <User size={16} style={{ color: colors.textMuted }} />
      </div>
      <div style={{ padding: '12px 16px', borderRadius: 18, background: colors.bubbleIncoming, border: `1px solid ${colors.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {userName && (
            <span style={{ fontSize: 12, color: colors.accent, fontWeight: 600 }}>{userName}</span>
          )}
          <span style={{ fontSize: 12, color: colors.textMuted }}>กำลังพิมพ์</span>
          <div style={{ display: 'flex', gap: 3 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: colors.accent, animation: `typingDot 1.4s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div style={{ 
      display: 'flex', 
      height: 'calc(100vh - 118px)', 
      background: colors.bgPrimary,
      borderRadius: isMobile ? 0 : 12,
      overflow: 'hidden',
      border: isMobile ? 'none' : `1px solid ${colors.border}`,
      boxShadow: isMobile ? 'none' : colors.shadow,
      position: 'relative',
    }}>
      
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* LEFT SIDEBAR - Chat List */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div style={{ 
        width: isMobile ? '100%' : isTablet ? 280 : isSmallDesktop ? 300 : 340,
        minWidth: isMobile ? '100%' : isTablet ? 280 : isSmallDesktop ? 300 : 340,
        maxWidth: isMobile ? '100%' : isTablet ? 280 : isSmallDesktop ? 300 : 340,
        flexShrink: 0,
        background: colors.bgSecondary, 
        borderRight: isMobile ? 'none' : `1px solid ${colors.border}`,
        display: isMobile ? (showMobileSidebar ? 'flex' : 'none') : 'flex', 
        flexDirection: 'column',
        position: isMobile ? 'absolute' : 'relative',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: isMobile ? 10 : 1,
      }}>
        {/* Header */}
        <div style={{ padding: isMobile ? 16 : 20 }}>
          {/* Filter & Search */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {/* Filter Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: isMobile ? '8px 12px' : '10px 14px', borderRadius: 8,
                  background: colors.bgTertiary,
                  border: `1px solid ${colors.border}`,
                  color: colors.textPrimary,
                  fontSize: isMobile ? 13 : 14, fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Filter size={isMobile ? 14 : 15} style={{ color: colors.accent }} />
                <span>{filterStatus === 'all' ? 'All' : filterStatus === 'unread' ? 'Unread' : filterStatus === 'pinned' ? 'Pinned' : filterStatus === 'archived' ? 'Archived' : 'Spam'}</span>
                <ChevronDown size={isMobile ? 12 : 14} style={{ color: colors.textMuted }} />
              </button>
              
              {showFilterDropdown && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: 4,
                  background: colors.bgSecondary, border: `1px solid ${colors.border}`,
                  borderRadius: 8, boxShadow: colors.shadowMd, zIndex: 100,
                  minWidth: 120, overflow: 'hidden',
                }}>
                  {['all', 'unread', 'pinned', 'archived', 'spam'].map((status) => (
                    <button
                      key={status}
                      onClick={() => { setFilterStatus(status as 'all' | 'unread' | 'pinned' | 'archived' | 'spam'); setShowFilterDropdown(false); }}
                      style={{
                        display: 'block', width: '100%', padding: '10px 14px',
                        background: filterStatus === status ? colors.accentLight : 'transparent',
                        border: 'none', color: filterStatus === status ? colors.accent : status === 'spam' ? colors.warning : status === 'archived' ? colors.textMuted : colors.textPrimary,
                        fontSize: 13, textAlign: 'left', cursor: 'pointer',
                      }}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Search Input */}
            <div style={{ flex: 1, position: 'relative' }}>
              <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: colors.textMuted }} />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%', height: 40, paddingLeft: 38, paddingRight: 14,
                  borderRadius: 8, border: `1px solid ${colors.border}`,
                  background: colors.bgInput, color: colors.textPrimary,
                  fontSize: 13, outline: 'none',
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = colors.accent}
                onBlur={(e) => e.currentTarget.style.borderColor = colors.border}
              />
            </div>
          </div>
          
          {/* Stats */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: colors.textMuted, fontWeight: 500 }}>
              {rooms.length} conversations
            </span>
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 12,
              background: connectionState === 'connected' 
                ? 'rgba(34, 197, 94, 0.1)' 
                : 'rgba(245, 158, 11, 0.1)',
            }}>
              <div style={{ 
                width: 6, height: 6, borderRadius: '50%',
                background: connectionState === 'connected' ? colors.online : colors.warning,
              }} />
              <span style={{ 
                fontSize: 11, fontWeight: 600,
                color: connectionState === 'connected' ? colors.online : colors.warning,
              }}>
                {connectionState === 'connected' ? 'Live' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>

        {/* Chat List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoadingRooms ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Loader2 size={24} style={{ color: colors.accent, animation: 'spin 1s linear infinite' }} />
            </div>
          ) : rooms.filter(r => filterStatus === 'spam' ? r.status === 'spam' : r.status !== 'spam').length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <MessageCircle size={32} style={{ color: colors.textMuted, marginBottom: 12 }} />
              <p style={{ fontSize: 13, color: colors.textMuted, margin: 0 }}>
                {filterStatus === 'spam' ? 'No spam messages' : 'No conversations'}
              </p>
            </div>
          ) : (
            rooms
              .filter(room => filterStatus === 'spam' ? room.status === 'spam' : room.status !== 'spam')
              .map((room) => (
              <div
                key={room.id}
                onClick={() => {
                  setRooms(prev => prev.map(r => r.id === room.id ? { ...r, unreadCount: 0 } : r));
                  setSelectedRoom(room.id);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 20px', cursor: 'pointer',
                  background: selectedRoom === room.id ? colors.bgActive : room.status === 'spam' ? colors.warning + '08' : 'transparent',
                  borderLeft: selectedRoom === room.id ? `3px solid ${colors.accent}` : room.status === 'spam' ? `3px solid ${colors.warning}` : '3px solid transparent',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (selectedRoom !== room.id) e.currentTarget.style.background = colors.bgHover;
                }}
                onMouseLeave={(e) => {
                  if (selectedRoom !== room.id) e.currentTarget.style.background = room.status === 'spam' ? colors.warning + '08' : 'transparent';
                }}
              >
                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {room.pictureUrl ? (
                    <img src={room.pictureUrl} alt="" style={{ 
                      width: 48, height: 48, borderRadius: '50%', objectFit: 'cover',
                      border: room.unreadCount > 0 ? `2px solid ${colors.accent}` : `2px solid transparent`,
                    }} />
                  ) : (
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: room.status === 'spam' 
                        ? `linear-gradient(135deg, ${colors.warning} 0%, #d97706 100%)`
                        : `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentHover} 100%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 18, fontWeight: 600,
                    }}>
                      {room.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 12, height: 12, borderRadius: '50%',
                    background: room.status === 'spam' ? colors.warning : colors.online,
                    border: `2px solid ${colors.bgSecondary}`,
                  }} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Row 1: Name + Time */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, flex: 1 }}>
                      <span style={{ 
                        fontWeight: room.unreadCount > 0 ? 600 : 500,
                        color: colors.textPrimary, fontSize: 14,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {room.displayName}
                      </span>
                      {room.isPinned && <Pin size={11} style={{ color: colors.accent, transform: 'rotate(-45deg)', flexShrink: 0 }} />}
                      {room.isMuted && <VolumeX size={11} style={{ color: colors.warning, flexShrink: 0 }} />}
                    </div>
                    <span style={{ 
                      fontSize: 11, 
                      color: room.unreadCount > 0 ? colors.accent : colors.textMuted,
                      fontWeight: room.unreadCount > 0 ? 600 : 400,
                      flexShrink: 0, marginLeft: 8,
                    }}>
                      {room.lastMessageAt && formatTime(room.lastMessageAt)}
                    </span>
                  </div>
                  
                  {/* Row 2: Message Preview + Tags + Unread Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {/* Message Preview */}
                    <span style={{ 
                      fontSize: 12, color: colors.textMuted,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      flex: 1, minWidth: 0,
                    }}>
                      {typingUsers[room.id] ? (
                        <span style={{ color: colors.accent, fontStyle: 'italic' }}>
                          {typingUsers[room.id].userName} กำลังพิมพ์...
                        </span>
                      ) : (
                        <>
                          {room.lastMessage?.sender === 'agent' && <span style={{ color: colors.accent }}>You: </span>}
                          {room.lastMessage?.messageType === 'sticker'
                            ? 'Sticker'
                            : room.lastMessage?.messageType === 'image'
                              ? '📷 Image'
                              : room.lastMessage?.messageType === 'video'
                                ? '🎥 Video'
                                : room.lastMessage?.messageType === 'audio'
                                  ? '🎵 Audio'
                                  : room.lastMessage?.messageType === 'file'
                                    ? '📎 File'
                                    : room.lastMessage?.emojis && room.lastMessage.emojis.length > 0
                                      ? room.lastMessage.emojis.slice(0, 3).map((emoji, i) => (
                                          <img 
                                            key={i}
                                            src={emoji.url}
                                            alt="emoji"
                                            style={{ width: 16, height: 16, verticalAlign: 'middle', marginRight: 2 }}
                                          />
                                        ))
                                      : room.lastMessage?.content 
                                        ? convertStickerText(room.lastMessage.content).substring(0, 30)
                                        : 'Start conversation'}
                        </>
                      )}
                    </span>
                    
                    {/* Tags - compact style */}
                    {room.tags && room.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        {room.tags.slice(0, 1).map((tag, idx) => (
                          <span key={idx} style={{
                            padding: '2px 6px', borderRadius: 4,
                            background: `${colors.accent}15`, 
                            fontSize: 9, fontWeight: 600, color: colors.accent,
                            textTransform: 'uppercase', letterSpacing: 0.3,
                            border: `1px solid ${colors.accent}30`,
                          }}>
                            {tag}
                          </span>
                        ))}
                        {room.tags.length > 1 && (
                          <span style={{ 
                            fontSize: 9, color: colors.textMuted, fontWeight: 500,
                            display: 'flex', alignItems: 'center',
                          }}>
                            +{room.tags.length - 1}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Unread Badge */}
                    {room.unreadCount > 0 && (
                      <span style={{
                        minWidth: 18, height: 18, borderRadius: 9,
                        background: colors.accent, color: '#fff',
                        fontSize: 10, fontWeight: 600,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 5px', flexShrink: 0,
                      }}>
                        {room.unreadCount > 99 ? '99+' : room.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MAIN CHAT AREA */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {selectedRoom && selectedRoomData ? (
        <>
          <div style={{ 
            flex: 1, 
            display: isMobile ? (showMobileSidebar ? 'none' : 'flex') : 'flex', 
            flexDirection: 'column', 
            background: colors.bgPrimary,
            minWidth: 0, // Prevent flex item from overflowing
          }}>
            {/* Chat Header */}
            <div style={{
              padding: isMobile ? '12px 16px' : '14px 20px',
              background: colors.bgSecondary,
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              minHeight: isMobile ? 60 : 69,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 12 }}>
                {/* Back button for mobile */}
                {isMobile && (
                  <button
                    onClick={() => {
                      setShowMobileSidebar(true);
                      setSelectedRoom(null);
                    }}
                    style={{
                      padding: 8, borderRadius: 8,
                      background: 'transparent', border: 'none',
                      color: colors.accent, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <ChevronLeft size={24} />
                  </button>
                )}
                {selectedRoomData.pictureUrl ? (
                  <img src={selectedRoomData.pictureUrl} alt="" style={{ 
                    width: isMobile ? 36 : 40, height: isMobile ? 36 : 40, borderRadius: '50%', objectFit: 'cover',
                  }} />
                ) : (
                  <div style={{
                    width: isMobile ? 36 : 40, height: isMobile ? 36 : 40, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentHover} 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: isMobile ? 14 : 16, fontWeight: 600,
                  }}>
                    {selectedRoomData.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 style={{ fontSize: isMobile ? 14 : 15, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>
                    {selectedRoomData.displayName}
                  </h3>
                  <p style={{ fontSize: isMobile ? 11 : 12, color: colors.online, margin: 0, fontWeight: 500 }}>
                    ● Online
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: isMobile ? 4 : 8 }}>
                {/* Search Button */}
                <button 
                  onClick={() => setShowChatSearch(!showChatSearch)}
                  style={{
                    padding: isMobile ? 8 : '8px 14px', borderRadius: 6,
                    background: showChatSearch ? colors.accentLight : colors.bgTertiary, 
                    border: `1px solid ${colors.border}`,
                    color: showChatSearch ? colors.accent : colors.textSecondary, 
                    fontSize: 12, fontWeight: 500,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 6,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = colors.bgHover}
                  onMouseLeave={(e) => e.currentTarget.style.background = showChatSearch ? colors.accentLight : colors.bgTertiary}
                >
                  <Search size={14} /> {!isMobile && 'Search'}
                </button>
                {!isMobile && !isTablet && !isSmallDesktop && (
                  <button
                    onClick={() => setShowRightPanel(!showRightPanel)}
                    style={{
                      width: 36, height: 36, borderRadius: 6,
                    background: showRightPanel ? colors.accentLight : colors.bgTertiary,
                    border: `1px solid ${colors.border}`,
                    color: showRightPanel ? colors.accent : colors.textSecondary,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}
                  title={showRightPanel ? 'Hide panel' : 'Show panel'}
                >
                  {showRightPanel ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
                )}
              </div>
            </div>

            {/* Search Bar - Shown when search is active */}
            {showChatSearch && (
              <div style={{
                padding: '10px 20px',
                background: colors.bgSecondary,
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <Search size={16} style={{ color: colors.textMuted }} />
                <input
                  type="text"
                  placeholder="Search in this conversation..."
                  value={chatSearchTerm}
                  onChange={(e) => setChatSearchTerm(e.target.value)}
                  autoFocus
                  style={{
                    flex: 1, border: 'none', background: 'transparent',
                    color: colors.textPrimary, fontSize: 14, outline: 'none',
                  }}
                />
                {chatSearchTerm && (
                  <span style={{ fontSize: 12, color: colors.textMuted }}>
                    {messages.filter(m => m.content?.toLowerCase().includes(chatSearchTerm.toLowerCase())).length} found
                  </span>
                )}
                <button
                  onClick={() => { setShowChatSearch(false); setChatSearchTerm(''); }}
                  style={{
                    width: 24, height: 24, borderRadius: 4, border: 'none',
                    background: 'transparent', color: colors.textMuted,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px' : '20px 24px', background: colors.bgPrimary }}>
              {isLoadingMessages ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <Loader2 size={24} style={{ color: colors.accent, animation: 'spin 1s linear infinite' }} />
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <p style={{ fontSize: 13, color: colors.textMuted }}>No messages yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {messages
                    .filter(msg => !chatSearchTerm || msg.content?.toLowerCase().includes(chatSearchTerm.toLowerCase()))
                    .map((msg, idx, filteredMsgs) => {
                    const isAgent = msg.sender === 'agent';
                    const showAvatar = !isAgent && (idx === 0 || filteredMsgs[idx - 1]?.sender !== 'user');
                    const showTime = idx === filteredMsgs.length - 1 || 
                      filteredMsgs[idx + 1]?.sender !== msg.sender ||
                      new Date(filteredMsgs[idx + 1]?.createdAt).getTime() - new Date(msg.createdAt).getTime() > 300000;
                    
                    return (
                      <div key={msg.id} style={{ marginBottom: showTime ? 12 : 2 }}>
                        <div style={{ display: 'flex', justifyContent: isAgent ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: isMobile ? 6 : 8 }}>
                          {!isAgent && (
                            <div style={{ width: isMobile ? 28 : 32, flexShrink: 0 }}>
                              {showAvatar && (
                                selectedRoomData.pictureUrl ? (
                                  <img src={selectedRoomData.pictureUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: colors.bgTertiary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, fontSize: 12 }}>
                                    {selectedRoomData.displayName.charAt(0)}
                                  </div>
                                )
                              )}
                            </div>
                          )}
                          
                          <div style={{ maxWidth: isMobile ? '80%' : '65%' }}>
                            {msg.messageType === 'sticker' ? (
                              <div>{renderSticker(msg.packageId, msg.stickerId)}</div>
                            ) : msg.messageType === 'image' && msg.mediaUrl ? (
                              <div style={{ 
                                borderRadius: 12, 
                                overflow: 'hidden',
                                background: colors.bgTertiary,
                                border: `1px solid ${colors.border}`,
                              }}>
                                <img 
                                  src={msg.mediaUrl.startsWith('/uploads/') ? msg.mediaUrl.replace('/uploads/', '/api/uploads/') : msg.mediaUrl} 
                                  alt="รูปภาพ" 
                                  style={{ 
                                    maxWidth: isMobile ? 200 : 240, 
                                    maxHeight: isMobile ? 260 : 320,
                                    display: 'block',
                                    objectFit: 'contain',
                                  }} 
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.parentElement!.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">ไม่สามารถโหลดรูปภาพได้</div>';
                                  }}
                                />
                              </div>
                            ) : msg.messageType === 'video' && msg.mediaUrl ? (
                              <div style={{
                                borderRadius: 12,
                                overflow: 'hidden',
                                background: colors.bgTertiary,
                                border: `1px solid ${colors.border}`,
                              }}>
                                <video 
                                  src={msg.mediaUrl.startsWith('/uploads/') ? msg.mediaUrl.replace('/uploads/', '/api/uploads/') : msg.mediaUrl}
                                  controls
                                  style={{ 
                                    maxWidth: isMobile ? 220 : 280, 
                                    maxHeight: isMobile ? 180 : 220,
                                    display: 'block',
                                  }}
                                  onError={(e) => {
                                    const target = e.target as HTMLVideoElement;
                                    target.style.display = 'none';
                                    target.parentElement!.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">ไม่สามารถโหลดวิดีโอได้</div>';
                                  }}
                                />
                              </div>
                            ) : msg.messageType === 'audio' && msg.mediaUrl ? (
                              <div style={{
                                borderRadius: 12,
                                overflow: 'hidden',
                                background: colors.bgTertiary,
                                border: `1px solid ${colors.border}`,
                                padding: '8px 12px',
                              }}>
                                <audio 
                                  src={msg.mediaUrl.startsWith('/uploads/') ? msg.mediaUrl.replace('/uploads/', '/api/uploads/') : msg.mediaUrl}
                                  controls
                                  style={{ 
                                    width: isMobile ? 200 : 250,
                                    height: 40,
                                  }}
                                  onError={(e) => {
                                    const target = e.target as HTMLAudioElement;
                                    target.style.display = 'none';
                                    target.parentElement!.innerHTML = '<div style="padding: 10px; text-align: center; color: #888; font-size: 12px;">ไม่สามารถโหลดเสียงได้</div>';
                                  }}
                                />
                              </div>
                            ) : msg.messageType === 'file' && msg.mediaUrl ? (
                              <div style={{
                                padding: '12px 16px',
                                borderRadius: 12,
                                background: colors.bubbleIncoming,
                                border: `1px solid ${colors.border}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                              }}>
                                <span style={{ fontSize: 24 }}>📎</span>
                                <a 
                                  href={msg.mediaUrl.startsWith('/uploads/') ? msg.mediaUrl.replace('/uploads/', '/api/uploads/') : msg.mediaUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  style={{ color: colors.accent, textDecoration: 'none' }}
                                >
                                  ดาวน์โหลดไฟล์
                                </a>
                              </div>
                            ) : (
                              <div style={{
                                padding: '10px 14px',
                                borderRadius: isAgent ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                background: isAgent ? colors.bubbleOutgoing : colors.bubbleIncoming,
                                border: isAgent ? 'none' : `1px solid ${colors.border}`,
                                color: isAgent ? '#fff' : colors.textPrimary,
                                boxShadow: colors.shadow,
                              }}>
                                {renderMessageContent(msg)}
                              </div>
                            )}
                          </div>
                          
                          {isAgent && showTime && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                              <span style={{ fontSize: 10, color: colors.textMuted }}>
                                {msg.status === 'read' ? 'Read' : msg.status === 'sent' ? 'Sent' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {showTime && (
                          <div style={{ marginTop: 4, marginLeft: isAgent ? 0 : 40, textAlign: isAgent ? 'right' : 'left' }}>
                            <span style={{ fontSize: 10, color: colors.textMuted }}>
                              {new Date(msg.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {selectedRoom && typingUsers[selectedRoom] && (
                    <TypingIndicator userName={typingUsers[selectedRoom].userName} />
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Quick Replies - hidden on mobile */}
            {showQuickReplies && !isMobile && (
              <div style={{ padding: isMobile ? '10px 12px' : '12px 20px', background: colors.bgSecondary, borderTop: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase' }}>Quick Replies</span>
                  <button onClick={() => setShowQuickReplies(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer' }}><X size={14} /></button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {quickReplies.map((reply) => (
                    <button key={reply.id} onClick={() => sendMessage(reply.label)} style={{
                      padding: '8px 12px', borderRadius: 8,
                      background: colors.bgTertiary, border: `1px solid ${colors.border}`,
                      color: colors.textPrimary, fontSize: 12, cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = colors.bgHover; e.currentTarget.style.borderColor = colors.accent; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = colors.bgTertiary; e.currentTarget.style.borderColor = colors.border; }}
                    >
                      {reply.icon} {reply.label.substring(0, 30)}...
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div style={{ padding: isMobile ? '10px 12px' : '12px 20px', background: colors.bgSecondary, borderTop: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase' }}>Emoji</span>
                  <button onClick={() => setShowEmojiPicker(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer' }}><X size={14} /></button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? 6 : 4 }}>
                  {commonEmojis.map((emoji, i) => (
                    <button 
                      key={i} 
                      onClick={() => { setMessage(prev => prev + emoji); setShowEmojiPicker(false); }}
                      style={{
                        width: isMobile ? 38 : 32, height: isMobile ? 38 : 32, borderRadius: 6, border: 'none',
                        background: colors.bgTertiary, fontSize: isMobile ? 20 : 18, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'transform 0.1s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div style={{ padding: isMobile ? '10px 12px' : '14px 20px', background: colors.bgSecondary, borderTop: `1px solid ${colors.border}` }}>
              {!isMobile && (
                <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 8 }}>
                  <kbd style={{ padding: '2px 6px', background: colors.bgTertiary, borderRadius: 4, fontSize: 10 }}>Enter</kbd> to send
                  <span style={{ margin: '0 6px' }}>•</span>
                  <kbd style={{ padding: '2px 6px', background: colors.bgTertiary, borderRadius: 4, fontSize: 10 }}>Shift + Enter</kbd> for new line
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: isMobile ? 8 : 12 }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={message}
                    onChange={handleInputChange}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(message); } }}
                    placeholder="Type your message..."
                    style={{
                      width: '100%', height: isMobile ? 40 : 44, padding: '0 14px',
                      borderRadius: 8, border: `1px solid ${colors.border}`,
                      background: colors.bgInput, color: colors.textPrimary,
                      fontSize: isMobile ? 16 : 14, outline: 'none',
                      transition: 'border-color 0.15s ease',
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = colors.accent}
                    onBlur={(e) => e.currentTarget.style.borderColor = colors.border}
                  />
                </div>
                <button
                  onClick={() => sendMessage(message)}
                  disabled={!message.trim() || isSending}
                  style={{
                    padding: isMobile ? '10px 14px' : '12px 20px', borderRadius: 8, border: 'none',
                    background: message.trim() && !isSending ? colors.accent : colors.bgTertiary,
                    color: message.trim() && !isSending ? '#fff' : colors.textMuted,
                    fontSize: 13, fontWeight: 600,
                    cursor: message.trim() && !isSending ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isSending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : isMobile ? <Send size={18} /> : <><Send size={15} /> Send</>}
                </button>
              </div>
              
              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 4, marginTop: isMobile ? 8 : 10 }}>
                <button 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  style={{ 
                    width: 34, height: 34, borderRadius: 6, border: 'none',
                    background: showEmojiPicker ? colors.accentLight : 'transparent',
                    color: showEmojiPicker ? colors.accent : colors.textMuted,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Smile size={18} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  style={{ display: 'none' }}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  style={{ 
                    width: 34, height: 34, borderRadius: 6, border: 'none', 
                    background: isUploading ? colors.accentLight : 'transparent', 
                    color: isUploading ? colors.accent : colors.textMuted, 
                    cursor: isUploading ? 'not-allowed' : 'pointer', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center' 
                  }}
                >
                  {isUploading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Paperclip size={18} />}
                </button>
                {!isMobile && (
                  <button 
                    onClick={() => setShowQuickReplies(!showQuickReplies)}
                    style={{ 
                      width: 34, height: 34, borderRadius: 6, border: 'none',
                      background: showQuickReplies ? colors.accentLight : 'transparent',
                      color: showQuickReplies ? colors.accent : colors.textMuted,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Plus size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* RIGHT PANEL - Hidden on mobile/tablet/small desktop */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {showRightPanel && !isMobile && !isTablet && !isSmallDesktop && (
            <div style={{ 
              width: 300, 
              minWidth: 300,
              maxWidth: 300,
              flexShrink: 0,
              background: colors.bgSecondary, 
              borderLeft: `1px solid ${colors.border}`,
              display: 'flex', flexDirection: 'column', 
              overflowY: 'auto',
            }}>
              {/* Panel Header with Close Button */}
              <div style={{ 
                padding: '14px 20px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                borderBottom: `1px solid ${colors.border}`,
                background: colors.bgSecondary,
                minHeight: 69,
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>Customer Info</span>
                <button
                  onClick={() => setSelectedRoom(null)}
                  title="Close Chat"
                  style={{
                    width: 32, height: 32, borderRadius: 6,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: colors.danger + '15',
                    border: `1px solid ${colors.danger}30`,
                    color: colors.danger,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.danger + '25';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = colors.danger + '15';
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Profile Section */}
              <div style={{ padding: '28px 20px', textAlign: 'center', borderBottom: `1px solid ${colors.border}` }}>
                {selectedRoomData.pictureUrl ? (
                  <img src={selectedRoomData.pictureUrl} alt="" style={{ 
                    width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
                    border: `3px solid ${colors.accent}`, marginBottom: 14,
                  }} />
                ) : (
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%', margin: '0 auto 14px',
                    background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentHover} 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 28, fontWeight: 600,
                  }}>
                    {selectedRoomData.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.textPrimary, margin: '0 0 4px 0' }}>
                  {selectedRoomData.displayName}
                </h3>
                <p style={{ fontSize: 12, color: colors.textMuted, margin: 0 }}>
                  {selectedRoomData.statusMessage || 'LINE User'}
                </p>
              </div>

              {/* Tags Section */}
              <div style={{ padding: 20, borderBottom: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>Tags</span>
                  <button 
                    onClick={() => setShowTagInput(!showTagInput)}
                    style={{ 
                      width: 28, height: 28, borderRadius: 6, border: 'none',
                      background: showTagInput ? colors.accentLight : colors.bgTertiary, 
                      color: colors.accent,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                
                {/* Existing Tags */}
                {selectedRoomData.tags && selectedRoomData.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {selectedRoomData.tags.map((tag, idx) => (
                      <div key={idx} style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '4px 8px', borderRadius: 12,
                        background: colors.accentLight, border: `1px solid ${colors.accent}30`,
                        fontSize: 11, fontWeight: 500, color: colors.accent,
                      }}>
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          style={{
                            width: 14, height: 14, borderRadius: '50%', border: 'none',
                            background: 'transparent', color: colors.accent,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: 0,
                          }}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Tag Input */}
                {showTagInput && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                      <input
                        type="text"
                        placeholder="New tag..."
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newTag.trim()) {
                            addTag(newTag.trim());
                            setNewTag('');
                          }
                        }}
                        style={{
                          flex: 1, padding: '6px 10px', borderRadius: 6,
                          border: `1px solid ${colors.border}`,
                          background: colors.bgInput, color: colors.textPrimary,
                          fontSize: 12, outline: 'none',
                        }}
                      />
                      <button
                        onClick={() => { if (newTag.trim()) { addTag(newTag.trim()); setNewTag(''); } }}
                        style={{
                          padding: '6px 12px', borderRadius: 6,
                          background: colors.accent, border: 'none',
                          color: '#fff', fontSize: 12, fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        Add
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {predefinedTags.filter(t => !selectedRoomData.tags?.includes(t)).map((tag) => (
                        <button
                          key={tag}
                          onClick={() => addTag(tag)}
                          style={{
                            padding: '4px 8px', borderRadius: 12,
                            background: colors.bgTertiary, border: `1px solid ${colors.border}`,
                            color: colors.textSecondary, fontSize: 10, fontWeight: 500,
                            cursor: 'pointer', transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.accent; e.currentTarget.style.color = colors.accent; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.textSecondary; }}
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {(!selectedRoomData.tags || selectedRoomData.tags.length === 0) && !showTagInput && (
                  <div style={{ 
                    padding: 16, borderRadius: 8,
                    border: `1px dashed ${colors.border}`,
                    background: colors.bgPrimary, textAlign: 'center',
                  }}>
                    <Tag size={20} style={{ color: colors.textMuted, marginBottom: 8 }} />
                    <p style={{ fontSize: 12, color: colors.textMuted, margin: '0 0 10px 0' }}>
                      Use tags to organize chats
                    </p>
                    <button 
                      onClick={() => setShowTagInput(true)}
                      style={{ 
                        background: colors.accent, border: 'none', color: '#fff',
                        fontSize: 12, fontWeight: 500, cursor: 'pointer',
                        padding: '6px 14px', borderRadius: 6,
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <Plus size={14} /> Add tags
                    </button>
                  </div>
                )}
              </div>

              {/* Assign Section */}
              <div style={{ padding: 20, borderBottom: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>Assigned to</span>
                  <div style={{ 
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', borderRadius: 6,
                    background: colors.bgTertiary,
                  }}>
                    <div style={{ 
                      width: 28, height: 28, borderRadius: '50%',
                      background: colors.accent,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 11, fontWeight: 600,
                    }}>
                      {currentUser?.name?.charAt(0) || 'A'}
                    </div>
                    <span style={{ fontSize: 13, color: colors.textPrimary }}>{currentUser?.name || 'Agent'}</span>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>Notes</span>
                  <button 
                    onClick={() => setShowNoteInput(!showNoteInput)}
                    style={{ 
                      width: 28, height: 28, borderRadius: 6, border: 'none',
                      background: showNoteInput ? colors.accentLight : colors.bgTertiary, 
                      color: colors.accent,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                
                {/* Add Note Input */}
                {showNoteInput && (
                  <div style={{ marginBottom: 12 }}>
                    <textarea
                      placeholder="Write a note..."
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      style={{
                        width: '100%', height: 80, padding: 10, borderRadius: 8,
                        border: `1px solid ${colors.border}`,
                        background: colors.bgInput, color: colors.textPrimary,
                        fontSize: 12, outline: 'none', resize: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button
                        onClick={() => { setShowNoteInput(false); setNewNoteContent(''); }}
                        style={{
                          flex: 1, padding: '8px', borderRadius: 6,
                          background: colors.bgTertiary, border: `1px solid ${colors.border}`,
                          color: colors.textSecondary, fontSize: 12, fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={addNote}
                        disabled={isAddingNote || !newNoteContent.trim()}
                        style={{
                          flex: 1, padding: '8px', borderRadius: 6,
                          background: colors.accent, border: 'none',
                          color: '#fff', fontSize: 12, fontWeight: 500,
                          cursor: isAddingNote || !newNoteContent.trim() ? 'not-allowed' : 'pointer',
                          opacity: isAddingNote || !newNoteContent.trim() ? 0.6 : 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                        }}
                      >
                        {isAddingNote && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                        Save Note
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Notes List */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {roomNotes.length > 0 ? (
                    roomNotes.map((note) => (
                      <div key={note.id} style={{ 
                        padding: 12, borderRadius: 8, marginBottom: 8,
                        background: colors.bgPrimary, border: `1px solid ${colors.border}`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 11, color: colors.textMuted }}>
                            {note.createdBy} • {formatTime(note.createdAt)}
                          </span>
                          <button
                            onClick={() => deleteNote(note.id)}
                            style={{
                              width: 20, height: 20, borderRadius: 4, border: 'none',
                              background: 'transparent', color: colors.danger,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              opacity: 0.6, transition: 'opacity 0.15s ease',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <p style={{ fontSize: 12, color: colors.textPrimary, margin: 0, lineHeight: 1.5 }}>
                          {note.content}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div style={{ 
                      padding: 16, borderRadius: 8,
                      background: colors.bgPrimary, border: `1px solid ${colors.border}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                        <FileEdit size={18} style={{ color: colors.info, flexShrink: 0, marginTop: 2 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>Keep records</span>
                      </div>
                      <p style={{ fontSize: 12, color: colors.textMuted, margin: 0, lineHeight: 1.5 }}>
                        Record info about this user and leave notes for your team.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Actions Section */}
              <div style={{ padding: 20, borderTop: `1px solid ${colors.border}` }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary, display: 'block', marginBottom: 12 }}>
                  Actions
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    onClick={() => togglePinRoom(selectedRoom)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 8,
                      background: selectedRoomData.isPinned ? colors.accentLight : colors.bgPrimary,
                      border: `1px solid ${selectedRoomData.isPinned ? colors.accent + '50' : colors.border}`,
                      color: selectedRoomData.isPinned ? colors.accent : colors.textPrimary,
                      fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      transition: 'all 0.15s ease', textAlign: 'left',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = selectedRoomData.isPinned ? colors.accentLight : colors.bgHover}
                    onMouseLeave={(e) => e.currentTarget.style.background = selectedRoomData.isPinned ? colors.accentLight : colors.bgPrimary}
                  >
                    <Pin size={16} style={{ transform: selectedRoomData.isPinned ? 'rotate(-45deg)' : 'none' }} />
                    {selectedRoomData.isPinned ? 'Unpin Chat' : 'Pin Chat'}
                  </button>
                  
                  <button
                    onClick={() => toggleMuteRoom(selectedRoom)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 8,
                      background: selectedRoomData.isMuted ? colors.warning + '15' : colors.bgPrimary,
                      border: `1px solid ${selectedRoomData.isMuted ? colors.warning + '50' : colors.border}`,
                      color: selectedRoomData.isMuted ? colors.warning : colors.textPrimary,
                      fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      transition: 'all 0.15s ease', textAlign: 'left',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = selectedRoomData.isMuted ? colors.warning + '15' : colors.bgHover}
                    onMouseLeave={(e) => e.currentTarget.style.background = selectedRoomData.isMuted ? colors.warning + '15' : colors.bgPrimary}
                  >
                    {selectedRoomData.isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    {selectedRoomData.isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
                  </button>
                  
                  <button
                    onClick={() => archiveRoom(selectedRoom)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 8,
                      background: colors.bgPrimary,
                      border: `1px solid ${colors.border}`,
                      color: colors.textSecondary,
                      fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      transition: 'all 0.15s ease', textAlign: 'left',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = colors.bgHover}
                    onMouseLeave={(e) => e.currentTarget.style.background = colors.bgPrimary}
                  >
                    <Bookmark size={16} />
                    Archive Chat
                  </button>
                  
                  {selectedRoomData.status === 'spam' ? (
                    <button
                      onClick={() => unmarkSpam(selectedRoom)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', borderRadius: 8,
                        background: colors.accent + '15',
                        border: `1px solid ${colors.accent}50`,
                        color: colors.accent,
                        fontSize: 13, fontWeight: 500, cursor: 'pointer',
                        transition: 'all 0.15s ease', textAlign: 'left',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = colors.accent + '25'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = colors.accent + '15'; }}
                    >
                      <Check size={16} />
                      Not Spam
                    </button>
                  ) : (
                    <button
                      onClick={() => markAsSpam(selectedRoom)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', borderRadius: 8,
                        background: colors.bgPrimary,
                        border: `1px solid ${colors.border}`,
                        color: colors.warning,
                        fontSize: 13, fontWeight: 500, cursor: 'pointer',
                        transition: 'all 0.15s ease', textAlign: 'left',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = colors.warning + '15'; e.currentTarget.style.borderColor = colors.warning + '50'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = colors.bgPrimary; e.currentTarget.style.borderColor = colors.border; }}
                    >
                      <AlertTriangle size={16} />
                      Mark as Spam
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
                        deleteRoom(selectedRoom, true);
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 8,
                      background: colors.bgPrimary,
                      border: `1px solid ${colors.border}`,
                      color: colors.danger,
                      fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      transition: 'all 0.15s ease', textAlign: 'left',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = colors.danger + '10'; e.currentTarget.style.borderColor = colors.danger + '30'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = colors.bgPrimary; e.currentTarget.style.borderColor = colors.border; }}
                  >
                    <Trash2 size={16} />
                    Delete Chat
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Empty State - shown when no room selected */
        <div style={{
          flex: 1, 
          display: isMobile ? (showMobileSidebar ? 'none' : 'flex') : 'flex', 
          flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: colors.bgPrimary,
          padding: 20,
        }}>
          {isMobile && (
            <button
              onClick={() => setShowMobileSidebar(true)}
              style={{
                position: 'absolute',
                top: 16, left: 16,
                padding: 10, borderRadius: 8,
                background: colors.bgSecondary, border: `1px solid ${colors.border}`,
                color: colors.accent, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <MessageCircle size={isMobile ? 40 : 48} style={{ color: colors.textMuted, marginBottom: 16 }} />
          <h2 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600, color: colors.textPrimary, margin: '0 0 8px 0', textAlign: 'center' }}>
            Select a conversation
          </h2>
          <p style={{ fontSize: isMobile ? 12 : 13, color: colors.textMuted, textAlign: 'center', maxWidth: 240, margin: '0 0 20px 0' }}>
            Choose a chat from the list to start messaging
          </p>
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: 6,
            color: isConnected ? colors.accent : colors.warning,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor' }} />
            <span style={{ fontSize: 12, fontWeight: 500 }}>
              {isConnected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes typingDot { 0%, 60%, 100% { opacity: 0.3; } 30% { opacity: 1; } }
        * { scrollbar-width: thin; scrollbar-color: ${colors.border} transparent; }
        *::-webkit-scrollbar { width: 6px; }
        *::-webkit-scrollbar-track { background: transparent; }
        *::-webkit-scrollbar-thumb { background: ${colors.border}; border-radius: 3px; }
        
        /* Mobile specific styles */
        @media (max-width: 768px) {
          input, textarea, button { 
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
          }
          input[type="text"] {
            font-size: 16px !important; /* Prevent iOS zoom on input focus */
          }
        }
        
        /* Safe area for mobile devices with notch */
        @supports (padding: env(safe-area-inset-bottom)) {
          .chat-input-area {
            padding-bottom: calc(14px + env(safe-area-inset-bottom));
          }
        }
        
        /* Smooth scrolling */
        .messages-container {
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }
        
        /* Mobile sidebar overlay backdrop */
        @media (max-width: 768px) {
          .mobile-sidebar-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 40;
          }
        }
      `}} />
    </div>
  );
}
