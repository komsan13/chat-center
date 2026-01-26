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

  // Theme Colors - Modern clean design
  const colors = useMemo(() => ({
    bgPrimary: isDark ? '#0f0f10' : '#f8fafc',
    bgSecondary: isDark ? '#18181b' : '#ffffff',
    bgTertiary: isDark ? '#27272a' : '#f4f4f5',
    bgCard: isDark ? '#1f1f23' : '#ffffff',
    bgHover: isDark ? '#27272a' : '#f4f4f5',
    bgActive: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)',
    border: isDark ? '#27272a' : '#e4e4e7',
    borderLight: isDark ? '#3f3f46' : '#e4e4e7',
    textPrimary: isDark ? '#fafafa' : '#18181b',
    textSecondary: isDark ? '#a1a1aa' : '#71717a',
    textMuted: isDark ? '#71717a' : '#a1a1aa',
    accent: '#10b981',
    accentLight: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
    bubbleAgent: isDark ? '#10b981' : '#10b981',
    bubbleUser: isDark ? '#27272a' : '#f4f4f5',
    online: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
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
        border: `1px solid ${colors.border}`,
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
      borderRadius: 14,
      overflow: 'hidden',
      border: `1px solid ${colors.border}`,
      boxShadow: isDark 
        ? '0 6px 20px rgba(0,0,0,0.35)'
        : '0 6px 20px rgba(0,0,0,0.06)',
    }}>
      
      {/* LEFT SIDEBAR */}
      <div style={{
        width: 340,
        background: colors.bgSecondary,
        borderRight: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', background: colors.bgSecondary }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 600, color: colors.textPrimary, margin: 0, letterSpacing: '-0.02em' }}>แชท</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 12, color: colors.textMuted }}>{rooms.length} การสนทนา</span>
                <span style={{ fontSize: 10, color: colors.textMuted }}>•</span>
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 5,
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: connectionState === 'connected' 
                      ? 'rgba(34, 197, 94, 0.15)' 
                      : connectionState === 'reconnecting'
                        ? 'rgba(245, 158, 11, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                    cursor: connectionState !== 'connected' ? 'pointer' : 'default',
                  }}
                  onClick={() => { if (connectionState !== 'connected') reconnect(); }}
                  title={connectionState !== 'connected' ? 'คลิกเพื่อเชื่อมต่อใหม่' : 'เชื่อมต่อแล้ว'}
                >
                  <div style={{ 
                    width: 6, 
                    height: 6, 
                    borderRadius: '50%', 
                    background: connectionState === 'connected' 
                      ? '#22c55e' 
                      : connectionState === 'reconnecting'
                        ? '#f59e0b'
                        : '#ef4444',
                    animation: connectionState === 'reconnecting' ? 'pulse 1.5s infinite' : 'none',
                  }} />
                  <span style={{ 
                    fontSize: 11, 
                    fontWeight: 500,
                    color: connectionState === 'connected' 
                      ? '#22c55e' 
                      : connectionState === 'reconnecting'
                        ? '#f59e0b'
                        : '#ef4444',
                  }}>
                    {connectionState === 'connected' 
                      ? 'เชื่อมต่อแล้ว' 
                      : connectionState === 'reconnecting'
                        ? 'กำลังเชื่อมต่อ...'
                        : 'ขาดการเชื่อมต่อ'}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                onClick={playNotificationSound}
                title="ทดสอบเสียงแจ้งเตือน"
                style={{
                  width: 36, height: 36, borderRadius: 10, border: `1px solid ${colors.border}`,
                  background: colors.bgCard, color: colors.textSecondary, 
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'none',
                }}>🔔</button>
              <button style={{
                width: 36, height: 36, borderRadius: 10, border: `1px solid ${colors.border}`,
                background: colors.bgCard, color: colors.textSecondary, 
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'none',
              }}><Filter size={18} /></button>
              <button style={{
                width: 36, height: 36, borderRadius: 10, border: 'none',
                background: colors.accent,
                color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'none',
              }}><Plus size={18} strokeWidth={2.5} /></button>
            </div>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: colors.textMuted }} />
            <input
              type="text"
              placeholder="ค้นหา..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', height: 42, paddingLeft: 38, paddingRight: 14,
                borderRadius: 12, border: 'none',
                background: colors.bgTertiary, color: colors.textPrimary, fontSize: 14, outline: 'none',
                transition: 'box-shadow 0.2s',
              }}
              onFocus={(e) => e.target.style.boxShadow = `0 0 0 2px ${colors.accent}30`}
              onBlur={(e) => e.target.style.boxShadow = 'none'}
            />
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: 8 }}>
            {(['all', 'unread', 'pinned'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterStatus(filter)}
                style={{
                  padding: '8px 16px', borderRadius: 20, border: 'none',
                  background: filterStatus === filter ? colors.accent : colors.bgTertiary,
                  color: filterStatus === filter ? '#fff' : colors.textSecondary,
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {filter === 'all' ? 'ทั้งหมด' : filter === 'unread' ? 'ยังไม่อ่าน' : 'ปักหมุด'}
              </button>
            ))}
          </div>
        </div>

        {/* Chat List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 12px' }}>
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
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 12px', cursor: 'pointer',
                  borderRadius: 14, margin: '2px 0',
                  background: selectedRoom === room.id ? colors.bgActive : 'transparent',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { if (selectedRoom !== room.id) e.currentTarget.style.background = colors.bgHover; }}
                onMouseLeave={(e) => { if (selectedRoom !== room.id) e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {room.pictureUrl ? (
                    <img src={room.pictureUrl} alt={room.displayName} style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: 50, height: 50, borderRadius: '50%', 
                      background: `linear-gradient(135deg, ${colors.accent} 0%, #059669 100%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 18, fontWeight: 600,
                    }}>
                      {room.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{ position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: '50%', background: colors.online, border: `2px solid ${colors.bgSecondary}` }} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: room.unreadCount > 0 ? 600 : 500, color: colors.textPrimary, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>
                        {room.displayName}
                      </span>
                      {room.isPinned && <Pin size={12} style={{ color: colors.warning }} />}
                    </div>
                    <span style={{ fontSize: 12, color: room.unreadCount > 0 ? colors.accent : colors.textMuted, fontWeight: room.unreadCount > 0 ? 500 : 400 }}>
                      {room.lastMessageAt && formatTime(room.lastMessageAt)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: typingUsers[room.id] ? colors.accent : colors.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200, fontStyle: typingUsers[room.id] ? 'italic' : 'normal' }}>
                      {typingUsers[room.id] ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          กำลังพิมพ์
                          <span style={{ display: 'inline-flex', gap: 2 }}>
                            {[0, 1, 2].map((i) => (
                              <span key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: colors.accent, animation: `typingBounce 1.4s ease-in-out ${i * 0.2}s infinite`, display: 'inline-block' }} />
                            ))}
                          </span>
                        </span>
                      ) : (
                        <>
                          {room.lastMessage?.sender === 'agent' && <span>คุณ: </span>}
                          {room.lastMessage?.content 
                            ? (room.lastMessage.content.startsWith('(') || room.lastMessage.content.startsWith('[sticker'))
                              ? convertStickerText(room.lastMessage.content)
                              : room.lastMessage.content
                            : 'เริ่มการสนทนา'}
                        </>
                      )}
                    </span>
                    {room.unreadCount > 0 && (
                      <span style={{
                        minWidth: 22, height: 22, borderRadius: 11,
                        background: colors.accent,
                        color: '#fff', fontSize: 11, fontWeight: 600,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 7px',
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
            {/* Chat Header */}
            <div style={{
              padding: '16px 24px', background: colors.bgSecondary, borderBottom: `1px solid ${colors.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {selectedRoomData.pictureUrl ? (
                  <img src={selectedRoomData.pictureUrl} alt={selectedRoomData.displayName} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', 
                    background: `linear-gradient(135deg, ${colors.accent} 0%, #059669 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 16, fontWeight: 600,
                  }}>
                    {selectedRoomData.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>{selectedRoomData.displayName}</h3>
                  <span style={{ fontSize: 12, color: colors.accent }}>ออนไลน์</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setShowRightPanel(!showRightPanel)}
                  title="ข้อมูล"
                  style={{
                    width: 38, height: 38, borderRadius: '50%', border: 'none',
                    background: showRightPanel ? colors.accentLight : colors.bgTertiary, 
                    color: showRightPanel ? colors.accent : colors.textSecondary, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{ 
              flex: 1, overflowY: 'auto', padding: '24px 24px',
              background: colors.bgPrimary,
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {messages.map((msg, idx) => {
                    const isAgent = msg.sender === 'agent';
                    const showAvatar = !isAgent && (idx === 0 || messages[idx - 1]?.sender !== 'user');
                    const showTime = idx === messages.length - 1 || 
                      messages[idx + 1]?.sender !== msg.sender ||
                      new Date(messages[idx + 1]?.createdAt).getTime() - new Date(msg.createdAt).getTime() > 300000;
                    
                    return (
                      <div key={msg.id} style={{ display: 'flex', justifyContent: isAgent ? 'flex-end' : 'flex-start', gap: 8, marginBottom: showTime ? 12 : 0 }}>
                        {!isAgent && (
                          <div style={{ width: 32, flexShrink: 0 }}>
                            {showAvatar && (
                              selectedRoomData.pictureUrl ? (
                                <img src={selectedRoomData.pictureUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: colors.bgTertiary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textSecondary, fontSize: 12, fontWeight: 600 }}>
                                  {selectedRoomData.displayName.charAt(0)}
                                </div>
                              )
                            )}
                          </div>
                        )}
                        
                        <div style={{ maxWidth: '70%' }}>
                          {msg.messageType === 'sticker' ? (
                            <div>{renderSticker(msg.packageId, msg.stickerId)}</div>
                          ) : msg.messageType === 'image' ? (
                            <img src={msg.mediaUrl} alt="Image" style={{ maxWidth: 260, borderRadius: 16 }} />
                          ) : (msg.content.startsWith('(') && msg.content.endsWith(')')) || msg.content.startsWith('[sticker') ? (
                            <div style={{ fontSize: 48, lineHeight: 1 }}>
                              {convertStickerText(msg.content)}
                            </div>
                          ) : (
                            <div style={{
                              padding: '10px 14px', 
                              borderRadius: 18,
                              borderBottomLeftRadius: isAgent ? 18 : 4, 
                              borderBottomRightRadius: isAgent ? 4 : 18,
                              background: isAgent ? colors.bubbleAgent : colors.bubbleUser, 
                              color: isAgent ? '#fff' : colors.textPrimary,
                            }}>
                              <p style={{ fontSize: 14, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{msg.content}</p>
                            </div>
                          )}
                          {showTime && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, justifyContent: isAgent ? 'flex-end' : 'flex-start', padding: '0 4px' }}>
                              <span style={{ fontSize: 11, color: colors.textMuted }}>
                                {new Date(msg.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isAgent && <span style={{ color: msg.status === 'read' ? colors.accent : colors.textMuted }}>{msg.status === 'read' ? <CheckCheck size={12} /> : <Check size={12} />}</span>}
                            </div>
                          )}
                        </div>
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
                      background: colors.bgCard, color: colors.textPrimary, fontSize: 13, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
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

            {/* Input */}
            <div style={{ padding: '16px 24px 20px', background: colors.bgSecondary, borderTop: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button onClick={() => setShowQuickReplies(!showQuickReplies)} style={{
                    width: 40, height: 40, borderRadius: '50%', border: 'none',
                    background: showQuickReplies ? colors.accentLight : colors.bgTertiary,
                    color: showQuickReplies ? colors.accent : colors.textMuted, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}><Bookmark size={18} /></button>
                  <button 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    style={{ 
                      width: 40, height: 40, borderRadius: '50%', border: 'none', 
                      background: showEmojiPicker ? colors.accentLight : colors.bgTertiary, 
                      color: showEmojiPicker ? colors.accent : colors.textMuted, 
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Smile size={18} />
                  </button>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: colors.bgTertiary, borderRadius: 24, padding: '4px 4px 4px 18px' }}>
                  <input
                    type="text"
                    value={message}
                    onChange={handleInputChange}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(message); } }}
                    placeholder="พิมพ์ข้อความ..."
                    style={{ flex: 1, height: 40, border: 'none', background: 'transparent', color: colors.textPrimary, fontSize: 14, outline: 'none' }}
                  />
                  <button
                    onClick={() => sendMessage(message)}
                    disabled={!message.trim() || isSending}
                    style={{
                      width: 40, height: 40, borderRadius: '50%', border: 'none',
                      background: message.trim() && !isSending ? colors.accent : 'transparent',
                      color: message.trim() && !isSending ? '#fff' : colors.textMuted,
                      cursor: message.trim() && !isSending ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    {isSending ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL */}
          {showRightPanel && (
            <div style={{ width: 320, background: colors.bgSecondary, borderLeft: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              {/* Profile Section */}
              <div style={{ padding: '32px 24px 24px', textAlign: 'center' }}>
                <button 
                  onClick={() => setShowRightPanel(false)}
                  style={{
                    position: 'absolute', top: 16, right: 16,
                    width: 32, height: 32, borderRadius: '50%', border: 'none',
                    background: colors.bgTertiary, color: colors.textMuted, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={16} />
                </button>
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
                  {selectedRoomData.pictureUrl ? (
                    <img src={selectedRoomData.pictureUrl} alt={selectedRoomData.displayName} style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: 88, height: 88, borderRadius: '50%', 
                      background: `linear-gradient(135deg, ${colors.accent} 0%, #059669 100%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 32, fontWeight: 600,
                    }}>
                      {selectedRoomData.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{ position: 'absolute', bottom: 4, right: 4, width: 18, height: 18, borderRadius: '50%', background: colors.online, border: `3px solid ${colors.bgSecondary}` }} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 600, color: colors.textPrimary, margin: '0 0 4px 0' }}>{selectedRoomData.displayName}</h3>
                <p style={{ fontSize: 12, color: colors.textMuted, margin: '0 0 20px 0' }}>ออนไลน์</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                  <button style={{ padding: '10px 20px', borderRadius: 20, border: 'none', background: colors.accent, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                    ส่งข้อความ
                  </button>
                </div>
              </div>

              {/* Info Sections */}
              <div style={{ flex: 1, padding: '0 16px 16px' }}>
                {/* Quick Info */}
                <div style={{ padding: '16px 0', borderBottom: `1px solid ${colors.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: colors.textMuted }}>LINE ID</span>
                    <span style={{ fontSize: 13, color: colors.textPrimary, fontFamily: 'monospace' }}>{selectedRoomData.lineUserId.slice(0, 12)}...</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: colors.textMuted }}>สถานะ</span>
                    <span style={{ fontSize: 13, color: colors.accent }}>● ออนไลน์</span>
                  </div>
                </div>

                {/* Tags */}
                <div style={{ padding: '16px 0', borderBottom: `1px solid ${colors.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: colors.textMuted }}>แท็ก</span>
                    <button style={{ background: 'none', border: 'none', color: colors.accent, fontSize: 13, cursor: 'pointer', padding: 0 }}>
                      + เพิ่ม
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selectedRoomData.tags?.length > 0 ? (
                      selectedRoomData.tags.map((tag, i) => (
                        <span key={i} style={{ padding: '5px 12px', borderRadius: 16, fontSize: 12, fontWeight: 500, background: tag === 'VIP' ? `${colors.warning}20` : colors.bgTertiary, color: tag === 'VIP' ? colors.warning : colors.textPrimary }}>{tag}</span>
                      ))
                    ) : (
                      <span style={{ fontSize: 13, color: colors.textMuted }}>ไม่มีแท็ก</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ padding: '16px 0' }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: colors.textMuted, display: 'block', marginBottom: 12 }}>การจัดการ</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <button style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: 'none', background: 'transparent', color: colors.textPrimary, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'background 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = colors.bgTertiary}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <VolumeX size={18} style={{ color: colors.textMuted }} />
                      <span>ปิดเสียงแจ้งเตือน</span>
                    </button>
                    <button style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: 'none', background: 'transparent', color: colors.textPrimary, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'background 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = colors.bgTertiary}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <AlertTriangle size={18} style={{ color: colors.textMuted }} />
                      <span>รายงานสแปม</span>
                    </button>
                    <button style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: 'none', background: 'transparent', color: colors.danger, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'background 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Trash2 size={18} />
                      <span>ลบการสนทนา</span>
                    </button>
                  </div>
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
      
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` }} />
    </div>
  );
}
