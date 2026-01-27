import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db, lineTokens, lineChatRooms, lineChatMessages, generateId } from '@/lib/db';
import { eq, and, sql } from 'drizzle-orm';

// Global broadcast function declaration - use 'any' to avoid type conflicts
declare global {
  // eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
  var __broadcastToRoom: ((roomId: string, event: string, data: unknown) => void) | undefined;
  // eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
  var __broadcast: ((event: string, data: unknown) => void) | undefined;
  // eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
  var __io: any;
}

async function reliableBroadcast(event: string, data: unknown, room: string = 'all-rooms'): Promise<boolean> {
  let success = false;
  
  if (room === 'all-rooms' && global.__broadcast) {
    try {
      global.__broadcast(event, data);
      console.log(`[Webhook Broadcast] Method 1 (global.__broadcast): ${event}`);
      success = true;
    } catch (e) {
      console.warn(`[Webhook Broadcast] Method 1 failed:`, e);
    }
  }
  
  if (!success && global.__io) {
    try {
      global.__io.to(room).emit(event, data);
      console.log(`[Webhook Broadcast] Method 2 (global.__io): ${event} -> ${room}`);
      success = true;
    } catch (e) {
      console.warn(`[Webhook Broadcast] Method 2 failed:`, e);
    }
  }
  
  if (!success) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                      'http://localhost:3001';
      
      const response = await fetch(`${baseUrl}/api/internal/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': 'aurix-internal-2024',
        },
        body: JSON.stringify({ event, data, room }),
      });
      
      if (response.ok) {
        console.log(`[Webhook Broadcast] Method 3 (HTTP): ${event} -> ${room}`);
        success = true;
      }
    } catch (e) {
      console.warn(`[Webhook Broadcast] Method 3 failed:`, e);
    }
  }
  
  return success;
}

async function reliableBroadcastToRoom(roomId: string, event: string, data: unknown): Promise<boolean> {
  let success = false;
  
  if (global.__broadcastToRoom) {
    try {
      global.__broadcastToRoom(roomId, event, data);
      console.log(`[Webhook Broadcast] broadcastToRoom: ${event} -> room:${roomId}`);
      success = true;
    } catch (e) {
      console.warn(`[Webhook Broadcast] broadcastToRoom failed:`, e);
    }
  }
  
  if (!success && global.__io) {
    try {
      if (roomId) {
        global.__io.to(roomId).emit(event, data);
      }
      global.__io.to('all-rooms').emit(event, data);
      success = true;
    } catch (e) {
      console.warn(`[Webhook Broadcast] io failed:`, e);
    }
  }
  
  if (!success) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                      'http://localhost:3001';
      
      if (roomId) {
        await fetch(`${baseUrl}/api/internal/broadcast`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-token': 'aurix-internal-2024',
          },
          body: JSON.stringify({ event, data, room: roomId }),
        });
      }
      
      const response = await fetch(`${baseUrl}/api/internal/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': 'aurix-internal-2024',
        },
        body: JSON.stringify({ event, data, room: 'all-rooms' }),
      });
      
      if (response.ok) success = true;
    } catch (e) {
      console.warn(`[Webhook Broadcast] HTTP failed:`, e);
    }
  }
  
  return success;
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

