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

interface Message {
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
  lastMessage?: Message;
  lastMessageAt?: string;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  tags: string[];
  status: 'active' | 'archived' | 'blocked';
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
  const [selectedRoom, setSelectedRoom] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedChatRoom');
    }
    return null;
  });
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'pinned'>('all');
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ [roomId: string]: { userName: string; timeout: NodeJS.Timeout } }>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; username: string } | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  
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
      // Note: The actual unreadCount from server will come via room-update event
      if (selectedRoomRef.current !== msg.roomId && msg.sender === 'user') {
        // Increment locally for immediate UI feedback
        room.unreadCount = (room.unreadCount || 0) + 1;
        playSound();
      }
      
      // Move room to top
      updatedRooms.splice(roomIndex, 1);
      updatedRooms.unshift(room);
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
  const handleRoomUpdate = useCallback((data: { id: string; lastMessage?: Message; lastMessageAt?: string; unreadCount?: number }) => {
    setRooms(prev => {
      const roomIndex = prev.findIndex(r => r.id === data.id);
      if (roomIndex === -1) return prev;
      
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
  }, []);

  const { isConnected, connectionState, reconnect, sendTyping, markAsRead, emitRoomRead } = useSocket({
    onNewMessage: handleNewMessage,
    onUserTyping: handleTypingEvent,
    onRoomReadUpdate: handleRoomReadSync,
    onRoomUpdate: handleRoomUpdate,
  });

  // Store sendTyping in ref
  useEffect(() => {
    sendTypingRef.current = sendTyping;
  }, [sendTyping]);

  // Initial load
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Load messages when room changes
  useEffect(() => {
    if (selectedRoom) {
      localStorage.setItem('selectedChatRoom', selectedRoom);
      selectedRoomRef.current = selectedRoom;
      fetchMessages(selectedRoom);
      
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

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    const emojiMap: { [key: string]: string } = {
      // Thai
      '(ยิ้ม)': '😊', '(หัวเราะ)': '😂', '(ร้องไห้)': '😢', '(โกรธ)': '😠', '(รัก)': '❤️',
      '(ถูกใจ)': '👍', '(ไม่ถูกใจ)': '👎', '(ตกใจ)': '😱', '(เศร้า)': '😞', '(สับสน)': '😕',
      // English
      '(cool)': '😎', '(kiss)': '😘', '(wink)': '😉', '(happy)': '😄', '(sad)': '😔',
      '(angry)': '😡', '(love)': '💕', '(heart)': '❤️', '(star)': '⭐', '(fire)': '🔥',
      '(ok)': '👌', '(pray)': '🙏', '(clap)': '👏', '(muscle)': '💪', '(peace)': '✌️',
      // Moon & Brown (LINE Characters)
      '(funny Moon)': '🌝', '(laugh Moon)': '😆', '(cry Moon)': '😭', '(angry Moon)': '😤',
      '(love Moon)': '😍', '(shock Moon)': '😲', '(sleepy Moon)': '😴', '(cool Moon)': '😎',
      '(happy Moon)': '😊', '(sad Moon)': '😢', '(wink Moon)': '😜', '(shy Moon)': '🙈',
      '(Brown)': '🐻', '(Cony)': '🐰', '(Sally)': '🐥', '(James)': '👱', '(Boss)': '🦁',
      '(funny Brown)': '🐻', '(laugh Brown)': '🐻', '(love Brown)': '🐻', '(cry Brown)': '🐻',
      '(funny Cony)': '🐰', '(laugh Cony)': '🐰', '(love Cony)': '🐰', '(cry Cony)': '🐰',
      // More expressions
      '(lol)': '🤣', '(omg)': '😱', '(wow)': '🤩', '(yay)': '🥳', '(no)': '🙅',
      '(yes)': '🙆', '(think)': '🤔', '(idea)': '💡', '(sleep)': '😴', '(sick)': '🤒',
      '(money)': '💰', '(gift)': '🎁', '(party)': '🎉', '(cake)': '🎂', '(coffee)': '☕',
    };
    let result = text;
    for (const [pattern, emoji] of Object.entries(emojiMap)) {
      result = result.replace(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), emoji);
    }
    if (result.startsWith('[sticker')) {
      const match = result.match(/packageId=(\d+).*?stickerId=(\d+)/);
      if (match) return `📦 Sticker`;
    }
    return result;
  };

  // Emoji list
  const commonEmojis = ['😊', '😂', '❤️', '👍', '🙏', '😍', '🎉', '🔥', '✨', '💯', '😢', '😱', '🤔', '👏', '💪', '🙌', '😎', '🥳', '💕', '✅', '❌', '⭐', '🌟', '💰', '📱', '💳', '🧾', '📝', '🎁', '🏆'];

  // Typing indicator component - shows who is typing
  const TypingIndicator = ({ userName }: { userName?: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: colors.bgTertiary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <User size={16} style={{ color: colors.textMuted }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {userName && (
          <span style={{ fontSize: 11, color: colors.textMuted, marginLeft: 4 }}>{userName}</span>
        )}
        <div style={{ padding: '12px 16px', borderRadius: 18, background: colors.bubbleIncoming, border: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: colors.textMuted }}>กำลังพิมพ์</span>
            <div style={{ display: 'flex', gap: 3 }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: colors.accent, animation: `typingDot 1.4s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
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
      borderRadius: 12,
      overflow: 'hidden',
      border: `1px solid ${colors.border}`,
      boxShadow: colors.shadow,
    }}>
      
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* LEFT SIDEBAR - Chat List */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div style={{ 
        width: 340, 
        background: colors.bgSecondary, 
        borderRight: `1px solid ${colors.border}`,
        display: 'flex', 
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: 20 }}>
          {/* Filter & Search */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {/* Filter Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', borderRadius: 8,
                  background: colors.bgTertiary,
                  border: `1px solid ${colors.border}`,
                  color: colors.textPrimary,
                  fontSize: 14, fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Filter size={15} style={{ color: colors.accent }} />
                <span>{filterStatus === 'all' ? 'All' : filterStatus === 'unread' ? 'Unread' : 'Pinned'}</span>
                <ChevronDown size={14} style={{ color: colors.textMuted }} />
              </button>
              
              {showFilterDropdown && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: 4,
                  background: colors.bgSecondary, border: `1px solid ${colors.border}`,
                  borderRadius: 8, boxShadow: colors.shadowMd, zIndex: 100,
                  minWidth: 120, overflow: 'hidden',
                }}>
                  {['all', 'unread', 'pinned'].map((status) => (
                    <button
                      key={status}
                      onClick={() => { setFilterStatus(status as 'all' | 'unread' | 'pinned'); setShowFilterDropdown(false); }}
                      style={{
                        display: 'block', width: '100%', padding: '10px 14px',
                        background: filterStatus === status ? colors.accentLight : 'transparent',
                        border: 'none', color: filterStatus === status ? colors.accent : colors.textPrimary,
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
          ) : rooms.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <MessageCircle size={32} style={{ color: colors.textMuted, marginBottom: 12 }} />
              <p style={{ fontSize: 13, color: colors.textMuted, margin: 0 }}>No conversations</p>
            </div>
          ) : (
            rooms.map((room) => (
              <div
                key={room.id}
                onClick={() => {
                  setRooms(prev => prev.map(r => r.id === room.id ? { ...r, unreadCount: 0 } : r));
                  setSelectedRoom(room.id);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 20px', cursor: 'pointer',
                  background: selectedRoom === room.id ? colors.bgActive : 'transparent',
                  borderLeft: selectedRoom === room.id ? `3px solid ${colors.accent}` : '3px solid transparent',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (selectedRoom !== room.id) e.currentTarget.style.background = colors.bgHover;
                }}
                onMouseLeave={(e) => {
                  if (selectedRoom !== room.id) e.currentTarget.style.background = 'transparent';
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
                      background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentHover} 100%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 18, fontWeight: 600,
                    }}>
                      {room.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 12, height: 12, borderRadius: '50%',
                    background: colors.online,
                    border: `2px solid ${colors.bgSecondary}`,
                  }} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ 
                      fontWeight: room.unreadCount > 0 ? 600 : 500,
                      color: colors.textPrimary, fontSize: 14,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      maxWidth: 160,
                    }}>
                      {room.displayName}
                    </span>
                    <span style={{ 
                      fontSize: 11, 
                      color: room.unreadCount > 0 ? colors.accent : colors.textMuted,
                      fontWeight: room.unreadCount > 0 ? 600 : 400,
                    }}>
                      {room.lastMessageAt && formatTime(room.lastMessageAt)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ 
                      fontSize: 12, color: colors.textMuted,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      flex: 1,
                    }}>
                      {typingUsers[room.id] ? (
                        <span style={{ color: colors.accent, fontStyle: 'italic' }}>typing...</span>
                      ) : (
                        <>
                          {room.lastMessage?.sender === 'agent' && <span style={{ color: colors.accent }}>You: </span>}
                          {room.lastMessage?.content 
                            ? convertStickerText(room.lastMessage.content).substring(0, 30)
                            : 'Start conversation'}
                        </>
                      )}
                    </span>
                    {room.unreadCount > 0 && (
                      <span style={{
                        minWidth: 20, height: 20, borderRadius: 10,
                        background: colors.accent, color: '#fff',
                        fontSize: 11, fontWeight: 600,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 6px', marginLeft: 8,
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
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
            {/* Chat Header */}
            <div style={{
              padding: '14px 20px',
              background: colors.bgSecondary,
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              minHeight: 69,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {selectedRoomData.pictureUrl ? (
                  <img src={selectedRoomData.pictureUrl} alt="" style={{ 
                    width: 40, height: 40, borderRadius: '50%', objectFit: 'cover',
                  }} />
                ) : (
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentHover} 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 16, fontWeight: 600,
                  }}>
                    {selectedRoomData.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>
                    {selectedRoomData.displayName}
                  </h3>
                  <p style={{ fontSize: 12, color: colors.online, margin: 0, fontWeight: 500 }}>
                    ● Online
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{
                  padding: '8px 14px', borderRadius: 6,
                  background: colors.bgTertiary, border: `1px solid ${colors.border}`,
                  color: colors.info, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = colors.bgHover}
                onMouseLeave={(e) => e.currentTarget.style.background = colors.bgTertiary}
                >
                  <Clock size={14} /> Follow up
                </button>
                <button style={{
                  padding: '8px 14px', borderRadius: 6,
                  background: colors.bgTertiary, border: `1px solid ${colors.border}`,
                  color: colors.accent, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = colors.accentLight}
                onMouseLeave={(e) => e.currentTarget.style.background = colors.bgTertiary}
                >
                  <Check size={14} /> Resolve
                </button>
                <button style={{
                  padding: '8px 14px', borderRadius: 6,
                  background: colors.bgTertiary, border: `1px solid ${colors.border}`,
                  color: colors.textSecondary, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = colors.bgHover}
                onMouseLeave={(e) => e.currentTarget.style.background = colors.bgTertiary}
                >
                  <Search size={14} /> Search
                </button>
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
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: colors.bgPrimary }}>
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
                  {messages.map((msg, idx) => {
                    const isAgent = msg.sender === 'agent';
                    const showAvatar = !isAgent && (idx === 0 || messages[idx - 1]?.sender !== 'user');
                    const showTime = idx === messages.length - 1 || 
                      messages[idx + 1]?.sender !== msg.sender ||
                      new Date(messages[idx + 1]?.createdAt).getTime() - new Date(msg.createdAt).getTime() > 300000;
                    
                    return (
                      <div key={msg.id} style={{ marginBottom: showTime ? 12 : 2 }}>
                        <div style={{ display: 'flex', justifyContent: isAgent ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}>
                          {!isAgent && (
                            <div style={{ width: 32, flexShrink: 0 }}>
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
                          
                          <div style={{ maxWidth: '65%' }}>
                            {msg.messageType === 'sticker' ? (
                              <div>{renderSticker(msg.packageId, msg.stickerId)}</div>
                            ) : msg.messageType === 'image' ? (
                              <img src={msg.mediaUrl} alt="" style={{ maxWidth: 240, borderRadius: 12 }} />
                            ) : msg.content?.startsWith('[sticker') ? (
                              <div style={{ fontSize: 40 }}>{convertStickerText(msg.content || '')}</div>
                            ) : msg.content && /^\([a-zA-Z\s]+\)(\([a-zA-Z\s]+\))*$/.test(msg.content.trim()) ? (
                              <div style={{ fontSize: 40 }}>{convertStickerText(msg.content || '')}</div>
                            ) : (
                              <div style={{
                                padding: '10px 14px',
                                borderRadius: isAgent ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                background: isAgent ? colors.bubbleOutgoing : colors.bubbleIncoming,
                                border: isAgent ? 'none' : `1px solid ${colors.border}`,
                                color: isAgent ? '#fff' : colors.textPrimary,
                                boxShadow: colors.shadow,
                              }}>
                                <p style={{ fontSize: 14, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{msg.content || ''}</p>
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

            {/* Quick Replies */}
            {showQuickReplies && (
              <div style={{ padding: '12px 20px', background: colors.bgSecondary, borderTop: `1px solid ${colors.border}` }}>
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
              <div style={{ padding: '12px 20px', background: colors.bgSecondary, borderTop: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase' }}>Emoji</span>
                  <button onClick={() => setShowEmojiPicker(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer' }}><X size={14} /></button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {commonEmojis.map((emoji, i) => (
                    <button 
                      key={i} 
                      onClick={() => { setMessage(prev => prev + emoji); setShowEmojiPicker(false); }}
                      style={{
                        width: 32, height: 32, borderRadius: 6, border: 'none',
                        background: colors.bgTertiary, fontSize: 18, cursor: 'pointer',
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
            <div style={{ padding: '14px 20px', background: colors.bgSecondary, borderTop: `1px solid ${colors.border}` }}>
              <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 8 }}>
                <kbd style={{ padding: '2px 6px', background: colors.bgTertiary, borderRadius: 4, fontSize: 10 }}>Enter</kbd> to send
                <span style={{ margin: '0 6px' }}>•</span>
                <kbd style={{ padding: '2px 6px', background: colors.bgTertiary, borderRadius: 4, fontSize: 10 }}>Shift + Enter</kbd> for new line
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={message}
                    onChange={handleInputChange}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(message); } }}
                    placeholder="Type your message..."
                    style={{
                      width: '100%', height: 44, padding: '0 14px',
                      borderRadius: 8, border: `1px solid ${colors.border}`,
                      background: colors.bgInput, color: colors.textPrimary,
                      fontSize: 14, outline: 'none',
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
                    padding: '12px 20px', borderRadius: 8, border: 'none',
                    background: message.trim() && !isSending ? colors.accent : colors.bgTertiary,
                    color: message.trim() && !isSending ? '#fff' : colors.textMuted,
                    fontSize: 13, fontWeight: 600,
                    cursor: message.trim() && !isSending ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isSending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <><Send size={15} /> Send</>}
                </button>
              </div>
              
              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
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
                <button style={{ width: 34, height: 34, borderRadius: 6, border: 'none', background: 'transparent', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Paperclip size={18} />
                </button>
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
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* RIGHT PANEL */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {showRightPanel && (
            <div style={{ 
              width: 320, 
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
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 6,
                    background: colors.danger + '15',
                    border: `1px solid ${colors.danger}30`,
                    color: colors.danger,
                    fontSize: 12, fontWeight: 500,
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
                  <XCircle size={14} /> Close Chat
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
                <div style={{ 
                  padding: 16, borderRadius: 8,
                  border: `1px dashed ${colors.border}`,
                  background: colors.bgPrimary, textAlign: 'center',
                }}>
                  <Tag size={20} style={{ color: colors.textMuted, marginBottom: 8 }} />
                  <p style={{ fontSize: 12, color: colors.textMuted, margin: '0 0 10px 0' }}>
                    Use tags to organize chats
                  </p>
                  <button style={{ 
                    background: colors.accent, border: 'none', color: '#fff',
                    fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    padding: '6px 14px', borderRadius: 6,
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}>
                    <Plus size={14} /> Add tags
                  </button>
                </div>
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
              <div style={{ padding: 20, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>Notes</span>
                  <button style={{ 
                    width: 28, height: 28, borderRadius: 6, border: 'none',
                    background: colors.bgTertiary, color: colors.accent,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Plus size={16} />
                  </button>
                </div>
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
              </div>
            </div>
          )}
        </>
      ) : (
        /* Empty State */
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: colors.bgPrimary,
        }}>
          <MessageCircle size={48} style={{ color: colors.textMuted, marginBottom: 16 }} />
          <h2 style={{ fontSize: 18, fontWeight: 600, color: colors.textPrimary, margin: '0 0 8px 0' }}>
            Select a conversation
          </h2>
          <p style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', maxWidth: 240, margin: '0 0 20px 0' }}>
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
      `}} />
    </div>
  );
}
