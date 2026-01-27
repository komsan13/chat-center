import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import path from 'path';

// Database connection
function getDb() {
  const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  return new Database(dbPath);
}

// Generate unique ID
function generateId(prefix: string = '') {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Global broadcast function
declare global {
  // eslint-disable-next-line no-var
  var __broadcastToRoom: ((roomId: string, event: string, data: unknown) => void) | undefined;
  // eslint-disable-next-line no-var
  var __broadcast: ((event: string, data: unknown) => void) | undefined;
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

// POST - รับ webhook events จาก LINE สำหรับ token เฉพาะ
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  const { tokenId } = await params;
  const db = getDb();
  
  try {
    const body = await request.text();
    const signature = request.headers.get('x-line-signature') || '';
    
    console.log(`[LINE Webhook/${tokenId}] Received webhook`);

    // Get specific token by ID
    const token = db.prepare('SELECT * FROM LineToken WHERE id = ?').get(tokenId) as LineTokenRecord | undefined;

    if (!token) {
      console.error(`[LINE Webhook/${tokenId}] Token not found`);
      db.close();
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    if (token.status !== 'active') {
      console.warn(`[LINE Webhook/${tokenId}] Token is inactive`);
      db.close();
      return NextResponse.json({ success: true, message: 'Token inactive' });
    }

    // Verify signature with this specific token
    if (process.env.NODE_ENV === 'production') {
      const hash = crypto
        .createHmac('sha256', token.channelSecret)
        .update(body)
        .digest('base64');
      
      if (hash !== signature) {
        console.error(`[LINE Webhook/${tokenId}] Invalid signature for token: ${token.name}`);
        db.close();
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
      
      console.log(`[LINE Webhook/${tokenId}] ✅ Signature verified for: ${token.name}`);
    }

    const events = JSON.parse(body);

    // Process events with this specific token
    if (events.events && Array.isArray(events.events)) {
      for (const event of events.events) {
        await handleEvent(db, event, token);
      }
    }

    db.close();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[LINE Webhook/${tokenId}] Error:`, error);
    db.close();
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handle individual event
async function handleEvent(db: Database.Database, event: LineEvent, token: LineTokenRecord) {
  const userId = event.source?.userId;
  if (!userId) return;

  console.log(`[LINE Webhook/${token.id}] Processing event type: ${event.type} for user: ${userId}`);

  // Get or create chat room
  let room = db.prepare('SELECT * FROM LineChatRoom WHERE lineUserId = ? AND lineTokenId = ?').get(userId, token.id) as ChatRoomRecord | undefined;
  
  if (!room) {
    // Fetch user profile from LINE
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
    
    // Create new room WITH lineTokenId
    const roomId = generateId('room_');
    const now = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO LineChatRoom (id, lineUserId, lineTokenId, displayName, pictureUrl, statusMessage, unreadCount, isPinned, isMuted, tags, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, '[]', 'active', ?, ?)
    `).run(roomId, userId, token.id, displayName, pictureUrl, statusMessage, now, now);
    
    room = db.prepare('SELECT * FROM LineChatRoom WHERE id = ?').get(roomId) as ChatRoomRecord;
    
    console.log(`[LINE Webhook/${token.id}] Created new room: ${roomId} for user: ${displayName}`);
  }

  // Handle message events
  if (event.type === 'message' && event.message) {
    const msg = event.message;
    const msgId = generateId('msg_');
    const now = new Date().toISOString();
    
    let content = '';
    let messageType = msg.type;
    let stickerId = null;
    let stickerPackageId = null;
    let emojisJson = null;
    let mediaUrl = null;
    
    if (msg.type === 'text') {
      content = msg.text || '';
      if (msg.emojis && msg.emojis.length > 0) {
        emojisJson = JSON.stringify(msg.emojis);
      }
    } else if (msg.type === 'sticker') {
      stickerId = msg.stickerId;
      stickerPackageId = msg.packageId;
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
    
    // Insert message
    db.prepare(`
      INSERT INTO LineChatMessage (id, roomId, lineMessageId, content, type, senderType, stickerId, stickerPackageId, emojis, mediaUrl, createdAt)
      VALUES (?, ?, ?, ?, ?, 'user', ?, ?, ?, ?, ?)
    `).run(msgId, room.id, msg.id, content, messageType, stickerId, stickerPackageId, emojisJson, mediaUrl, now);
    
    // Update room's last message and unread count
    db.prepare(`
      UPDATE LineChatRoom 
      SET lastMessage = ?, lastMessageAt = ?, unreadCount = unreadCount + 1, updatedAt = ?
      WHERE id = ?
    `).run(content, now, now, room.id);
    
    // Broadcast new message
    const messageData = {
      id: msgId,
      roomId: room.id,
      lineTokenId: token.id,
      content,
      type: messageType,
      senderType: 'user',
      stickerId,
      stickerPackageId,
      emojis: msg.emojis,
      mediaUrl,
      createdAt: now,
    };
    
    if (global.__broadcastToRoom) {
      global.__broadcastToRoom(room.id, 'new-message', messageData);
    }
    if (global.__broadcast) {
      global.__broadcast('room-updated', { roomId: room.id });
    }
    
    console.log(`[LINE Webhook/${token.id}] Saved message: ${msgId} to room: ${room.id}`);
  }
}

// GET - For LINE webhook verification
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
