'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, Send, Smile, MoreVertical, Filter,
  Plus, Check, CheckCheck, Pin, X,
  MessageCircle, Settings, Clock,
  Loader2, Paperclip, Image as ImageIcon, FileText, 
  Phone, Video, Bookmark
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
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'pinned'>('all');
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedRoomRef = useRef<string | null>(null);

  useEffect(() => { selectedRoomRef.current = selectedRoom; }, [selectedRoom]);

  const selectedRoomData = rooms.find(r => r.id === selectedRoom);

  // Premium Theme Colors
  const colors = useMemo(() => ({
    bgPrimary: isDark ? '#0f0f0f' : '#ffffff',
    bgSecondary: isDark ? '#161616' : '#f8fafc',
    bgTertiary: isDark ? '#1c1c1c' : '#f1f5f9',
    bgCard: isDark ? '#1f1f1f' : '#ffffff',
    bgHover: isDark ? '#252525' : '#f1f5f9',
    bgActive: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)',
    border: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    borderLight: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    textPrimary: isDark ? '#ffffff' : '#0f172a',
    textSecondary: isDark ? '#a1a1aa' : '#64748b',
    textMuted: isDark ? '#71717a' : '#94a3b8',
    accent: '#10b981',
    accentHover: '#059669',
    accentLight: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
    accentGlow: 'rgba(16, 185, 129, 0.4)',
    bubbleAgent: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    bubbleUser: isDark ? '#252525' : '#f1f5f9',
    online: '#10b981',
    warning: '#f59e0b',
  }), [isDark]);

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

  const fetchMessages = useCallback(async (roomId: string) => {
    setIsLoadingMessages(true);
    try {
      const response = await fetch(`/api/chat/rooms/${roomId}/messages`);
      if (response.ok) {
        const data = await response.json();
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

  const { isConnected, joinRoom, markAsRead } = useSocket({
    onNewMessage: (msg) => {
      const message: Message = { ...msg, content: msg.content || '' };
      handleNewMessage(message);
    },
    onNewRoom: (room) => {
      const newRoom: ChatRoom = {
        ...room,
        lastMessage: room.lastMessage ? { ...room.lastMessage, content: room.lastMessage.content || '' } : undefined,
      };
      setRooms(prev => prev.some(r => r.id === newRoom.id) ? prev : [newRoom, ...prev]);
    },
  });

  const handleNewMessage = useCallback((msg: Message) => {
    if (selectedRoomRef.current === msg.roomId) {
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      markAsRead(msg.roomId, [msg.id]);
    }
    setRooms(prev => {
      const idx = prev.findIndex(r => r.id === msg.roomId);
      if (idx === -1) { fetchRooms(); return prev; }
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

  useEffect(() => { if (selectedRoom) joinRoom(selectedRoom); }, [selectedRoom, joinRoom]);

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
        setShowQuickReplies(false);
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
    if (days === 1) return 'เมื่อวาน';
    if (days < 7) return ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'][date.getDay()];
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
        style={{ width: 120, height: 120, objectFit: 'contain' }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  };

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 118px)',
      background: colors.bgPrimary,
      borderRadius: 20,
      overflow: 'hidden',
      border: `1px solid ${colors.border}`,
      boxShadow: isDark 
        ? '0 0 0 1px rgba(255,255,255,0.02), 0 4px 24px rgba(0,0,0,0.4)'
        : '0 0 0 1px rgba(0,0,0,0.02), 0 4px 24px rgba(0,0,0,0.08)',
    }}>
      
      {/* LEFT SIDEBAR */}
      <div style={{
        width: 360,
        background: colors.bgSecondary,
        borderRight: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', background: colors.bgSecondary }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: colors.textPrimary, margin: 0, letterSpacing: '-0.02em' }}>แชท</h1>
              <p style={{ fontSize: 13, color: colors.textMuted, margin: '4px 0 0 0' }}>{rooms.length} การสนทนา</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{
                width: 38, height: 38, borderRadius: 12, border: 'none',
                background: colors.bgCard, color: colors.textSecondary, 
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
              }}><Filter size={18} /></button>
              <button style={{
                width: 38, height: 38, borderRadius: 12, border: 'none',
                background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentHover} 100%)`,
                color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 4px 12px ${colors.accentGlow}`,
              }}><Plus size={18} strokeWidth={2.5} /></button>
            </div>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Search style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: colors.textMuted }} />
            <input
              type="text"
              placeholder="ค้นหาการสนทนา..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', height: 44, paddingLeft: 44, paddingRight: 16,
                borderRadius: 12, border: `1px solid ${colors.border}`,
                background: colors.bgCard, color: colors.textPrimary, fontSize: 14, outline: 'none',
              }}
            />
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: 8, padding: 4, background: colors.bgTertiary, borderRadius: 12 }}>
            {(['all', 'unread', 'pinned'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterStatus(filter)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                  background: filterStatus === filter ? (isDark ? colors.bgCard : '#fff') : 'transparent',
                  color: filterStatus === filter ? colors.accent : colors.textSecondary,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  boxShadow: filterStatus === filter ? (isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.08)') : 'none',
                }}
              >
                {filter === 'all' ? 'ทั้งหมด' : filter === 'unread' ? 'ยังไม่อ่าน' : 'ปักหมุด'}
              </button>
            ))}
          </div>
        </div>

        {/* Chat List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
          {isLoadingRooms ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: colors.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Loader2 size={24} style={{ color: colors.accent, animation: 'spin 1s linear infinite' }} />
              </div>
              <p style={{ fontSize: 14, color: colors.textMuted, margin: 0 }}>กำลังโหลด...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: colors.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <MessageCircle size={28} style={{ color: colors.accent }} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary, margin: '0 0 8px 0' }}>ไม่มีการสนทนา</p>
              <p style={{ fontSize: 13, color: colors.textMuted, margin: 0 }}>รอข้อความใหม่จากลูกค้า</p>
            </div>
          ) : (
            rooms.map((room) => (
              <div
                key={room.id}
                onClick={() => setSelectedRoom(room.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: 14, cursor: 'pointer',
                  borderRadius: 14, margin: '4px 0',
                  background: selectedRoom === room.id ? colors.bgActive : 'transparent',
                  border: selectedRoom === room.id ? `1px solid ${colors.accent}30` : '1px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {room.pictureUrl ? (
                    <img src={room.pictureUrl} alt={room.displayName} style={{ width: 52, height: 52, borderRadius: 16, objectFit: 'cover', border: `2px solid ${colors.border}` }} />
                  ) : (
                    <div style={{
                      width: 52, height: 52, borderRadius: 16, 
                      background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentHover} 100%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 20, fontWeight: 700,
                      boxShadow: `0 4px 12px ${colors.accentGlow}`,
                    }}>
                      {room.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: '50%', background: colors.online, border: `3px solid ${colors.bgSecondary}` }} />
                  {room.isPinned && (
                    <div style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: colors.warning, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Pin size={10} style={{ color: '#fff', fill: '#fff' }} />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, color: colors.textPrimary, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                        {room.displayName}
                      </span>
                      {room.tags?.includes('VIP') && (
                        <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: `linear-gradient(135deg, ${colors.warning} 0%, #d97706 100%)`, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>VIP</span>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: room.unreadCount > 0 ? colors.accent : colors.textMuted, fontWeight: room.unreadCount > 0 ? 600 : 400 }}>
                      {room.lastMessageAt && formatTime(room.lastMessageAt)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                      {room.lastMessage?.sender === 'agent' && <span style={{ color: colors.textMuted }}>คุณ: </span>}
                      {room.lastMessage?.content || 'เริ่มแชท'}
                    </span>
                    {room.unreadCount > 0 && (
                      <span style={{
                        minWidth: 22, height: 22, borderRadius: 11,
                        background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentHover} 100%)`,
                        color: '#fff', fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 7px',
                        boxShadow: `0 2px 8px ${colors.accentGlow}`,
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
                  <img src={selectedRoomData.pictureUrl} alt={selectedRoomData.displayName} style={{ width: 46, height: 46, borderRadius: 14, objectFit: 'cover', border: `2px solid ${colors.accent}30` }} />
                ) : (
                  <div style={{
                    width: 46, height: 46, borderRadius: 14, 
                    background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentHover} 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 18, fontWeight: 700,
                  }}>
                    {selectedRoomData.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.textPrimary, margin: 0, letterSpacing: '-0.01em' }}>{selectedRoomData.displayName}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors.online, boxShadow: `0 0 8px ${colors.online}` }} />
                    <span style={{ fontSize: 13, color: colors.accent, fontWeight: 500 }}>ออนไลน์</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[Phone, Video, Search, MoreVertical].map((Icon, i) => (
                  <button key={i} onClick={() => i === 3 && setShowRightPanel(!showRightPanel)} style={{
                    width: 40, height: 40, borderRadius: 12, border: 'none',
                    background: colors.bgCard, color: colors.textSecondary, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}><Icon size={18} /></button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div style={{ 
              flex: 1, overflowY: 'auto', padding: 24,
              background: isDark ? 'linear-gradient(180deg, #0f0f0f 0%, #161616 100%)' : 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
            }}>
              {isLoadingMessages ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <Loader2 size={32} style={{ color: colors.accent, animation: 'spin 1s linear infinite' }} />
                  <p style={{ fontSize: 14, color: colors.textMuted, marginTop: 16 }}>กำลังโหลดข้อความ...</p>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ width: 80, height: 80, borderRadius: 24, background: colors.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <MessageCircle size={36} style={{ color: colors.accent }} />
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: colors.textPrimary, margin: '0 0 8px 0' }}>เริ่มการสนทนา</p>
                  <p style={{ fontSize: 14, color: colors.textMuted, margin: 0 }}>ยังไม่มีข้อความในแชทนี้</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {messages.map((msg, idx) => {
                    const isAgent = msg.sender === 'agent';
                    const showAvatar = !isAgent && (idx === 0 || messages[idx - 1]?.sender !== 'user');
                    
                    return (
                      <div key={msg.id} style={{ display: 'flex', justifyContent: isAgent ? 'flex-end' : 'flex-start', gap: 10 }}>
                        {!isAgent && (
                          <div style={{ width: 36, flexShrink: 0 }}>
                            {showAvatar && (
                              selectedRoomData.pictureUrl ? (
                                <img src={selectedRoomData.pictureUrl} alt="" style={{ width: 36, height: 36, borderRadius: 12, objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: 36, height: 36, borderRadius: 12, background: colors.bgTertiary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textSecondary, fontSize: 14, fontWeight: 600 }}>
                                  {selectedRoomData.displayName.charAt(0)}
                                </div>
                              )
                            )}
                          </div>
                        )}
                        
                        <div style={{ maxWidth: '65%' }}>
                          {msg.messageType === 'sticker' ? (
                            <div style={{ padding: 8 }}>{renderSticker(msg.packageId, msg.stickerId)}</div>
                          ) : msg.messageType === 'image' ? (
                            <img src={msg.mediaUrl} alt="Image" style={{ maxWidth: 280, borderRadius: 16, boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.1)' }} />
                          ) : (
                            <div style={{
                              padding: '12px 18px', borderRadius: 20,
                              borderTopLeftRadius: isAgent ? 20 : 6, borderTopRightRadius: isAgent ? 6 : 20,
                              background: isAgent ? colors.bubbleAgent : colors.bubbleUser, 
                              color: isAgent ? '#fff' : colors.textPrimary,
                              boxShadow: isAgent ? `0 4px 16px ${colors.accentGlow}` : (isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.06)'),
                            }}>
                              <p style={{ fontSize: 14, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5, fontWeight: 400 }}>{msg.content}</p>
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, justifyContent: isAgent ? 'flex-end' : 'flex-start', paddingLeft: isAgent ? 0 : 4, paddingRight: isAgent ? 4 : 0 }}>
                            <span style={{ fontSize: 11, color: colors.textMuted }}>
                              {new Date(msg.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isAgent && <span style={{ color: msg.status === 'read' ? colors.accent : colors.textMuted }}>{msg.status === 'read' ? <CheckCheck size={14} /> : <Check size={14} />}</span>}
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

            {/* Input */}
            <div style={{ padding: '16px 24px 20px', background: colors.bgSecondary, borderTop: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: colors.bgCard, borderRadius: 16, padding: '8px 8px 8px 20px', border: `1px solid ${colors.border}` }}>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(message); } }}
                  placeholder="พิมพ์ข้อความ..."
                  style={{ flex: 1, height: 44, border: 'none', background: 'transparent', color: colors.textPrimary, fontSize: 15, outline: 'none' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button onClick={() => setShowQuickReplies(!showQuickReplies)} style={{
                    width: 40, height: 40, borderRadius: 12, border: 'none',
                    background: showQuickReplies ? colors.accentLight : 'transparent',
                    color: showQuickReplies ? colors.accent : colors.textMuted, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}><Bookmark size={20} /></button>
                  <button style={{ width: 40, height: 40, borderRadius: 12, border: 'none', background: 'transparent', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Paperclip size={20} /></button>
                  <button style={{ width: 40, height: 40, borderRadius: 12, border: 'none', background: 'transparent', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={20} /></button>
                  <button style={{ width: 40, height: 40, borderRadius: 12, border: 'none', background: 'transparent', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Smile size={20} /></button>
                  <button
                    onClick={() => sendMessage(message)}
                    disabled={!message.trim() || isSending}
                    style={{
                      width: 44, height: 44, borderRadius: 14, border: 'none',
                      background: message.trim() && !isSending ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentHover} 100%)` : colors.bgTertiary,
                      color: message.trim() && !isSending ? '#fff' : colors.textMuted,
                      cursor: message.trim() && !isSending ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: message.trim() && !isSending ? `0 4px 12px ${colors.accentGlow}` : 'none',
                    }}
                  >
                    {isSending ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={20} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL */}
          {showRightPanel && (
            <div style={{ width: 320, background: colors.bgSecondary, borderLeft: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              {/* Profile */}
              <div style={{ padding: 28, textAlign: 'center', background: isDark ? 'linear-gradient(180deg, #1c1c1c 0%, #161616 100%)' : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
                  {selectedRoomData.pictureUrl ? (
                    <img src={selectedRoomData.pictureUrl} alt={selectedRoomData.displayName} style={{ width: 88, height: 88, borderRadius: 24, objectFit: 'cover', border: `3px solid ${colors.accent}30` }} />
                  ) : (
                    <div style={{
                      width: 88, height: 88, borderRadius: 24, 
                      background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentHover} 100%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 32, fontWeight: 700,
                      boxShadow: `0 8px 24px ${colors.accentGlow}`,
                    }}>
                      {selectedRoomData.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{ position: 'absolute', bottom: 2, right: 2, width: 20, height: 20, borderRadius: '50%', background: colors.online, border: `3px solid ${colors.bgSecondary}`, boxShadow: `0 0 12px ${colors.online}` }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: colors.textPrimary, margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>{selectedRoomData.displayName}</h3>
                <p style={{ fontSize: 13, color: colors.textMuted, margin: '0 0 20px 0', fontFamily: 'monospace' }}>{selectedRoomData.lineUserId}</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                  <button style={{ padding: '10px 20px', borderRadius: 12, border: `1px solid ${colors.border}`, background: colors.bgCard, color: colors.textPrimary, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={16} />Follow up
                  </button>
                  <button style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentHover} 100%)`, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: `0 4px 12px ${colors.accentGlow}` }}>
                    <Check size={16} />Resolve
                  </button>
                </div>
              </div>

              {/* Info Sections */}
              <div style={{ flex: 1, padding: '8px 16px 16px' }}>
                {/* Tags */}
                <div style={{ background: colors.bgCard, borderRadius: 16, padding: 16, marginBottom: 12, border: `1px solid ${colors.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>แท็ก</span>
                    <button style={{ background: colors.accentLight, border: 'none', color: colors.accent, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '6px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Plus size={14} /> เพิ่ม
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {selectedRoomData.tags?.length > 0 ? (
                      selectedRoomData.tags.map((tag, i) => (
                        <span key={i} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: tag === 'VIP' ? `${colors.warning}20` : colors.accentLight, color: tag === 'VIP' ? colors.warning : colors.accent }}>{tag}</span>
                      ))
                    ) : (
                      <span style={{ fontSize: 13, color: colors.textMuted }}>ยังไม่มีแท็ก</span>
                    )}
                  </div>
                </div>

                {/* Assigned */}
                <div style={{ background: colors.bgCard, borderRadius: 16, padding: 16, marginBottom: 12, border: `1px solid ${colors.border}` }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 12 }}>ผู้รับผิดชอบ</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentHover} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, fontWeight: 700 }}>A</div>
                      <div>
                        <p style={{ fontSize: 14, color: colors.textPrimary, fontWeight: 600, margin: 0 }}>Admin</p>
                        <p style={{ fontSize: 12, color: colors.textMuted, margin: 0 }}>ผู้ดูแลระบบ</p>
                      </div>
                    </div>
                    <button style={{ width: 36, height: 36, borderRadius: 10, background: colors.bgTertiary, border: 'none', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Settings size={16} /></button>
                  </div>
                </div>

                {/* Notes */}
                <div style={{ background: colors.bgCard, borderRadius: 16, padding: 16, border: `1px solid ${colors.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>บันทึก</span>
                    <span style={{ fontSize: 11, color: colors.textMuted, background: colors.bgTertiary, padding: '4px 8px', borderRadius: 6 }}>0 รายการ</span>
                  </div>
                  <div style={{ background: colors.bgTertiary, borderRadius: 12, padding: 16, marginBottom: 12, border: `1px dashed ${colors.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: colors.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileText size={18} style={{ color: colors.accent }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 13, color: colors.textPrimary, fontWeight: 600, margin: '0 0 4px 0' }}>เก็บบันทึกที่นี่</p>
                        <p style={{ fontSize: 12, color: colors.textMuted, margin: 0, lineHeight: 1.5 }}>บันทึกข้อมูลสำคัญเกี่ยวกับลูกค้ารายนี้</p>
                      </div>
                    </div>
                  </div>
                  <button style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: 'none', background: colors.accentLight, color: colors.accent, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Plus size={18} /> เพิ่มบันทึก
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Empty State */
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: isDark ? 'linear-gradient(180deg, #0f0f0f 0%, #161616 100%)' : 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
          padding: 40,
        }}>
          <div style={{ width: 120, height: 120, borderRadius: 32, background: colors.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28, position: 'relative' }}>
            <MessageCircle size={56} style={{ color: colors.accent }} />
            <div style={{ position: 'absolute', top: -4, right: -4, width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentHover} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${colors.accentGlow}` }}>
              <span style={{ color: '#fff', fontSize: 16 }}>💬</span>
            </div>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: colors.textPrimary, margin: '0 0 12px 0', letterSpacing: '-0.02em' }}>LINE Chat Center</h2>
          <p style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', maxWidth: 320, margin: '0 0 32px 0', lineHeight: 1.6 }}>
            เลือกการสนทนาจากรายการด้านซ้าย เพื่อเริ่มตอบแชทกับลูกค้า
          </p>
          <div style={{ padding: '14px 24px', borderRadius: 14, background: colors.bgCard, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 12, boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.04)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: isConnected ? colors.online : colors.warning, boxShadow: isConnected ? `0 0 12px ${colors.online}` : 'none' }} />
            <span style={{ fontSize: 14, color: colors.textSecondary, fontWeight: 500 }}>{isConnected ? 'ระบบพร้อมรับข้อความใหม่' : 'กำลังเชื่อมต่อ...'}</span>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` }} />
    </div>
  );
}