interface LineEvent {
  type: string;
  replyToken?: string;
  timestamp: number;
  source: {
    type: string;
    userId?: string;
  };
  message?: {
    type: string;
    id: string;
    text?: string;
    packageId?: string;
    stickerId?: string;
    emojis?: Array<{
      index: number;
      length: number;
      productId: string;
      emojiId: string;
    }>;
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  const { tokenId } = await params;
  
  try {
    const body = await request.text();
    const signature = request.headers.get('x-line-signature') || '';
    
    console.log(`[LINE Webhook/${tokenId}] Received webhook`);

    const [token] = await db.select().from(lineTokens).where(eq(lineTokens.id, tokenId));

    if (!token) {
      console.error(`[LINE Webhook/${tokenId}] Token not found`);
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    if (token.status !== 'active') {
      console.warn(`[LINE Webhook/${tokenId}] Token is inactive`);
      return NextResponse.json({ success: true, message: 'Token inactive' });
    }

    if (process.env.NODE_ENV === 'production') {
      const hash = crypto
        .createHmac('sha256', token.channelSecret)
        .update(body)
        .digest('base64');
      
      if (hash !== signature) {
        console.error(`[LINE Webhook/${tokenId}] Invalid signature for token: ${token.name}`);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
      
      console.log(`[LINE Webhook/${tokenId}] Signature verified for: ${token.name}`);
    }

    const events = JSON.parse(body);

    if (events.events && Array.isArray(events.events)) {
      for (const event of events.events) {
        await handleEvent(event, token);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[LINE Webhook/${tokenId}] Error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleEvent(event: LineEvent, token: LineTokenRecord) {
  const userId = event.source?.userId;
  if (!userId) return;

  console.log(`[LINE Webhook/${token.id}] Processing event type: ${event.type} for user: ${userId}`);

  let [room] = await db.select().from(lineChatRooms)
    .where(and(
      eq(lineChatRooms.lineUserId, userId),
      eq(lineChatRooms.lineTokenId, token.id)
    ));
  
  if (!room) {
    let displayName = 'LINE User';
    let pictureUrl = '';
    let statusMessage = '';
    
    try {
      const profileResponse = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
        headers: { 'Authorization': `Bearer ${token.accessToken}` }
      });
      
      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        displayName = profile.displayName || displayName;
        pictureUrl = profile.pictureUrl || '';
        statusMessage = profile.statusMessage || '';
      }
    } catch (e) {
      console.error('Failed to fetch LINE profile:', e);
    }
    
    const roomId = 'room_' + generateId();
    const now = new Date();
    
    await db.insert(lineChatRooms).values({
      id: roomId,
      lineUserId: userId,
      lineTokenId: token.id,
      displayName,
      pictureUrl: pictureUrl || null,
      statusMessage: statusMessage || null,
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      tags: '[]',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    
    [room] = await db.select().from(lineChatRooms).where(eq(lineChatRooms.id, roomId));
    
    console.log(`[LINE Webhook/${token.id}] Created new room: ${roomId} for user: ${displayName}`);
    
    const newRoomData = {
      id: roomId,
      lineUserId: userId,
      lineTokenId: token.id,
      displayName,
      pictureUrl,
      statusMessage,
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      tags: [],
      status: 'active',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    
    await reliableBroadcast('new-room', newRoomData);
    console.log(`[LINE Webhook/${token.id}] Broadcast new-room: ${roomId}`);
  }

  if (event.type === 'message' && event.message) {
    const msg = event.message;
    const msgId = 'msg_' + generateId();
    const now = new Date();
    
    let content = '';
    let messageType = msg.type;
    let stickerId: string | null = null;
    let stickerPackageId: string | null = null;
    let emojisJson: string | null = null;
    let mediaUrl: string | null = null;
    
    if (msg.type === 'text') {
      content = msg.text || '';
      if (msg.emojis && msg.emojis.length > 0) {
        emojisJson = JSON.stringify(msg.emojis);
      }
    } else if (msg.type === 'sticker') {
      messageType = 'sticker';
      stickerId = msg.stickerId || null;
      stickerPackageId = msg.packageId || null;
      content = `[Sticker]`;
    } else if (msg.type === 'image') {
      messageType = 'image';
      content = '[Image]';
      mediaUrl = `https://api-data.line.me/v2/bot/message/${msg.id}/content`;
    } else if (msg.type === 'video') {
      messageType = 'video';
      content = '[Video]';
      mediaUrl = `https://api-data.line.me/v2/bot/message/${msg.id}/content`;
    } else if (msg.type === 'audio') {
      messageType = 'audio';
      content = '[Audio]';
      mediaUrl = `https://api-data.line.me/v2/bot/message/${msg.id}/content`;
    } else if (msg.type === 'file') {
      messageType = 'file';
      content = '[File]';
      mediaUrl = `https://api-data.line.me/v2/bot/message/${msg.id}/content`;
    }
    
    await db.insert(lineChatMessages).values({
      id: msgId,
      roomId: room.id,
      lineMessageId: msg.id,
      content,
      messageType,
      sender: 'user',
      stickerId,
      stickerPackageId,
      emojis: emojisJson,
      mediaUrl,
      createdAt: now,
    });
    
    await db.update(lineChatRooms)
      .set({
        lastMessage: content,
        lastMessageAt: now,
        unreadCount: sql`${lineChatRooms.unreadCount} + 1`,
        updatedAt: now,
      })
      .where(eq(lineChatRooms.id, room.id));
    
    const messageData = {
      id: msgId,
      roomId: room.id,
      lineMessageId: msg.id,
      lineTokenId: token.id,
      messageType: messageType,
      content,
      sender: 'user',
      senderName: room.displayName,
      status: 'sent',
      stickerId,
      packageId: stickerPackageId,
      emojis: msg.emojis,
      mediaUrl,
      createdAt: now.toISOString(),
    };
    
    await reliableBroadcastToRoom(room.id, 'new-message', messageData);
    console.log(`[LINE Webhook/${token.id}] Broadcast new-message to room ${room.id}`);
    
    await reliableBroadcast('room-update', {
      id: room.id,
      lineTokenId: token.id,
      displayName: room.displayName,
      pictureUrl: room.pictureUrl,
      status: 'active',
      lastMessage: messageData,
      lastMessageAt: now.toISOString(),
      unreadCount: (room.unreadCount || 0) + 1,
    });
    console.log(`[LINE Webhook/${token.id}] Broadcast room-update`);
    
    console.log(`[LINE Webhook/${token.id}] Saved message: ${msgId} to room: ${room.id}`);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  const { tokenId } = await params;
  return NextResponse.json({ 
    success: true, 
    message: `LINE Webhook endpoint for token: ${tokenId}`,
    timestamp: new Date().toISOString()
  });
}
