import { NextRequest, NextResponse } from 'next/server';
import { LineBotService } from '@/lib/line-bot';
import { db, lineChatRooms, lineChatMessages, lineTokens, generateId } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';

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
    id: `evt_${generateId()}`,
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

interface RoomRecord {
  id: string;
  lineUserId: string;
  lineTokenId: string | null;
  displayName: string;
}

interface LineTokenRecord {
  id: string;
  name: string;
  channelId: string;
  channelSecret: string;
  accessToken: string;
  websiteId: string | null;
  status: string;
}

interface SendMessageResponse {
  success: boolean;
  message?: unknown;
  error?: string;
}

// POST - Send message to LINE user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, content, messageType = 'text', stickerId, packageId, mediaUrl, senderName = 'Agent', emojis } = body;

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    if (!content && messageType === 'text') {
      return NextResponse.json({ error: 'Content is required for text messages' }, { status: 400 });
    }

    // Get room info
    const [room] = await db
      .select()
      .from(lineChatRooms)
      .where(eq(lineChatRooms.id, roomId))
      .limit(1);
    
    if (!room) {
      return NextResponse.json({ error: 'Chat room not found' }, { status: 404 });
    }

    // Get LINE token
    let [lineToken] = room.lineTokenId 
      ? await db
          .select()
          .from(lineTokens)
          .where(eq(lineTokens.id, room.lineTokenId))
          .limit(1)
      : [];
    
    if (!lineToken) {
      // Try to get any active token
      [lineToken] = await db
        .select()
        .from(lineTokens)
        .where(eq(lineTokens.status, 'active'))
        .orderBy(desc(lineTokens.createdAt))
        .limit(1);
      
      if (!lineToken) {
        return NextResponse.json({ error: 'No active LINE token found' }, { status: 400 });
      }
    }

    // Create message in database first
    const messageId = `msg_${generateId()}`;
    const now = new Date();
    const emojisJson = emojis && Array.isArray(emojis) && emojis.length > 0 ? JSON.stringify(emojis) : null;
    
    await db.insert(lineChatMessages).values({
      id: messageId,
      roomId,
      messageType,
      content: content || '',
      mediaUrl: mediaUrl || null,
      stickerId: stickerId || null,
      packageId: packageId || null,
      emojis: emojisJson,
      sender: 'agent',
      senderName,
      status: 'sending',
      createdAt: now,
      updatedAt: now,
    });

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
      senderName: senderName,
      status: 'sending',
      createdAt: now.toISOString(),
      emojis: emojis || undefined,
    };
    
    emitChatEvent('new-message', messageData);

    // Send to LINE
    const botService = new LineBotService(lineToken.accessToken, lineToken.channelSecret);
    let sendResult;

    try {
      switch (messageType) {
        case 'text':
          if (emojis && Array.isArray(emojis) && emojis.length > 0) {
            sendResult = await botService.sendTextMessage(room.lineUserId, content, emojis);
          } else {
            sendResult = await botService.sendTextMessage(room.lineUserId, content);
          }
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
    
    await db
      .update(lineChatMessages)
      .set({ status: finalStatus, updatedAt: new Date() })
      .where(eq(lineChatMessages.id, messageId));

    // Update room's last message time
    await db
      .update(lineChatRooms)
      .set({ lastMessageAt: now, updatedAt: now })
      .where(eq(lineChatRooms.id, roomId));

    // Update LINE token's lastUsed
    await db
      .update(lineTokens)
      .set({ lastUsed: now, updatedAt: now })
      .where(eq(lineTokens.id, lineToken.id));

    const finalMessage = { ...messageData, status: finalStatus };

    // Broadcast new message to all clients via Socket.IO
    emitChatEvent('new-message', finalMessage, roomId);

    // Emit room update to update room list
    emitChatEvent('room-update', {
      id: roomId,
      lastMessage: finalMessage,
      lastMessageAt: now.toISOString(),
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
  }
}
