'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, Send, Smile, MoreVertical, Filter,
  Plus, Check, CheckCheck, Pin,
  MessageCircle, Settings,
  Loader2, Paperclip, Image, FileText, Wifi, WifiOff
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSocket } from '@/hooks/useSocket';

// CSS for spinner animation
const spinKeyframes = `
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;

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
}

const quickReplyButtons = [
  { label: 'ดำเนินการฝาก-ถอน รบกวนคุณลูกพี่แอดไลน์นี้นะคะ 🙏', color: 'green' },
  { label: 'กรุณาส่งสลิปด้วยค่ะ', color: 'gray' },
  { label: 'รบกวนแจ้งยืนตรวจสอบให้หน่อยนะคะ', color: 'green' },
  { label: 'รบกวนลูกค้าติดต่อไลน์หลักนะคะ', color: 'green' },
];

export default function DataChatPage() {
  const { isDark } = useTheme();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'pinned'>('all');
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedRoomRef = useRef<string | null>(null);

  // Keep refs in sync with state
  useEffect(() => { selectedRoomRef.current = selectedRoom; }, [selectedRoom]);

  const selectedRoomData = rooms.find(r => r.id === selectedRoom);

  // Theme colors - memoized to prevent re-renders
  const colors = useMemo(() => ({
    // Main backgrounds
    bgMain: isDark ? '#1A1D21' : '#F8FAFC',
    bgSidebar: isDark ? '#1D1E24' : '#FFFFFF',
    bgChat: isDark ? '#23262B' : '#F1F5F9',
    bgMessages: isDark ? '#1A1D21' : '#E2E8F0',
    
    // Card/Input backgrounds
    bgCard: isDark ? '#2A313C' : '#E2E8F0',
    bgInput: isDark ? '#2A313C' : '#FFFFFF',
    bgHover: isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.08)',
    
    // Borders
    border: isDark ? '#2A313C' : '#E2E8F0',
    borderLight: isDark ? '#3A414C' : '#CBD5E1',
    
    // Text colors
    textPrimary: isDark ? '#FFFFFF' : '#1E293B',
    textSecondary: isDark ? '#9CA3AF' : '#64748B',
    textMuted: isDark ? '#6B7280' : '#94A3B8',
    
    // Message bubbles
    bubbleAgent: '#22c55e',
    bubbleUser: isDark ? '#2A313C' : '#E2E8F0',
    bubbleUserText: isDark ? '#FFFFFF' : '#1E293B',
    
    // Accent
    accent: '#22c55e',
    accentLight: 'rgba(34, 197, 94, 0.1)',
    warning: '#f59e0b',
    warningBg: 'rgba(245, 158, 11, 0.2)',
  }), [isDark]);

  // Fetch chat rooms
  const fetchRooms = useCallback(async () => {
    try {
      const params = new URLSearchParams({ filter: filterStatus });
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(`/api/chat/rooms?${params}`);
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    } finally {
      setIsLoadingRooms(false);
    }
  }, [filterStatus, searchTerm]);

  // Fetch messages for selected room
  const fetchMessages = useCallback(async (roomId: string) => {
    setIsLoadingMessages(true);
    try {
      const response = await fetch(`/api/chat/rooms/${roomId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
        await fetch(`/api/chat/rooms/${roomId}/messages`, { method: 'POST' });
        setRooms(prev => prev.map(r => 
          r.id === roomId ? { ...r, unreadCount: 0 } : r
        ));
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // Socket.IO connection for real-time updates
  const { isConnected, joinRoom, markAsRead } = useSocket({
    onNewMessage: (msg) => {
      // Convert to local Message type (ensure content is string)
      const message: Message = {
        ...msg,
        content: msg.content || '',
      };
      handleNewMessage(message);
    },
    onNewRoom: (room) => {
      // Convert to local ChatRoom type
      const newRoom: ChatRoom = {
        ...room,
        lastMessage: room.lastMessage ? {
          ...room.lastMessage,
          content: room.lastMessage.content || '',
        } : undefined,
      };
      setRooms(prev => prev.some(r => r.id === newRoom.id) ? prev : [newRoom, ...prev]);
    },
    onConnect: () => {
      console.log('[Chat] Socket connected');
    },
    onDisconnect: () => {
      console.log('[Chat] Socket disconnected');
    },
  });

  // Handle new message from socket
  const handleNewMessage = useCallback((msg: Message) => {
    if (selectedRoomRef.current === msg.roomId) {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // Mark as read
      markAsRead(msg.roomId, [msg.id]);
    }
    setRooms(prev => {
      const idx = prev.findIndex(r => r.id === msg.roomId);
      if (idx === -1) {
        // New room, refetch
        fetchRooms();
        return prev;
      }
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        lastMessage: msg,
        lastMessageAt: msg.createdAt,
        unreadCount: selectedRoomRef.current === msg.roomId ? 0 : updated[idx].unreadCount + 1,
      };
      return updated.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.lastMessageAt || b.createdAt).getTime() - new Date(a.lastMessageAt || a.createdAt).getTime();
      });
    });
  }, [markAsRead, fetchRooms]);

  // Join room when selected
  useEffect(() => {
    if (selectedRoom) {
      joinRoom(selectedRoom);
    }
  }, [selectedRoom, joinRoom]);

  const sendMessage = async (content: string) => {
    if (!selectedRoom || isSending || !content.trim()) return;
    setIsSending(true);
    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: selectedRoom, messageType: 'text', content }),
      });
      const result = await response.json();
      if (result.success && result.message) {
        setMessages(prev => [...prev, result.message]);
        setMessage('');
      }
    } catch (error) {
      console.error('Send error:', error);
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
    if (days === 1) return 'Yesterday';
    if (days < 7) return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  };

  useEffect(() => { fetchRooms(); }, [fetchRooms]);
  useEffect(() => { if (selectedRoom) fetchMessages(selectedRoom); }, [selectedRoom, fetchMessages]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const renderSticker = (packageId?: string, stickerId?: string) => {
    if (!packageId || !stickerId) return null;
    return (
      <img
        src={`https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/iPhone/sticker.png`}
        alt="sticker"
        style={{ width: 96, height: 96, objectFit: 'contain' }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  };

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 100px)',
      background: colors.bgMain,
      borderRadius: 16,
      overflow: 'hidden',
      border: `1px solid ${colors.border}`,
      boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
    }}>
      {/* Sidebar */}
      <div style={{
        width: 320,
        background: colors.bgSidebar,
        borderRight: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: 16, borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>แชท</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{
                width: 32, height: 32, borderRadius: 8, border: 'none',
                background: colors.bgCard, color: colors.textSecondary, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Filter size={16} />
              </button>
              <button style={{
                width: 32, height: 32, borderRadius: 8, border: 'none',
                background: colors.accent, color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: colors.textMuted }} />
            <input
              type="text"
              placeholder="ค้นหาแชท..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', height: 40, paddingLeft: 40, paddingRight: 12,
                borderRadius: 8, border: isDark ? 'none' : `1px solid ${colors.border}`, 
                background: colors.bgInput,
                color: colors.textPrimary, fontSize: 14, outline: 'none',
              }}
            />
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: 8 }}>
            {(['all', 'unread', 'pinned'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterStatus(filter)}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: 'none',
                  background: filterStatus === filter ? colors.accent : colors.bgCard,
                  color: filterStatus === filter ? '#fff' : colors.textSecondary,
                  fontSize: 12, fontWeight: 500, cursor: 'pointer',
                }}
              >
                {filter === 'all' ? 'ทั้งหมด' : filter === 'unread' ? 'ยังไม่อ่าน' : 'ปักหมุด'}
              </button>
            ))}
          </div>
        </div>

        {/* Chat List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoadingRooms ? (
            <div style={{ padding: 32, textAlign: 'center', color: colors.textMuted }}>
              <Loader2 style={{ width: 24, height: 24, margin: '0 auto 8px', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: 14, margin: 0 }}>กำลังโหลด...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: colors.textMuted }}>
              <MessageCircle style={{ width: 48, height: 48, margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ fontSize: 14, margin: 0 }}>ไม่มีแชท</p>
            </div>
          ) : (
            rooms.map((room) => (
              <div
                key={room.id}
                onClick={() => setSelectedRoom(room.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: 12, cursor: 'pointer',
                  borderBottom: `1px solid ${colors.border}`,
                  background: selectedRoom === room.id ? colors.bgHover : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {room.pictureUrl ? (
                    <img src={room.pictureUrl} alt={room.displayName}
                      style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%', background: colors.accent,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 18, fontWeight: 600,
                    }}>
                      {room.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {room.isPinned && (
                    <Pin style={{
                      position: 'absolute', bottom: -2, right: -2,
                      width: 14, height: 14, color: colors.warning, fill: colors.warning,
                    }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, color: colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {room.displayName}
                      </span>
                      {room.tags?.includes('VIP') && (
                        <span style={{
                          padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                          background: colors.warningBg, color: colors.warning,
                        }}>VIP</span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: colors.textMuted, flexShrink: 0 }}>
                      {room.lastMessageAt && formatTime(room.lastMessageAt)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {room.lastMessage?.content || 'เริ่มแชท'}
                    </span>
                    {room.unreadCount > 0 && (
                      <span style={{
                        minWidth: 20, height: 20, borderRadius: 10,
                        background: colors.accent, color: '#fff', fontSize: 11, fontWeight: 600,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px',
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

      {/* Chat Area */}
      {selectedRoom && selectedRoomData ? (
        <>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: colors.bgChat }}>
            {/* Chat Header */}
            <div style={{
              padding: '12px 16px', borderBottom: `1px solid ${colors.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: colors.bgSidebar,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {selectedRoomData.pictureUrl ? (
                  <img src={selectedRoomData.pictureUrl} alt={selectedRoomData.displayName}
                    style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', background: colors.accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 16, fontWeight: 600,
                  }}>
                    {selectedRoomData.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>{selectedRoomData.displayName}</h3>
                  <p style={{ fontSize: 12, color: colors.accent, margin: 0 }}>● ออนไลน์</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{
                  width: 32, height: 32, borderRadius: 8, border: 'none',
                  background: colors.bgCard, color: colors.textSecondary, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><Search size={16} /></button>
                <button onClick={() => setShowRightPanel(!showRightPanel)} style={{
                  width: 32, height: 32, borderRadius: 8, border: 'none',
                  background: colors.bgCard, color: colors.textSecondary, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><MoreVertical size={16} /></button>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: colors.bgMessages }}>
              {isLoadingMessages ? (
                <div style={{ textAlign: 'center', padding: 32, color: colors.textMuted }}>
                  <Loader2 style={{ width: 24, height: 24, margin: '0 auto 8px', animation: 'spin 1s linear infinite' }} />
                  <p style={{ fontSize: 14, margin: 0 }}>กำลังโหลดข้อความ...</p>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: colors.textMuted }}>
                  <MessageCircle style={{ width: 64, height: 64, margin: '0 auto 16px', opacity: 0.2 }} />
                  <p style={{ margin: 0 }}>ยังไม่มีข้อความ</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {messages.map((msg) => {
                    const isAgent = msg.sender === 'agent';
                    return (
                      <div key={msg.id} style={{ display: 'flex', justifyContent: isAgent ? 'flex-end' : 'flex-start' }}>
                        <div style={{ maxWidth: '70%' }}>
                          {!isAgent && (
                            <span style={{ fontSize: 11, color: colors.textMuted, marginLeft: 4, marginBottom: 4, display: 'block' }}>
                              {msg.senderName}
                            </span>
                          )}
                          {msg.messageType === 'sticker' ? (
                            <div style={{ padding: 8 }}>{renderSticker(msg.packageId, msg.stickerId)}</div>
                          ) : msg.messageType === 'image' ? (
                            <img src={msg.mediaUrl} alt="Image" style={{ maxWidth: 200, borderRadius: 12 }} />
                          ) : (
                            <div style={{
                              padding: '10px 14px', borderRadius: 18,
                              borderTopLeftRadius: isAgent ? 18 : 4, borderTopRightRadius: isAgent ? 4 : 18,
                              background: isAgent ? colors.bubbleAgent : colors.bubbleUser, 
                              color: isAgent ? '#fff' : colors.bubbleUserText,
                            }}>
                              <p style={{ fontSize: 14, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{msg.content}</p>
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, justifyContent: isAgent ? 'flex-end' : 'flex-start' }}>
                            <span style={{ fontSize: 10, color: colors.textMuted }}>
                              {new Date(msg.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isAgent && <span style={{ color: colors.accent }}>{msg.status === 'read' ? <CheckCheck size={12} /> : <Check size={12} />}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Quick Replies */}
            <div style={{ padding: '12px 16px', borderTop: `1px solid ${colors.border}`, background: colors.bgSidebar, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {quickReplyButtons.map((btn, idx) => (
                <button key={idx} onClick={() => sendMessage(btn.label)} style={{
                  padding: '8px 12px', borderRadius: 8, border: 'none',
                  background: btn.color === 'green' ? colors.accent : (isDark ? '#374151' : '#CBD5E1'),
                  color: btn.color === 'green' ? '#fff' : colors.textPrimary, 
                  fontSize: 12, cursor: 'pointer', transition: 'opacity 0.15s',
                }}>
                  {btn.label.length > 30 ? btn.label.substring(0, 30) + '...' : btn.label}
                </button>
              ))}
            </div>

            {/* Input */}
            <div style={{ padding: '12px 16px', borderTop: `1px solid ${colors.border}`, background: colors.bgSidebar }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{
                    width: 36, height: 36, borderRadius: '50%', border: 'none',
                    background: colors.bgCard, color: colors.textSecondary, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}><MessageCircle size={18} /></button>
                  <button style={{
                    width: 36, height: 36, borderRadius: '50%', border: 'none',
                    background: colors.bgCard, color: colors.textSecondary, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}><Paperclip size={18} /></button>
                  <button style={{
                    width: 36, height: 36, borderRadius: '50%', border: 'none',
                    background: colors.bgCard, color: colors.textSecondary, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}><Image size={18} /></button>
                </div>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(message); } }}
                  placeholder="พิมพ์ข้อความ... (Enter ส่ง, Shift+Enter ขึ้นบรรทัดใหม่)"
                  style={{
                    flex: 1, height: 40, padding: '0 16px', borderRadius: 20,
                    border: isDark ? 'none' : `1px solid ${colors.border}`, 
                    background: colors.bgInput, color: colors.textPrimary, fontSize: 14, outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{
                    width: 36, height: 36, borderRadius: '50%', border: 'none',
                    background: colors.bgCard, color: colors.textSecondary, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}><Smile size={18} /></button>
                  <button
                    onClick={() => sendMessage(message)}
                    disabled={!message.trim() || isSending}
                    style={{
                      width: 36, height: 36, borderRadius: '50%', border: 'none',
                      background: message.trim() && !isSending ? colors.accent : colors.bgCard,
                      color: message.trim() && !isSending ? '#fff' : colors.textMuted,
                      cursor: message.trim() && !isSending ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {isSending ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          {showRightPanel && (
            <div style={{ width: 280, background: colors.bgSidebar, borderLeft: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column' }}>
              {/* Profile */}
              <div style={{ padding: 24, textAlign: 'center', borderBottom: `1px solid ${colors.border}` }}>
                {selectedRoomData.pictureUrl ? (
                  <img src={selectedRoomData.pictureUrl} alt={selectedRoomData.displayName}
                    style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 12px', display: 'block' }} />
                ) : (
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%', background: colors.accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 auto 12px',
                  }}>
                    {selectedRoomData.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.textPrimary, margin: '0 0 4px 0' }}>{selectedRoomData.displayName}</h3>
                <p style={{ fontSize: 12, color: colors.textMuted, margin: '0 0 16px 0' }}>{selectedRoomData.lineUserId}</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                  <button style={{
                    padding: '8px 16px', borderRadius: 8, border: 'none',
                    background: colors.bgCard, color: colors.textPrimary, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  }}>Follow up</button>
                  <button style={{
                    padding: '8px 16px', borderRadius: 8, border: 'none',
                    background: colors.accent, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  }}>✓ Resolve</button>
                </div>
              </div>

              {/* Tags */}
              <div style={{ padding: 16, borderBottom: `1px solid ${colors.border}` }}>
                <h4 style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, margin: '0 0 12px 0', letterSpacing: 0.5 }}>TAGS</h4>
                <button style={{
                  background: 'none', border: 'none', color: colors.accent, fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4, padding: 0,
                }}>
                  <Plus size={14} /> Add tags
                </button>
              </div>

              {/* Assign */}
              <div style={{ padding: 16, borderBottom: `1px solid ${colors.border}` }}>
                <h4 style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, margin: '0 0 12px 0', letterSpacing: 0.5 }}>ASSIGN</h4>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', background: colors.accent,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 13, fontWeight: 600,
                    }}>A</div>
                    <div>
                      <p style={{ fontSize: 13, color: colors.textPrimary, fontWeight: 500, margin: 0 }}>Armm</p>
                      <p style={{ fontSize: 11, color: colors.textMuted, margin: 0 }}>Admin</p>
                    </div>
                  </div>
                  <button style={{
                    background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', padding: 4,
                  }}><Settings size={16} /></button>
                </div>
              </div>

              {/* Notes */}
              <div style={{ padding: 16, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, margin: 0, letterSpacing: 0.5 }}>NOTES</h4>
                  <span style={{ fontSize: 11, color: colors.textMuted }}>0/1</span>
                </div>
                <div style={{ background: colors.bgCard, borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <FileText size={16} style={{ color: colors.textMuted, marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 13, color: colors.textPrimary, fontWeight: 500, margin: '0 0 4px 0' }}>Keep records in Notes</p>
                      <p style={{ fontSize: 11, color: colors.textMuted, margin: 0, lineHeight: 1.4 }}>Record info on this user and your interactions with them.</p>
                    </div>
                  </div>
                </div>
                <button style={{
                  width: '100%', padding: '10px 0', borderRadius: 8,
                  border: `1px solid ${colors.accent}`, background: 'transparent',
                  color: colors.accent, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}>+ Add Note</button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: colors.bgChat, color: colors.textMuted,
        }}>
          <div style={{
            width: 96, height: 96, borderRadius: '50%',
            background: colors.accentLight,
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
          }}>
            <MessageCircle style={{ width: 48, height: 48, color: colors.accent }} />
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 600, color: colors.textPrimary, margin: '0 0 8px 0' }}>LINE Chat Center</h3>
          <p style={{ fontSize: 14, textAlign: 'center', maxWidth: 280, margin: 0 }}>
            เลือกแชทจากรายการด้านซ้าย เพื่อเริ่มสนทนากับลูกค้า
          </p>
          <div style={{
            marginTop: 32, padding: '12px 24px', borderRadius: 8,
            background: colors.bgCard, border: `1px solid ${colors.borderLight}`,
          }}>
            <p style={{ fontSize: 13, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: colors.textSecondary }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: isConnected ? colors.accent : colors.warning }} />
              {isConnected ? 'ระบบพร้อมรับข้อความ' : 'กำลังเชื่อมต่อ...'}
            </p>
          </div>
        </div>
      )}
      
      {/* Inject keyframes for spinner animation */}
      <style dangerouslySetInnerHTML={{ __html: spinKeyframes }} />
    </div>
  );
}
