import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db, lineTokens, lineChatRooms, lineChatMessages, generateId } from '@/lib/db';
import { eq, and, sql } from 'drizzle-orm';
import { LineBotService } from '@/lib/line-bot';

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
    id: 'evt_' + generateId(),
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
  websiteId: string | null;
  websiteName: string | null;
  status: string;
}

interface ChatRoomRecord {
  id: string;
  lineUserId: string;
  lineTokenId: string | null;
  displayName: string;
  pictureUrl: string | null;
  statusMessage: string | null;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  tags: string;
  status: string;
}

// POST - รับ webhook events จาก LINE
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-line-signature') || '';
    
    const events = JSON.parse(body);
    console.log('[LINE Webhook] Received:', JSON.stringify(events, null, 2));

    // Get ALL LINE tokens (including inactive) for signature verification
    const allTokens = await db.select().from(lineTokens);

    if (allTokens.length === 0) {
      console.warn('[LINE Webhook] No LINE token found in database');
      return NextResponse.json({ success: true });
    }

    // Try to verify signature with ALL tokens (active and inactive)
    let matchedToken: LineTokenRecord | null = null;
    let matchedButInactive = false;
    
    if (process.env.NODE_ENV === 'production') {
      for (const token of allTokens) {
        const hash = crypto
          .createHmac('sha256', token.channelSecret)
          .update(body)
          .digest('base64');
        
        if (hash === signature) {
          if (token.status === 'active') {
            matchedToken = token;
            console.log(`[LINE Webhook] ✅ Signature matched with ACTIVE token: ${token.name}`);
          } else {
            matchedButInactive = true;
            console.warn(`[LINE Webhook] ⚠️ Signature matched with INACTIVE token: ${token.name} - Please activate this token to receive messages`);
          }
          break;
        }
      }
      
      if (!matchedToken) {
        if (matchedButInactive) {
          // Token matched but inactive - return 200 OK so LINE doesn't retry
          console.warn('[LINE Webhook] Token is inactive, message ignored');
          return NextResponse.json({ success: true, message: 'Token inactive' });
        }
        
        console.error('[LINE Webhook] Invalid signature - no matching token found');
        console.error('[LINE Webhook] Tried tokens:', allTokens.map(t => `${t.name}(${t.status})`).join(', '));
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else {
      // In development, use first active token
      matchedToken = allTokens.find(t => t.status === 'active') || allTokens[0];
    }

    // Process events with the matched token
    if (events.events && Array.isArray(events.events)) {
      for (const event of events.events) {
        await handleEvent(event, matchedToken);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[LINE Webhook] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
async function handleEvent(event: LineEvent, lineToken: LineTokenRecord) {
  const lineUserId = event.source.userId;
  if (!lineUserId) {
    console.warn('[LINE Webhook] No userId in event');
    return;
  }

  console.log(`[LINE Webhook] Processing ${event.type} from ${lineUserId}`);

  switch (event.type) {
    case 'message':
      await handleMessage(event, lineToken);
      break;
    case 'follow':
      await handleFollow(event, lineToken);
      break;
    case 'unfollow':
      await handleUnfollow(lineUserId);
      break;
    case 'postback':
      console.log('[LINE Webhook] Postback:', event.postback?.data);
      break;
  }
}

// Handle message event
async function handleMessage(event: LineEvent, lineToken: LineTokenRecord) {
  const lineUserId = event.source.userId!;
  const message = event.message;
  
  if (!message) return;

  // Get or create chat room - must match BOTH lineUserId AND lineTokenId
  let [room] = await db.select().from(lineChatRooms)
    .where(and(
      eq(lineChatRooms.lineUserId, lineUserId),
      eq(lineChatRooms.lineTokenId, lineToken.id)
    ));
  
  if (!room) {
    // Get user profile from LINE
    const botService = new LineBotService(lineToken.accessToken, lineToken.channelSecret);
    const profile = await botService.getProfile(lineUserId);
    
    const roomId = 'room_' + generateId();
    const now = new Date();
    
    await db.insert(lineChatRooms).values({
      id: roomId,
      lineUserId,
      lineTokenId: lineToken.id,
      displayName: profile?.displayName || lineUserId,
      pictureUrl: profile?.pictureUrl || null,
      statusMessage: profile?.statusMessage || null,
      lastMessageAt: now,
      unreadCount: 1,
      isPinned: false,
      isMuted: false,
      tags: '[]',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    
    room = {
      id: roomId,
      lineUserId,
      lineTokenId: lineToken.id,
      displayName: profile?.displayName || lineUserId,
      pictureUrl: profile?.pictureUrl || null,
      statusMessage: profile?.statusMessage || null,
      lastMessage: null,
      lastMessageAt: now,
      unreadCount: 1,
      isPinned: false,
      isMuted: false,
      tags: '[]',
      status: 'active',
      assignedTo: null,
      createdAt: now,
      updatedAt: now,
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
      createdAt: now.toISOString(),
    });
  }

  // Create message record
  const messageId = 'msg_' + generateId();
  const now = new Date();
  
  let content = '';
  let mediaUrl: string | null = null;
  let stickerId: string | null = null;
  let packageId: string | null = null;
  
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
      stickerId = message.stickerId || null;
      packageId = message.packageId || null;
      content = `[sticker:${packageId}/${stickerId}]`;
      break;
    case 'location':
      content = '[location]';
      break;
  }

  await db.insert(lineChatMessages).values({
    id: messageId,
    roomId: room.id,
    lineMessageId: message.id,
    messageType: message.type,
    content,
    mediaUrl,
    stickerId,
    packageId,
    emojis: emojisData,
    sender: 'user',
    senderName: room.displayName,
    status: 'sent',
    createdAt: now,
  });

  // Update room's last message, unread count, and reset status to 'active' (in case it was 'cleared')
  await db.update(lineChatRooms)
    .set({
      lastMessageAt: now,
      unreadCount: sql`${lineChatRooms.unreadCount} + 1`,
      status: 'active',
      updatedAt: now,
    })
    .where(eq(lineChatRooms.id, room.id));

  // Get updated unread count from database
  const [updatedRoom] = await db.select({ unreadCount: lineChatRooms.unreadCount })
    .from(lineChatRooms)
    .where(eq(lineChatRooms.id, room.id));
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
    createdAt: now.toISOString(),
  };
  
  // Broadcast new message to all clients
  emitChatEvent('new-message', messageData, room.id);
  
  // Also emit room update with correct unreadCount from database
  console.log(`[LINE Webhook] Broadcasting room-update with unreadCount: ${newUnreadCount}`);
  emitChatEvent('room-update', {
    id: room.id,
    lineTokenId: room.lineTokenId,
    displayName: room.displayName,
    pictureUrl: room.pictureUrl,
    status: 'active', // Always set to active when new message comes
    lastMessage: messageData,
    lastMessageAt: now.toISOString(),
    unreadCount: newUnreadCount,
  }, room.id);

  console.log(`[LINE Webhook] Message saved: ${messageId}`);
}

// Handle follow event (new friend)
async function handleFollow(event: LineEvent, lineToken: LineTokenRecord) {
  const lineUserId = event.source.userId!;
  
  // Check if room exists
  const [existingRoom] = await db.select({ id: lineChatRooms.id })
    .from(lineChatRooms)
    .where(eq(lineChatRooms.lineUserId, lineUserId));
  
  if (existingRoom) {
    await db.update(lineChatRooms)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(lineChatRooms.lineUserId, lineUserId));
    return;
  }

  // Get profile and create room
  const botService = new LineBotService(lineToken.accessToken, lineToken.channelSecret);
  const profile = await botService.getProfile(lineUserId);
  
  const roomId = 'room_' + generateId();
  const now = new Date();
  
  await db.insert(lineChatRooms).values({
    id: roomId,
    lineUserId,
    lineTokenId: lineToken.id,
    displayName: profile?.displayName || lineUserId,
    pictureUrl: profile?.pictureUrl || null,
    statusMessage: profile?.statusMessage || null,
    lastMessageAt: now,
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    tags: '["New"]',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });

  // Create system message
  const messageId = 'msg_' + generateId();
  await db.insert(lineChatMessages).values({
    id: messageId,
    roomId,
    messageType: 'text',
    content: '🎉 ผู้ใช้ใหม่เพิ่มเพื่อน',
    sender: 'system',
    senderName: 'System',
    status: 'sent',
    createdAt: now,
  });

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
    createdAt: now.toISOString(),
  });

  console.log(`[LINE Webhook] New follower: ${profile?.displayName || lineUserId}`);
}

// Handle unfollow event
async function handleUnfollow(lineUserId: string) {
  await db.update(lineChatRooms)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(eq(lineChatRooms.lineUserId, lineUserId));
  
  console.log(`[LINE Webhook] User unfollowed: ${lineUserId}`);
}
