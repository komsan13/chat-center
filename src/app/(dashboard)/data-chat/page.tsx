'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, Send, Smile, MoreVertical, Filter,
  Plus, Check, CheckCheck, Pin, X,
  MessageCircle, Settings, Clock,
  Loader2, Paperclip, Image as ImageIcon, FileText, 
  Phone, Video, Bookmark, VolumeX, Volume2, Trash2, AlertTriangle
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSocket } from '@/hooks/useSocket';

interface Message {
  id: string;
  roomId: string;
  lineMessageId?: string;
  messageType: 'text' | 'image' | 'sticker' | 'video' | 'audio' | 'file' | 'location';
  content: string;
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
  recentMessages?: Message[]; // Preloaded messages from API
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
    // Restore selected room from localStorage on mount
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
  
  // Message cache - store messages per room for instant loading
  const messagesCacheRef = useRef<Map<string, Message[]>>(new Map());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Initialize selectedRoomRef from localStorage immediately
  const selectedRoomRef = useRef<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('selectedChatRoom') : null
  );
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundUnlockedRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const sendTypingRef = useRef<((roomId: string, userName: string, isTyping: boolean) => void) | null>(null);

  // Initialize notification audio on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Create Audio element
      notificationAudioRef.current = new Audio('/notification.mp3');
      notificationAudioRef.current.volume = 0.7;
      notificationAudioRef.current.load();
      
      // Unlock audio on first user interaction
      const unlockAudio = () => {
        soundUnlockedRef.current = true;
        // Create AudioContext
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
        // Pre-play to unlock
        if (notificationAudioRef.current) {
          const audio = notificationAudioRef.current;
          audio.volume = 0;
          audio.play().then(() => {
            audio.pause();
            audio.currentTime = 0;
            audio.volume = 0.7;
            console.log('[Audio] Sound unlocked!');
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

  // Fetch current user info
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          // API returns { user: { name, email, ... } }
          const userName = data.user?.name || data.user?.email || data.name || data.username || 'Agent';
          setCurrentUser({ name: userName, username: data.user?.email || data.username || '' });
          console.log('[Chat] Current user:', userName);
        }
      } catch (error) {
        console.error('Failed to fetch current user:', error);
      }
    };
    fetchCurrentUser();
  }, []);

  const selectedRoomData = rooms.find(r => r.id === selectedRoom);

  // Theme Colors - Matching Main Theme Design System
  const colors = useMemo(() => ({
    // Backgrounds - Matching main theme exactly
    bgPrimary: isDark ? '#1D1E24' : '#f8fafc',
    bgSecondary: isDark ? '#23262B' : '#ffffff',
    bgTertiary: isDark ? '#2A313C' : '#f1f5f9',
    bgCard: isDark ? '#23262B' : '#ffffff',
    bgHover: isDark ? '#2A313C' : '#f1f5f9',
    bgActive: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.08)',
    bgChat: isDark ? '#1D1E24' : '#f1f5f9',
    bgInput: isDark ? '#1D1E24' : '#ffffff',
    // Borders - Subtle 1px borders
    border: isDark ? '#2A313C' : '#e2e8f0',
    borderLight: isDark ? '#3A414C' : '#cbd5e1',
    borderAccent: isDark ? 'rgba(34, 197, 94, 0.4)' : 'rgba(34, 197, 94, 0.3)',
    // Typography - High contrast for readability
    textPrimary: isDark ? '#ffffff' : '#1e293b',
    textSecondary: isDark ? 'rgba(255, 255, 255, 0.7)' : '#64748b',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.5)' : '#94a3b8',
    // Brand Colors - Green accent (matching main theme #22c55e)
    accent: '#22c55e',
    accentHover: '#16a34a',
    accentLight: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)',
    accentGradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    // Chat Bubbles
    bubbleAgent: isDark 
      ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
      : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    bubbleUser: isDark ? '#2A313C' : '#ffffff',
    bubbleUserBorder: isDark ? '#3A414C' : '#e2e8f0',
    // Status Colors
    online: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    link: '#3b82f6',
    // Shadows - Very light and subtle
    shadow: isDark 
      ? '0 2px 8px rgba(0,0,0,0.12)'
      : '0 2px 8px rgba(0,0,0,0.04)',
    shadowSm: isDark 
      ? '0 1px 4px rgba(0,0,0,0.08)'
      : '0 1px 4px rgba(0,0,0,0.03)',
    shadowLg: isDark 
      ? '0 4px 12px rgba(0,0,0,0.15)'
      : '0 4px 12px rgba(0,0,0,0.06)',
    shadowInset: isDark
      ? 'inset 0 1px 2px rgba(0,0,0,0.1)'
      : 'inset 0 1px 2px rgba(0,0,0,0.03)',
  }), [isDark]);

  const fetchRooms = useCallback(async () => {
    try {
      const params = new URLSearchParams({ filter: filterStatus });
      if (searchTerm) params.append('search', searchTerm);
      const response = await fetch(`/api/chat/rooms?${params}`);
      if (response.ok) {
        const data = await response.json();
        // ถ้ามี selectedRoom อยู่แล้ว ให้ mark as read ทันที (ไม่ต้องรอ effect)
        const currentRoom = selectedRoomRef.current;
        if (currentRoom) {
          setRooms(data.map((r: ChatRoom) => r.id === currentRoom ? { ...r, unreadCount: 0 } : r));
        } else {
          setRooms(data);
        }
        // Preload cache with recentMessages from API (Telegram-style instant loading)
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
    // Check cache first for instant loading (preloaded from rooms API)
    if (messagesCacheRef.current.has(roomId)) {
      const cached = messagesCacheRef.current.get(roomId)!;
      setMessages(cached);
      setIsLoadingMessages(false);
      // Fetch full messages in background (may have more than preloaded 15)
      fetch(`/api/chat/rooms/${roomId}/messages`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.length > cached.length) {
            messagesCacheRef.current.set(roomId, data);
            setMessages(data);
          }
        })
        .catch(() => {});
      // Mark as read
      fetch(`/api/chat/rooms/${roomId}/messages`, { method: 'POST' }).catch(() => {});
      return;
    }

    setIsLoadingMessages(true);
    try {
      const response = await fetch(`/api/chat/rooms/${roomId}/messages`);
      if (response.ok) {
        const data = await response.json();
        // Cache the messages
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

  // Play notification sound function with Web Audio fallback
  const playSound = useCallback(() => {
    // Try HTML5 Audio first
    if (notificationAudioRef.current && soundUnlockedRef.current) {
      notificationAudioRef.current.currentTime = 0;
      notificationAudioRef.current.play().catch(err => {
        console.log('MP3 play failed, using beep:', err);
        // Fallback to Web Audio API beep
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
    } else if (audioContextRef.current) {
      // Use Web Audio beep as fallback
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
  }, []);

  // Handle typing indicator
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Send typing indicator
    if (selectedRoom && currentUser && sendTypingRef.current) {
      // If not currently typing, send typing start
      if (!isTypingRef.current && value.length > 0) {
        isTypingRef.current = true;
        sendTypingRef.current(selectedRoom, currentUser.name, true);
        console.log('[Typing] Started typing:', currentUser.name);
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to stop typing after 2 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        if (isTypingRef.current && selectedRoom && currentUser && sendTypingRef.current) {
          isTypingRef.current = false;
          sendTypingRef.current(selectedRoom, currentUser.name, false);
          console.log('[Typing] Stopped typing:', currentUser.name);
        }
      }, 2000);
    }
  }, [selectedRoom, currentUser]);

  // Stop typing when message is sent
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTypingRef.current && selectedRoom && currentUser && sendTypingRef.current) {
      isTypingRef.current = false;
      sendTypingRef.current(selectedRoom, currentUser.name, false);
    }
  }, [selectedRoom, currentUser]);

  const { isConnected, connectionState, joinRoom, markAsRead, emitRoomRead, playNotificationSound, reconnect, sendTyping } = useSocket({
    onNewMessage: (msg) => {
      const message: Message = { ...msg, content: msg.content || '' };
      handleNewMessage(message);
      // Update cache with new message
      const cached = messagesCacheRef.current.get(msg.roomId);
      if (cached) {
        if (!cached.some(m => m.id === msg.id)) {
          messagesCacheRef.current.set(msg.roomId, [...cached, message]);
        }
      }
    },
    onNewRoom: (room) => {
      const newRoom: ChatRoom = {
        ...room,
        lastMessage: room.lastMessage ? { ...room.lastMessage, content: room.lastMessage.content || '' } : undefined,
      };
      setRooms(prev => prev.some(r => r.id === newRoom.id) ? prev : [newRoom, ...prev]);
    },
    onUserTyping: ({ roomId, userName, isTyping }) => {
      setTypingUsers(prev => {
        const newState = { ...prev };
        if (isTyping) {
          // Clear existing timeout
          if (newState[roomId]?.timeout) {
            clearTimeout(newState[roomId].timeout);
          }
          // Set new timeout to clear typing after 3 seconds
          const timeout = setTimeout(() => {
            setTypingUsers(p => {
              const updated = { ...p };
              delete updated[roomId];
              return updated;
            });
          }, 3000);
          newState[roomId] = { userName, timeout };
        } else {
          if (newState[roomId]?.timeout) {
            clearTimeout(newState[roomId].timeout);
          }
          delete newState[roomId];
        }
        return newState;
      });
    },
    // Real-time sync when another browser marks room as read
    onRoomReadUpdate: ({ roomId }) => {
      setRooms(prev => prev.map(r => r.id === roomId ? { ...r, unreadCount: 0 } : r));
    },
    enableSound: true,
    currentRoomId: selectedRoom, // Pass current room to skip sound notification
  });

  // Update sendTypingRef when sendTyping changes
  useEffect(() => {
    sendTypingRef.current = sendTyping;
  }, [sendTyping]);

  const handleNewMessage = useCallback((msg: Message) => {
    if (selectedRoomRef.current === msg.roomId) {
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      markAsRead(msg.roomId, [msg.id]);
    }
    setRooms(prev => {
      const idx = prev.findIndex(r => r.id === msg.roomId);
      if (idx === -1) { fetchRooms(); return prev; }
      const updated = [...prev];
      // Only increment unread count for messages from LINE users, not from agents
      const shouldIncrementUnread = msg.sender === 'user' && selectedRoomRef.current !== msg.roomId;
      updated[idx] = {
        ...updated[idx],
        lastMessage: msg,
        lastMessageAt: msg.createdAt,
        unreadCount: selectedRoomRef.current === msg.roomId ? 0 : (shouldIncrementUnread ? updated[idx].unreadCount + 1 : updated[idx].unreadCount),
      };
      return updated.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.lastMessageAt || b.createdAt).getTime() - new Date(a.lastMessageAt || a.createdAt).getTime();
      });
    });
  }, [markAsRead, fetchRooms]);

  useEffect(() => { if (selectedRoom) joinRoom(selectedRoom); }, [selectedRoom, joinRoom]);

  const sendMessage = async (content: string) => {
    if (!selectedRoom || isSending || !content.trim()) return;
    setIsSending(true);
    stopTyping(); // Stop typing when sending message
    
    const now = new Date().toISOString();
    
    // Optimistic UI: add message immediately before server confirms
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      roomId: selectedRoom,
      messageType: 'text',
      content,
      sender: 'agent',
      senderName: currentUser?.name || 'Agent',
      status: 'sending',
      createdAt: now,
    };
    setMessages(prev => [...prev, tempMessage]);
    setMessage('');
    setShowQuickReplies(false);
    setShowEmojiPicker(false);
    
    // Move room to top immediately (optimistic)
    setRooms(prev => {
      const updated = prev.map(r => 
        r.id === selectedRoom 
          ? { ...r, lastMessage: tempMessage, lastMessageAt: now }
          : r
      );
      return updated.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.lastMessageAt || b.createdAt).getTime() - new Date(a.lastMessageAt || a.createdAt).getTime();
      });
    });
    
    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: selectedRoom, messageType: 'text', content }),
      });
      const result = await response.json();
      if (result.success && result.message) {
        // Replace temp message with real one
        setMessages(prev => prev.map(m => m.id === tempMessage.id ? result.message : m));
        // Update cache
        const cached = messagesCacheRef.current.get(selectedRoom);
        if (cached) {
          messagesCacheRef.current.set(selectedRoom, cached.map(m => m.id === tempMessage.id ? result.message : m));
        }
        // Update last message in room list
        setRooms(prev => {
          const updated = prev.map(r => 
            r.id === selectedRoom 
              ? { ...r, lastMessage: result.message, lastMessageAt: result.message.createdAt }
              : r
          );
          return updated.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.lastMessageAt || b.createdAt).getTime() - new Date(a.lastMessageAt || a.createdAt).getTime();
          });
        });
      } else {
        // Remove temp message on failure
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      }
    } catch (error) {
      console.error('Send error:', error);
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'เมื่อวาน';
    if (days < 7) return ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'][date.getDay()];
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  };

  useEffect(() => { fetchRooms(); }, [fetchRooms]);
  
  // เมื่อ selectedRoom เปลี่ยน: fetch messages และ mark as read ทันที + broadcast ไป browser อื่น
  useEffect(() => { 
    if (selectedRoom) {
      // Mark as read ทันทีเมื่อเข้าห้อง (optimistic UI)
      setRooms(prev => prev.map(r => r.id === selectedRoom ? { ...r, unreadCount: 0 } : r));
      // Fetch messages (uses cache for instant loading)
      fetchMessages(selectedRoom); 
      // Broadcast to other browsers that this room has been read
      emitRoomRead(selectedRoom);
    }
  }, [selectedRoom, fetchMessages, emitRoomRead]);
  
  // Scroll to latest message เมื่อ messages เปลี่ยน
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  
  // Save selected room to localStorage and update ref
  useEffect(() => {
    selectedRoomRef.current = selectedRoom;
    if (typeof window !== 'undefined') {
      if (selectedRoom) {
        localStorage.setItem('selectedChatRoom', selectedRoom);
      } else {
        localStorage.removeItem('selectedChatRoom');
      }
    }
  }, [selectedRoom]);

  // LINE Sticker URLs - try multiple formats
  const renderSticker = (packageId?: string, stickerId?: string) => {
    if (!packageId || !stickerId) return null;
    
    // LINE sticker CDN URLs
    const stickerUrls = [
      `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/iPhone/sticker.png`,
      `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/android/sticker.png`,
      `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/PC/sticker.png`,
      `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/ANDROID/sticker.png`,
    ];
    
    return (
      <div style={{ position: 'relative' }}>
        <img
          src={stickerUrls[0]}
          alt={`Sticker ${packageId}/${stickerId}`}
          style={{ 
            width: 144, 
            height: 144, 
            objectFit: 'contain',
            background: 'transparent',
          }}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            const currentIndex = stickerUrls.indexOf(img.src);
            if (currentIndex < stickerUrls.length - 1) {
              img.src = stickerUrls[currentIndex + 1];
            } else {
              // Fallback to emoji representation
              img.style.display = 'none';
              img.parentElement!.innerHTML = `<div style="width:100px;height:100px;display:flex;align-items:center;justify-content:center;font-size:48px;background:${colors.bgTertiary};border-radius:16px">📦</div>`;
            }
          }}
        />
      </div>
    );
  };

  // Emoji list for quick selection
  const commonEmojis = ['😊', '😂', '❤️', '👍', '🙏', '😍', '🎉', '🔥', '✨', '💯', '😢', '😭', '🤔', '😅', '🥰', '💪', '👏', '🙌', '💕', '✅', '❌', '⭐', '🌟', '💰', '📱', '💳', '🏧', '💵', '🧧', '🎁'];

  // Map LINE sticker text to emoji
  const stickerTextToEmoji: { [key: string]: string } = {
    '(tongue)': '😛', '(smile)': '😊', '(laugh)': '😂', '(cry)': '😢', '(crying)': '😭',
    '(love)': '❤️', '(heart)': '💕', '(sad)': '😢', '(angry)': '😠', '(wink)': '😉',
    '(kiss)': '😘', '(hug)': '🤗', '(cool)': '😎', '(sweat)': '😅', '(shy)': '😊',
    '(surprised)': '😮', '(confused)': '😕', '(sleepy)': '😴', '(tired)': '😩',
    '(thumbsup)': '👍', '(thumbsdown)': '👎', '(clap)': '👏', '(pray)': '🙏',
    '(ok)': '👌', '(victory)': '✌️', '(muscle)': '💪', '(wave)': '👋',
    '(crying cony)': '😭🐰', '(อ้อน)': '🥺', '(ขอร้อง)': '🙏😊', '(รักนะ)': '❤️😊',
    '(cony)': '🐰', '(brown)': '🐻', '(moon)': '🌙', '(james)': '👨',
    '(sally)': '🐤', '(boss)': '😎', '(edward)': '🐛', '(leonard)': '🐸',
  };

  // Convert sticker text content to emoji or display
  const convertStickerText = (content: string): string => {
    const lowerContent = content.toLowerCase();
    // Check direct match
    if (stickerTextToEmoji[lowerContent]) {
      return stickerTextToEmoji[lowerContent];
    }
    // Check if content contains sticker pattern
    for (const [pattern, emoji] of Object.entries(stickerTextToEmoji)) {
      if (lowerContent.includes(pattern.replace(/[()]/g, ''))) {
        return emoji;
      }
    }
    // Return original if no match
    return content;
  };

  // Typing indicator component
  const TypingIndicator = () => (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 10,
      padding: '8px 16px',
      marginBottom: 8,
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 12, background: colors.bgTertiary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {selectedRoomData?.pictureUrl ? (
          <img src={selectedRoomData.pictureUrl} alt="" style={{ width: 36, height: 36, borderRadius: 12, objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 14, fontWeight: 600, color: colors.textSecondary }}>
            {selectedRoomData?.displayName.charAt(0)}
          </span>
        )}
      </div>
      <div style={{
        background: colors.bubbleUser,
        boxShadow: colors.shadowSm,
        borderRadius: 16,
        borderTopLeftRadius: 6,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}>
        <span style={{ fontSize: 13, color: colors.textSecondary, marginRight: 4 }}>กำลังพิมพ์</span>
        <div style={{ display: 'flex', gap: 3 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: colors.accent,
                animation: `typingBounce 1.4s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 118px)',
      background: colors.bgPrimary,
      borderRadius: 16,
      overflow: 'hidden',
      border: `1px solid ${colors.border}`,
      boxShadow: colors.shadowSm,
    }}>
      
      {/* LEFT SIDEBAR */}
      <div style={{
        width: 360,
        background: colors.bgSecondary,
        borderRight: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 2,
      }}>
        {/* Header - Premium Design */}
        <div style={{ 
          padding: '16px 20px', 
          background: colors.bgSecondary, 
          borderBottom: `1px solid ${colors.border}`,
        }}>
          {/* Filter Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <button style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
              background: colors.bgTertiary, border: `1px solid ${colors.border}`, borderRadius: 10,
              color: colors.textPrimary, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = colors.bgHover; e.currentTarget.style.borderColor = colors.accent; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = colors.bgTertiary; e.currentTarget.style.borderColor = colors.border; }}
            >
              <Filter size={16} style={{ color: colors.accent }} />
              <span>All</span>
            </button>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: colors.textMuted }} />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%', height: 42, paddingLeft: 42, paddingRight: 16,
                  borderRadius: 10, border: `1px solid ${colors.border}`,
                  background: colors.bgInput, color: colors.textPrimary, fontSize: 14, outline: 'none',
                  transition: 'all 0.2s ease',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = colors.accent; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = colors.border; }}
              />
            </div>
          </div>
          {/* Connection Status */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: colors.textMuted, fontWeight: 500 }}>{rooms.length} conversations</span>
            <div 
              style={{ 
                display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px',
                borderRadius: 20, cursor: connectionState !== 'connected' ? 'pointer' : 'default',
                background: connectionState === 'connected' ? 'rgba(34, 197, 94, 0.1)' : connectionState === 'reconnecting' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                transition: 'all 0.2s ease',
              }}
              onClick={() => { if (connectionState !== 'connected') reconnect(); }}
            >
              <div style={{ 
                width: 8, height: 8, borderRadius: '50%', 
                background: connectionState === 'connected' ? '#22c55e' : connectionState === 'reconnecting' ? '#f59e0b' : '#ef4444',
                animation: connectionState === 'reconnecting' ? 'pulse 1.5s ease-in-out infinite' : 'none',
              }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: connectionState === 'connected' ? '#22c55e' : connectionState === 'reconnecting' ? '#f59e0b' : '#ef4444' }}>
                {connectionState === 'connected' ? 'Live' : connectionState === 'reconnecting' ? 'Reconnecting...' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Chat List - LINE OA Style */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoadingRooms ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <Loader2 size={28} style={{ color: colors.accent, animation: 'spin 1s linear infinite', marginBottom: 12 }} />
              <p style={{ fontSize: 13, color: colors.textMuted, margin: 0 }}>กำลังโหลด...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <MessageCircle size={40} style={{ color: colors.textMuted, marginBottom: 16 }} />
              <p style={{ fontSize: 14, fontWeight: 500, color: colors.textSecondary, margin: '0 0 4px 0' }}>ไม่มีการสนทนา</p>
              <p style={{ fontSize: 13, color: colors.textMuted, margin: 0 }}>รอข้อความใหม่</p>
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
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', cursor: 'pointer',
                  background: selectedRoom === room.id ? colors.bgActive : colors.bgSecondary,
                  borderLeft: selectedRoom === room.id ? `3px solid ${colors.accent}` : '3px solid transparent',
                  transition: 'all 0.2s ease',
                  marginBottom: 2,
                }}
                onMouseEnter={(e) => { 
                  if (selectedRoom !== room.id) {
                    e.currentTarget.style.background = colors.bgHover;
                    e.currentTarget.style.borderLeftColor = colors.accentLight;
                  }
                }}
                onMouseLeave={(e) => { 
                  if (selectedRoom !== room.id) {
                    e.currentTarget.style.background = colors.bgSecondary;
                    e.currentTarget.style.borderLeftColor = 'transparent';
                  }
                }}
              >
                {/* Avatar - Premium Design with Ring */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {room.pictureUrl ? (
                    <div style={{ 
                      padding: 2, 
                      borderRadius: '50%', 
                      background: room.unreadCount > 0 ? colors.accentGradient : 'transparent',
                    }}>
                      <img src={room.pictureUrl} alt={room.displayName} style={{ 
                        width: 50, height: 50, borderRadius: '50%', objectFit: 'cover',
                        border: `2px solid ${colors.bgSecondary}`,
                      }} />
                    </div>
                  ) : (
                    <div style={{
                      width: 54, height: 54, borderRadius: '50%', 
                      background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentHover} 100%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 20, fontWeight: 600,
                      boxShadow: colors.shadowSm,
                    }}>
                      {room.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* Online Indicator */}
                  <div style={{
                    position: 'absolute', bottom: 2, right: 2,
                    width: 14, height: 14, borderRadius: '50%',
                    background: colors.online,
                    border: `2px solid ${colors.bgSecondary}`,
                  }} />
                </div>

                {/* Content - Premium Design */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ 
                      fontWeight: room.unreadCount > 0 ? 700 : 500, 
                      color: colors.textPrimary, 
                      fontSize: 15, 
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170,
                      letterSpacing: '-0.01em',
                    }}>
                      {room.displayName}
                    </span>
                    <span style={{ 
                      fontSize: 12, 
                      color: room.unreadCount > 0 ? colors.accent : colors.textMuted, 
                      flexShrink: 0,
                      fontWeight: room.unreadCount > 0 ? 600 : 400,
                    }}>
                      {room.lastMessageAt && formatTime(room.lastMessageAt)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ 
                      fontSize: 13, 
                      color: typingUsers[room.id] ? colors.accent : colors.textMuted, 
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', 
                      flex: 1,
                      fontWeight: room.unreadCount > 0 ? 500 : 400,
                    }}>
                      {typingUsers[room.id] ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.accent }}>
                          <span style={{ fontStyle: 'italic' }}>typing</span>
                          <span style={{ display: 'inline-flex', gap: 3 }}>
                            {[0, 1, 2].map((i) => (
                              <span key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: colors.accent, animation: `typingBounce 1.4s ease-in-out ${i * 0.15}s infinite`, display: 'inline-block' }} />
                            ))}
                          </span>
                        </span>
                      ) : (
                        <>
                          {room.lastMessage?.sender === 'agent' && <span style={{ color: colors.accent, marginRight: 4 }}>You:</span>}
                          {room.lastMessage?.content 
                            ? (room.lastMessage.content.startsWith('(') || room.lastMessage.content.startsWith('[sticker'))
                              ? convertStickerText(room.lastMessage.content)
                              : room.lastMessage.content
                            : 'Start conversation'}
                        </>
                      )}
                    </span>
                    {room.unreadCount > 0 && (
                      <span style={{
                        minWidth: 22, height: 22, borderRadius: 11,
                        background: colors.accentGradient,
                        color: '#fff', fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 7px',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
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

      {/* MAIN CHAT AREA */}
      {selectedRoom && selectedRoomData ? (
        <>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
            {/* Chat Header - Premium Design */}
            <div style={{
              padding: '16px 24px', 
              background: colors.bgSecondary, 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
              zIndex: 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {selectedRoomData.pictureUrl ? (
                  <div style={{ position: 'relative' }}>
                    <img src={selectedRoomData.pictureUrl} alt={selectedRoomData.displayName} style={{ 
                      width: 44, height: 44, borderRadius: '50%', objectFit: 'cover',
                      boxShadow: colors.shadowSm,
                    }} />
                    <div style={{
                      position: 'absolute', bottom: 0, right: 0,
                      width: 12, height: 12, borderRadius: '50%',
                      background: colors.online,
                      border: `2px solid ${colors.bgSecondary}`,
                    }} />
                  </div>
                ) : (
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', 
                    background: colors.accentGradient,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 18, fontWeight: 600,
                    boxShadow: colors.shadowSm,
                  }}>
                    {selectedRoomData.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.textPrimary, margin: 0, letterSpacing: '-0.01em' }}>{selectedRoomData.displayName}</h3>
                    {!selectedRoomData.isMuted && <Volume2 size={16} style={{ color: colors.textMuted }} />}
                    {selectedRoomData.isMuted && <VolumeX size={16} style={{ color: colors.textMuted }} />}
                  </div>
                  <p style={{ fontSize: 12, color: colors.online, margin: '2px 0 0 0', fontWeight: 500 }}>● Online now</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {/* Action Buttons - Premium Design */}
                <button style={{
                  padding: '10px 18px', borderRadius: 10, border: `1px solid ${colors.border}`,
                  background: colors.bgTertiary, color: colors.link, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = colors.bgHover; e.currentTarget.style.borderColor = colors.link; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = colors.bgTertiary; e.currentTarget.style.borderColor = colors.border; }}
                >
                  <Clock size={15} />
                  Follow up
                </button>
                <button style={{
                  padding: '10px 18px', borderRadius: 10, border: `1px solid ${colors.border}`,
                  background: colors.bgTertiary, color: colors.accent, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = colors.accentLight; e.currentTarget.style.borderColor = colors.accent; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = colors.bgTertiary; e.currentTarget.style.borderColor = colors.border; }}
                >
                  <Check size={15} />
                  Resolve
                </button>
                <button style={{
                  padding: '10px 18px', borderRadius: 10, border: `1px solid ${colors.border}`,
                  background: colors.bgTertiary, color: colors.textSecondary, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = colors.bgHover; e.currentTarget.style.borderColor = colors.textMuted; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = colors.bgTertiary; e.currentTarget.style.borderColor = colors.border; }}
                >
                  <Search size={15} />
                  Search
                </button>
                <button
                  onClick={() => setShowRightPanel(!showRightPanel)}
                  style={{
                    width: 42, height: 42, borderRadius: 10, border: `1px solid ${colors.border}`,
                    background: showRightPanel ? colors.accentLight : colors.bgTertiary, 
                    color: showRightPanel ? colors.accent : colors.textSecondary, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => { if (!showRightPanel) { e.currentTarget.style.background = colors.bgHover; } }}
                  onMouseLeave={(e) => { if (!showRightPanel) { e.currentTarget.style.background = colors.bgTertiary; } }}
                >
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Messages - LINE OA Style */}
            <div style={{ 
              flex: 1, overflowY: 'auto', padding: '20px 24px',
              background: colors.bgChat,
            }}>
              {isLoadingMessages ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                  <Loader2 size={24} style={{ color: colors.accent, animation: 'spin 1s linear infinite' }} />
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                  <p style={{ fontSize: 14, color: colors.textMuted, margin: 0 }}>ยังไม่มีข้อความ</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {messages.map((msg, idx) => {
                    const isAgent = msg.sender === 'agent';
                    const showAvatar = !isAgent && (idx === 0 || messages[idx - 1]?.sender !== 'user');
                    const showTime = idx === messages.length - 1 || 
                      messages[idx + 1]?.sender !== msg.sender ||
                      new Date(messages[idx + 1]?.createdAt).getTime() - new Date(msg.createdAt).getTime() > 300000;
                    const isAutoResponse = isAgent && msg.senderName === 'Auto-response';
                    
                    return (
                      <div key={msg.id} style={{ marginBottom: showTime ? 16 : 4 }}>
                        {/* Message Row */}
                        <div style={{ display: 'flex', justifyContent: isAgent ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}>
                          {/* User Avatar */}
                          {!isAgent && (
                            <div style={{ width: 36, flexShrink: 0 }}>
                              {showAvatar && (
                                selectedRoomData.pictureUrl ? (
                                  <img src={selectedRoomData.pictureUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: colors.bgTertiary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, fontSize: 14, fontWeight: 500 }}>
                                    {selectedRoomData.displayName.charAt(0)}
                                  </div>
                                )
                              )}
                            </div>
                          )}
                          
                          {/* Agent Label (Auto-response) */}
                          {isAgent && isAutoResponse && (
                            <span style={{ fontSize: 11, color: colors.textMuted, marginRight: 4, alignSelf: 'flex-start', marginTop: 4 }}>Auto-response</span>
                          )}
                          
                          {/* Message Bubble */}
                          <div style={{ maxWidth: '65%' }}>
                            {msg.messageType === 'sticker' ? (
                              <div>{renderSticker(msg.packageId, msg.stickerId)}</div>
                            ) : msg.messageType === 'image' ? (
                              <img src={msg.mediaUrl} alt="Image" style={{ maxWidth: 260, borderRadius: 12 }} />
                            ) : (msg.content.startsWith('(') && msg.content.endsWith(')')) || msg.content.startsWith('[sticker') ? (
                              <div style={{ fontSize: 48, lineHeight: 1 }}>
                                {convertStickerText(msg.content)}
                              </div>
                            ) : (
                              <div style={{
                                padding: '12px 16px', 
                                borderRadius: isAgent ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
                                background: isAgent ? colors.bubbleAgent : colors.bubbleUser, 
                                color: isAgent ? '#fff' : colors.textPrimary,
                                boxShadow: isAgent ? '0 4px 12px rgba(16, 185, 129, 0.25)' : colors.shadowSm,
                              }}>
                                <p style={{ fontSize: 14, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6, letterSpacing: '0.01em' }}>{msg.content}</p>
                              </div>
                            )}
                          </div>
                          
                          {/* Time & Status for Agent messages */}
                          {isAgent && showTime && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, marginLeft: 4 }}>
                              <span style={{ fontSize: 11, color: msg.status === 'read' ? colors.textMuted : colors.textMuted }}>
                                {msg.status === 'read' ? 'Read' : ''}
                              </span>
                              <span style={{ fontSize: 11, color: colors.textMuted }}>
                                {new Date(msg.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Time for User messages */}
                        {!isAgent && showTime && (
                          <div style={{ marginLeft: 44, marginTop: 4 }}>
                            <span style={{ fontSize: 11, color: colors.textMuted }}>
                              {new Date(msg.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                        
                        {/* Agent name label */}
                        {isAgent && showTime && !isAutoResponse && msg.senderName && (
                          <div style={{ textAlign: 'right', marginTop: 4, marginRight: 60 }}>
                            <span style={{ fontSize: 11, color: colors.textMuted }}>{msg.senderName}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* Typing Indicator */}
                  {selectedRoom && typingUsers[selectedRoom] && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Quick Replies */}
            {showQuickReplies && (
              <div style={{ padding: '12px 24px', background: colors.bgSecondary, borderTop: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>ข้อความด่วน</span>
                  <button onClick={() => setShowQuickReplies(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', padding: 4 }}><X size={16} /></button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {quickReplies.map((reply) => (
                    <button key={reply.id} onClick={() => sendMessage(reply.label)} style={{
                      padding: '10px 16px', borderRadius: 12, border: `1px solid ${colors.border}`,
                      background: colors.bgTertiary, color: colors.textPrimary, fontSize: 13, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = colors.bgHover; e.currentTarget.style.borderColor = colors.accent; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = colors.bgTertiary; e.currentTarget.style.borderColor = colors.border; }}
                    >
                      <span>{reply.icon}</span>
                      <span>{reply.label.length > 35 ? reply.label.substring(0, 35) + '...' : reply.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div style={{ 
                padding: '12px 20px', 
                background: colors.bgSecondary, 
                borderTop: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Emoji</span>
                  <button onClick={() => setShowEmojiPicker(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', padding: 4 }}><X size={16} /></button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {commonEmojis.map((emoji, i) => (
                    <button 
                      key={i} 
                      onClick={() => {
                        setMessage(prev => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      style={{
                        width: 36, height: 36, borderRadius: 8, border: 'none',
                        background: colors.bgTertiary, fontSize: 20, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'transform 0.1s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input - Premium Design */}
            <div style={{ padding: '16px 24px 20px', background: colors.bgSecondary, borderTop: `1px solid ${colors.border}` }}>
              {/* Hint text */}
              <div style={{ marginBottom: 10, fontSize: 12, color: colors.textMuted, fontWeight: 500 }}>
                <span style={{ color: colors.textSecondary }}>Enter</span> to send • <span style={{ color: colors.textSecondary }}>Shift + Enter</span> for new line
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
                {/* Input Field */}
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="text"
                    value={message}
                    onChange={handleInputChange}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(message); } }}
                    placeholder="Type your message..."
                    style={{ 
                      width: '100%', minHeight: 48, padding: '14px 18px',
                      border: `1px solid ${colors.border}`, borderRadius: 12,
                      background: colors.bgInput, color: colors.textPrimary, fontSize: 14, outline: 'none',
                      resize: 'none',
                      transition: 'all 0.2s ease',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = colors.accent; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = colors.border; }}
                  />
                </div>
                {/* Send Button */}
                <button
                  onClick={() => sendMessage(message)}
                  disabled={!message.trim() || isSending}
                  style={{
                    padding: '14px 28px', borderRadius: 12, border: 'none',
                    background: message.trim() && !isSending ? colors.accentGradient : colors.bgTertiary,
                    color: message.trim() && !isSending ? '#fff' : colors.textMuted,
                    fontSize: 14, fontWeight: 600,
                    cursor: message.trim() && !isSending ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.2s ease',
                    boxShadow: message.trim() && !isSending ? '0 4px 12px rgba(34, 197, 94, 0.25)' : 'none',
                  }}
                  onMouseEnter={(e) => { if (message.trim() && !isSending) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  {isSending ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <><Send size={16} /> Send</>}
                </button>
              </div>
              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
                <button 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  style={{ 
                    width: 38, height: 38, borderRadius: 10, border: 'none', 
                    background: showEmojiPicker ? colors.accentLight : 'transparent', 
                    color: showEmojiPicker ? colors.accent : colors.textMuted, 
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => { if (!showEmojiPicker) e.currentTarget.style.background = colors.bgHover; }}
                  onMouseLeave={(e) => { if (!showEmojiPicker) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Smile size={22} />
                </button>
                <button style={{ 
                  width: 38, height: 38, borderRadius: 10, border: 'none', 
                  background: 'transparent', color: colors.textMuted, 
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = colors.bgHover}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Paperclip size={22} />
                </button>
                <button 
                  onClick={() => setShowQuickReplies(!showQuickReplies)} 
                  style={{ 
                    width: 38, height: 38, borderRadius: 10, border: 'none', 
                    background: showQuickReplies ? colors.accentLight : 'transparent', 
                    color: showQuickReplies ? colors.accent : colors.textMuted, 
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => { if (!showQuickReplies) e.currentTarget.style.background = colors.bgHover; }}
                  onMouseLeave={(e) => { if (!showQuickReplies) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Plus size={22} />
                </button>
                <button style={{ 
                  width: 38, height: 38, borderRadius: 10, border: 'none', 
                  background: 'transparent', color: colors.textMuted, 
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = colors.bgHover}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Bookmark size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL - Premium Design */}
          {showRightPanel && (
            <div style={{ width: 360, background: colors.bgSecondary, borderLeft: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', overflowY: 'auto', zIndex: 2 }}>
              {/* Profile Section - Premium Design */}
              <div style={{ 
                padding: '32px 24px', 
                textAlign: 'center', 
                background: colors.bgSecondary,
              }}>
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
                  {selectedRoomData.pictureUrl ? (
                    <div style={{ position: 'relative' }}>
                      <img src={selectedRoomData.pictureUrl} alt={selectedRoomData.displayName} style={{ 
                        width: 88, height: 88, borderRadius: '50%', objectFit: 'cover',
                        border: `3px solid ${colors.accent}`,
                        boxShadow: '0 4px 12px rgba(34, 197, 94, 0.15)',
                      }} />
                      <div style={{
                        position: 'absolute', bottom: 4, right: 4,
                        width: 20, height: 20, borderRadius: '50%',
                        background: colors.online,
                        border: `3px solid ${colors.bgSecondary}`,
                      }} />
                    </div>
                  ) : (
                    <div style={{
                      width: 88, height: 88, borderRadius: '50%', 
                      background: colors.accentGradient,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 32, fontWeight: 700,
                      boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)',
                    }}>
                      {selectedRoomData.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: colors.textPrimary, margin: 0, letterSpacing: '-0.02em' }}>{selectedRoomData.displayName}</h3>
                  <button style={{ 
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4, 
                    color: colors.accent, display: 'flex', alignItems: 'center',
                  }}>
                    ✏️
                  </button>
                </div>
                <p style={{ fontSize: 13, color: colors.textSecondary, margin: 0, fontWeight: 500 }}>({selectedRoomData.statusMessage || 'LINE User'})</p>
              </div>

              {/* Tags Section - Premium Design */}
              <div style={{ padding: '20px 24px' }}>
                <div style={{ 
                  padding: '16px 20px', borderRadius: 12, 
                  border: `2px dashed ${colors.borderAccent}`,
                  background: colors.bgPrimary, textAlign: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.accent; e.currentTarget.style.background = colors.accentLight; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.borderAccent; e.currentTarget.style.background = colors.bgPrimary; }}
                >
                  <p style={{ fontSize: 13, color: colors.textSecondary, margin: '0 0 10px 0', lineHeight: 1.5 }}>Using tags can help you sort chats.</p>
                  <button style={{ 
                    background: colors.accentGradient, border: 'none', color: '#fff', 
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '8px 16px',
                    borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 6,
                    boxShadow: '0 2px 8px rgba(34, 197, 94, 0.2)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <Plus size={14} /> Add tags
                  </button>
                </div>
              </div>

              {/* Assign Section - Premium Design */}
              <div style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>Assigned to</span>
                  <div style={{ 
                    display: 'flex', alignItems: 'center', gap: 10, 
                    padding: '8px 12px', borderRadius: 10, 
                    background: colors.bgTertiary,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = colors.bgHover}
                  onMouseLeave={(e) => e.currentTarget.style.background = colors.bgTertiary}
                  >
                    <div style={{ 
                      width: 32, height: 32, borderRadius: '50%', 
                      background: colors.accentGradient,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 13, fontWeight: 700,
                      boxShadow: '0 2px 6px rgba(34, 197, 94, 0.2)',
                    }}>
                      {currentUser?.name?.charAt(0) || 'A'}
                    </div>
                    <span style={{ fontSize: 14, color: colors.textPrimary, fontWeight: 500 }}>{currentUser?.name || 'Agent'}</span>
                    <span style={{ fontSize: 12, color: colors.textMuted }}>✏️</span>
                  </div>
                </div>
              </div>

              {/* Notes Section - Premium Design */}
              <div style={{ padding: '20px 24px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>Notes</span>
                    <span style={{ 
                      fontSize: 12, color: colors.textMuted, 
                      background: colors.bgTertiary, padding: '2px 8px', borderRadius: 10, 
                    }}>0/1</span>
                  </div>
                  <button style={{ 
                    width: 32, height: 32, borderRadius: 8, border: 'none',
                    background: colors.bgTertiary, color: colors.accent, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = colors.accentLight; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = colors.bgTertiary; }}
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <div style={{ 
                  padding: '20px', borderRadius: 12, border: `1px solid ${colors.border}`,
                  background: colors.bgPrimary,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                    <div style={{ 
                      width: 32, height: 32, borderRadius: 8, 
                      background: 'rgba(59, 130, 246, 0.1)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 16 }}>📝</span>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary }}>Keep records in Notes</span>
                  </div>
                  <p style={{ fontSize: 13, color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
                    Record info on this user and your interactions with them, and leave handoff notes for your team. Notes aren't visible to the user; only account members can view and edit them.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Empty State */
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: colors.bgPrimary,
          padding: 40,
        }}>
          <MessageCircle size={64} style={{ color: colors.textMuted, marginBottom: 20 }} />
          <h2 style={{ fontSize: 20, fontWeight: 600, color: colors.textPrimary, margin: '0 0 8px 0' }}>เลือกแชท</h2>
          <p style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', maxWidth: 280, margin: '0 0 24px 0', lineHeight: 1.5 }}>
            เลือกการสนทนาจากรายการด้านซ้ายเพื่อเริ่มต้น
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: isConnected ? colors.accent : colors.warning }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor' }} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>{isConnected ? 'เชื่อมต่อแล้ว' : 'กำลังเชื่อมต่อ...'}</span>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes typingBounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-4px); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        * { scrollbar-width: thin; scrollbar-color: ${colors.border} transparent; }
        *::-webkit-scrollbar { width: 6px; }
        *::-webkit-scrollbar-track { background: transparent; }
        *::-webkit-scrollbar-thumb { background: ${colors.border}; border-radius: 3px; }
        *::-webkit-scrollbar-thumb:hover { background: ${colors.textMuted}; }
      `}} />
    </div>
  );
}
