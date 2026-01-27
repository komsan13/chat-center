import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import path from 'path';
import { LineBotService } from '@/lib/line-bot';

// Database connection
function getDb() {
  const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  return new Database(dbPath);
}

// Generate unique ID
function generateId(prefix: string = '') {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Global event store for real-time updates
declare global {
  // eslint-disable-next-line no-var
  var __chatEvents: ChatEvent[];
  // eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
  var __io: any;
  // eslint-disable-next-line no-var
  var __broadcastToRoom: ((roomId: string, event: string, data: unknown) => void) | undefined;
  // eslint-disable-next-line no-var
  var __broadcast: ((event: string, data: unknown) => void) | undefined;
}

if (!global.__chatEvents) {
  global.__chatEvents = [];
}

interface ChatEvent {
  id: string;
  type: string;
  data: unknown;
  timestamp: number;
}

function emitChatEvent(type: string, data: unknown, roomId?: string) {
  const event: ChatEvent = {
    id: generateId('evt_'),
    type,
    data,
    timestamp: Date.now(),
  };
  
  global.__chatEvents.push(event);
  
  // Keep only last 100 events and clean old events (older than 5 minutes)
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  global.__chatEvents = global.__chatEvents
    .filter(e => e.timestamp > fiveMinutesAgo)
    .slice(-100);
  
  // Emit via Socket.IO - use broadcastToRoom for room-specific events
  if (roomId && global.__broadcastToRoom) {
    global.__broadcastToRoom(roomId, type, data);
    console.log(`[Socket.IO] Broadcast to room ${roomId}: ${type}`);
  } else if (global.__broadcast) {
    global.__broadcast(type, data);
    console.log(`[Socket.IO] Broadcast: ${type}`);
  } else if (global.__io) {
    global.__io.to('all-rooms').emit(type, data);
    console.log(`[Socket.IO] Emitted: ${type}`);
  }
  
  console.log(`[Chat Event] Emitted: ${type}`, data);
}

// Type definitions
interface LineEvent {
  type: string;
  replyToken?: string;
  timestamp: number;
  source: {
    type: string;
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  message?: {
    type: string;
    id: string;
    text?: string;
    packageId?: string;
    stickerId?: string;
    stickerResourceType?: string;
    keywords?: string[];
    emojis?: Array<{
      index: number;
      length: number;
      productId: string;
      emojiId: string;
    }>;
    contentProvider?: {
      type: string;
      originalContentUrl?: string;
      previewImageUrl?: string;
    };
  };
  postback?: {
    data: string;
    params?: Record<string, string>;
  };
}

interface LineTokenRecord {
  id: string;
  name: string;
  channelId: string;
  channelSecret: string;
  accessToken: string;
  websiteId?: string;
  websiteName?: string;
  status: string;
}

interface ChatRoomRecord {
  id: string;
  lineUserId: string;
  lineTokenId?: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  unreadCount: number;
  isPinned: number;
  isMuted: number;
  tags: string;
  status: string;
}

// POST - รับ webhook events จาก LINE
export async function POST(request: NextRequest) {
  const db = getDb();
  
  try {
    const body = await request.text();
    const signature = request.headers.get('x-line-signature') || '';
    
    const events = JSON.parse(body);
    console.log('[LINE Webhook] Received:', JSON.stringify(events, null, 2));

    // Get ALL active LINE tokens for signature verification
    const allTokens = db.prepare('SELECT * FROM LineToken WHERE status = ?').all('active') as LineTokenRecord[];

    if (allTokens.length === 0) {
      console.warn('[LINE Webhook] No active LINE token found');
      return NextResponse.json({ success: true });
    }

    // Try to verify signature with any of the active tokens
    let matchedToken: LineTokenRecord | null = null;
    
    if (process.env.NODE_ENV === 'production') {
      for (const token of allTokens) {
        const hash = crypto
          .createHmac('sha256', token.channelSecret)
          .update(body)
          .digest('base64');
        
        if (hash === signature) {
          matchedToken = token;
          console.log(`[LINE Webhook] Signature matched with token: ${token.name}`);
          break;
        }
      }
      
      if (!matchedToken) {
        console.error('[LINE Webhook] Invalid signature - no matching token found');
        console.error('[LINE Webhook] Tried tokens:', allTokens.map(t => t.name).join(', '));
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else {
      // In development, use first token
      matchedToken = allTokens[0];
    }

    // Process events with the matched token
    if (events.events && Array.isArray(events.events)) {
      for (const event of events.events) {
        await handleEvent(db, event, matchedToken);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[LINE Webhook] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    db.close();
  }
}

// GET - Verify webhook URL
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'LINE Webhook endpoint is ready',
    timestamp: new Date().toISOString()
  });
}

// Handle different event types
async function handleEvent(db: Database.Database, event: LineEvent, lineToken: LineTokenRecord) {
  const lineUserId = event.source.userId;
  if (!lineUserId) {
    console.warn('[LINE Webhook] No userId in event');
    return;
  }

  console.log(`[LINE Webhook] Processing ${event.type} from ${lineUserId}`);

  switch (event.type) {
    case 'message':
      await handleMessage(db, event, lineToken);
      break;
    case 'follow':
      await handleFollow(db, event, lineToken);
      break;
    case 'unfollow':
      await handleUnfollow(db, lineUserId);
      break;
    case 'postback':
      console.log('[LINE Webhook] Postback:', event.postback?.data);
      break;
  }
}

// Handle message event
async function handleMessage(db: Database.Database, event: LineEvent, lineToken: LineTokenRecord) {
  const lineUserId = event.source.userId!;
  const message = event.message;
  
  if (!message) return;

  // Get or create chat room
  let room = db.prepare('SELECT * FROM LineChatRoom WHERE lineUserId = ?').get(lineUserId) as ChatRoomRecord | undefined;
  
  if (!room) {
    // Get user profile from LINE
    const botService = new LineBotService(lineToken.accessToken, lineToken.channelSecret);
    const profile = await botService.getProfile(lineUserId);
    
    const roomId = generateId('room_');
    const now = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO LineChatRoom (id, lineUserId, lineTokenId, displayName, pictureUrl, statusMessage, language, lastMessageAt, unreadCount, isPinned, isMuted, tags, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      roomId,
      lineUserId,
      lineToken.id,
      profile?.displayName || lineUserId,
      profile?.pictureUrl || null,
      profile?.statusMessage || null,
      profile?.language || 'th',
      now,
      1,
      0,
      0,
      '[]',
      'active',
      now,
      now
    );
    
    room = { 
      id: roomId, 
      lineUserId, 
      lineTokenId: lineToken.id,
      displayName: profile?.displayName || lineUserId, 
      pictureUrl: profile?.pictureUrl,
      statusMessage: profile?.statusMessage,
      unreadCount: 1,
      isPinned: 0,
      isMuted: 0,
      tags: '[]',
      status: 'active'
    };
    
    // Emit new room event
    emitChatEvent('new-room', {
      id: roomId,
      lineUserId,
      lineTokenId: lineToken.id,
      displayName: profile?.displayName || lineUserId,
      pictureUrl: profile?.pictureUrl,
      statusMessage: profile?.statusMessage,
      unreadCount: 1,
      isPinned: false,
      isMuted: false,
      tags: [],
      status: 'active',
      createdAt: now,
    });
  }

  // Create message record
  const messageId = generateId('msg_');
  const now = new Date().toISOString();
  
  let content = '';
  let mediaUrl = null;
  let stickerId = null;
  let packageId = null;
  
  // Store emoji data as JSON if present
  let emojisData: string | null = null;
  
  switch (message.type) {
    case 'text':
      content = message.text || '';
      // If message has LINE emojis, store them for rendering
      if (message.emojis && message.emojis.length > 0) {
        emojisData = JSON.stringify(message.emojis.map(e => ({
          index: e.index,
          length: e.length,
          productId: e.productId,
          emojiId: e.emojiId,
          url: `https://stickershop.line-scdn.net/sticonshop/v1/sticon/${e.productId}/iPhone/${e.emojiId}.png`
        })));
      }
      break;
    case 'image':
    case 'video':
    case 'audio':
    case 'file':
      mediaUrl = `/api/line/media/${message.id}?token=${lineToken.id}`;
      content = `[${message.type}]`;
      break;
    case 'sticker':
      stickerId = message.stickerId;
      packageId = message.packageId;
      content = `[sticker:${packageId}/${stickerId}]`;
      break;
    case 'location':
      content = '[location]';
      break;
  }

  db.prepare(`
    INSERT INTO LineChatMessage (id, roomId, lineMessageId, messageType, content, mediaUrl, stickerId, packageId, emojis, sender, senderName, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    messageId,
    room.id,
    message.id,
    message.type,
    content,
    mediaUrl,
    stickerId,
    packageId,
    emojisData,
    'user',
    room.displayName,
    'sent',
    now
  );

  // Update room's last message and unread count
  db.prepare(`
    UPDATE LineChatRoom 
    SET lastMessageAt = ?, unreadCount = unreadCount + 1, updatedAt = ?
    WHERE id = ?
  `).run(now, now, room.id);

  // Get updated unread count from database
  const updatedRoom = db.prepare('SELECT unreadCount FROM LineChatRoom WHERE id = ?').get(room.id) as { unreadCount: number } | undefined;
  const newUnreadCount = updatedRoom?.unreadCount || 1;
  console.log(`[LINE Webhook] Room ${room.id} unreadCount updated to: ${newUnreadCount}`);

  // Emit new message event
  const messageData = {
    id: messageId,
    roomId: room.id,
    lineMessageId: message.id,
    messageType: message.type,
    content,
    mediaUrl,
    stickerId,
    packageId,
    emojis: emojisData ? JSON.parse(emojisData) : null,
    sender: 'user',
    senderName: room.displayName,
    status: 'sent',
    createdAt: now,
  };
  
  // Broadcast new message to all clients
  emitChatEvent('new-message', messageData, room.id);
  
  // Also emit room update with correct unreadCount from database
  console.log(`[LINE Webhook] Broadcasting room-update with unreadCount: ${newUnreadCount}`);
  emitChatEvent('room-update', {
    id: room.id,
    displayName: room.displayName,
    pictureUrl: room.pictureUrl,
    status: room.status,
    lastMessage: messageData,
    lastMessageAt: now,
    unreadCount: newUnreadCount,
  }, room.id);

  console.log(`[LINE Webhook] Message saved: ${messageId}`);
}

// Handle follow event (new friend)
async function handleFollow(db: Database.Database, event: LineEvent, lineToken: LineTokenRecord) {
  const lineUserId = event.source.userId!;
  
  // Check if room exists
  const existingRoom = db.prepare('SELECT id FROM LineChatRoom WHERE lineUserId = ?').get(lineUserId) as { id: string } | undefined;
  
  if (existingRoom) {
    db.prepare(`UPDATE LineChatRoom SET status = 'active', updatedAt = ? WHERE lineUserId = ?`)
      .run(new Date().toISOString(), lineUserId);
    return;
  }

  // Get profile and create room
  const botService = new LineBotService(lineToken.accessToken, lineToken.channelSecret);
  const profile = await botService.getProfile(lineUserId);
  
  const roomId = generateId('room_');
  const now = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO LineChatRoom (id, lineUserId, lineTokenId, displayName, pictureUrl, statusMessage, language, lastMessageAt, unreadCount, isPinned, isMuted, tags, status, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    roomId,
    lineUserId,
    lineToken.id,
    profile?.displayName || lineUserId,
    profile?.pictureUrl || null,
    profile?.statusMessage || null,
    profile?.language || 'th',
    now,
    0,
    0,
    0,
    '["New"]',
    'active',
    now,
    now
  );

  // Create system message
  const messageId = generateId('msg_');
  db.prepare(`
    INSERT INTO LineChatMessage (id, roomId, messageType, content, sender, senderName, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(messageId, roomId, 'text', '🎉 ผู้ใช้ใหม่เพิ่มเพื่อน', 'system', 'System', 'sent', now);

  // Emit new room event
  emitChatEvent('new-room', {
    id: roomId,
    lineUserId,
    lineTokenId: lineToken.id,
    displayName: profile?.displayName || lineUserId,
    pictureUrl: profile?.pictureUrl,
    statusMessage: profile?.statusMessage,
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    tags: ['New'],
    status: 'active',
    createdAt: now,
  });

  console.log(`[LINE Webhook] New follower: ${profile?.displayName || lineUserId}`);
}

// Handle unfollow event
async function handleUnfollow(db: Database.Database, lineUserId: string) {
  db.prepare(`UPDATE LineChatRoom SET status = 'archived', updatedAt = ? WHERE lineUserId = ?`)
    .run(new Date().toISOString(), lineUserId);
  
  console.log(`[LINE Webhook] User unfollowed: ${lineUserId}`);
}
