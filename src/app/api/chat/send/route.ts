import { NextRequest, NextResponse } from 'next/server';
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

// Global event store and Socket.IO broadcast
declare global {
  // eslint-disable-next-line no-var
  var __chatEvents: ChatEvent[];
  // eslint-disable-next-line no-var
  var __broadcastToRoom: ((roomId: string, event: string, data: unknown) => void) | undefined;
  // eslint-disable-next-line no-var
  var __broadcast: ((event: string, data: unknown) => void) | undefined;
}

interface ChatEvent {
  id: string;
  type: string;
  data: unknown;
  timestamp: number;
}

function emitChatEvent(type: string, data: unknown, roomId?: string) {
  if (!global.__chatEvents) {
    global.__chatEvents = [];
  }
  
  const event: ChatEvent = {
    id: generateId('evt_'),
    type,
    data,
    timestamp: Date.now(),
  };
  
  global.__chatEvents.push(event);
  
  // Keep only last 100 events
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  global.__chatEvents = global.__chatEvents
    .filter(e => e.timestamp > fiveMinutesAgo)
    .slice(-100);
    
  // Broadcast via Socket.IO to all clients
  if (roomId && global.__broadcastToRoom) {
    global.__broadcastToRoom(roomId, type, data);
  } else if (global.__broadcast) {
    global.__broadcast(type, data);
  }
}

// POST - Send message to LINE user
export async function POST(request: NextRequest) {
  const db = getDb();
  
  try {
    const body = await request.json();
    const { roomId, content, messageType = 'text', stickerId, packageId, mediaUrl } = body;

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    if (!content && messageType === 'text') {
      return NextResponse.json({ error: 'Content is required for text messages' }, { status: 400 });
    }

    // Get room info
    const room = db.prepare('SELECT * FROM LineChatRoom WHERE id = ?').get(roomId) as RoomRecord | undefined;
    
    if (!room) {
      return NextResponse.json({ error: 'Chat room not found' }, { status: 404 });
    }

    // Get LINE token
    const lineToken = db.prepare('SELECT * FROM LineToken WHERE id = ? AND status = ?').get(room.lineTokenId, 'active') as LineTokenRecord | undefined;
    
    if (!lineToken) {
      // Try to get any active token
      const anyToken = db.prepare('SELECT * FROM LineToken WHERE status = ? ORDER BY createdAt DESC LIMIT 1').get('active') as LineTokenRecord | undefined;
      if (!anyToken) {
        return NextResponse.json({ error: 'No active LINE token found' }, { status: 400 });
      }
      Object.assign(lineToken || {}, anyToken);
    }

    const activeToken = lineToken!;

    // Create message in database first
    const messageId = generateId('msg_');
    const now = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO LineChatMessage (id, roomId, messageType, content, mediaUrl, stickerId, packageId, sender, senderName, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      messageId,
      roomId,
      messageType,
      content || '',
      mediaUrl || null,
      stickerId || null,
      packageId || null,
      'agent',
      'Admin', // Could be dynamic based on logged-in user
      'sending',
      now
    );

    // Emit sending event
    const messageData = {
      id: messageId,
      roomId,
      messageType,
      content,
      mediaUrl,
      stickerId,
      packageId,
      sender: 'agent',
      senderName: 'Admin',
      status: 'sending',
      createdAt: now,
    };
    
    emitChatEvent('new-message', messageData);

    // Send to LINE
    const botService = new LineBotService(activeToken.accessToken, activeToken.channelSecret);
    let sendResult;

    try {
      switch (messageType) {
        case 'text':
          sendResult = await botService.sendTextMessage(room.lineUserId, content);
          break;
        case 'sticker':
          if (packageId && stickerId) {
            sendResult = await botService.sendSticker(room.lineUserId, packageId, stickerId);
          }
          break;
        case 'image':
          if (mediaUrl) {
            sendResult = await botService.sendImage(room.lineUserId, mediaUrl);
          }
          break;
        default:
          sendResult = await botService.sendTextMessage(room.lineUserId, content);
      }
    } catch (lineError) {
      console.error('[Send Message API] LINE error:', lineError);
      sendResult = { success: false, error: String(lineError) };
    }

    // Update message status
    const finalStatus = sendResult?.success ? 'sent' : 'failed';
    
    db.prepare(`UPDATE LineChatMessage SET status = ? WHERE id = ?`).run(finalStatus, messageId);

    // Update room's last message time
    db.prepare(`UPDATE LineChatRoom SET lastMessageAt = ?, updatedAt = ? WHERE id = ?`).run(now, now, roomId);

    // Update LINE token's lastUsed
    db.prepare(`UPDATE LineToken SET lastUsed = ?, updatedAt = ? WHERE id = ?`).run(now, now, activeToken.id);

    const finalMessage = { ...messageData, status: finalStatus };

    // Broadcast new message to all clients via Socket.IO
    emitChatEvent('new-message', finalMessage, roomId);

    // Emit room update to update room list
    emitChatEvent('room-update', {
      id: roomId,
      lastMessage: finalMessage,
      lastMessageAt: now,
    }, roomId);

    const response: SendMessageResponse = {
      success: sendResult?.success || false,
      message: {
        ...messageData,
        status: finalStatus,
      },
    };

    if (!sendResult?.success) {
      response.error = sendResult?.error || 'Failed to send message to LINE';
    }

    return NextResponse.json(response, { status: sendResult?.success ? 200 : 500 });
  } catch (error) {
    console.error('[Send Message API] Error:', error);
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send message' 
    }, { status: 500 });
  } finally {
    db.close();
  }
}

interface RoomRecord {
  id: string;
  lineUserId: string;
  lineTokenId?: string;
  displayName: string;
}

interface LineTokenRecord {
  id: string;
  name: string;
  channelId: string;
  channelSecret: string;
  accessToken: string;
  websiteId?: string;
  status: string;
}

interface SendMessageResponse {
  success: boolean;
  message?: unknown;
  error?: string;
}
