import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

// Database connection
function getDb() {
  const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  return new Database(dbPath);
}

// GET - Get all chat rooms with recent messages (Telegram-style preload)
export async function GET(request: NextRequest) {
  const db = getDb();
  
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';
    const search = searchParams.get('search') || '';
    const filter = searchParams.get('filter') || 'all'; // all, unread, pinned

    let query = `
      SELECT r.*, 
        (SELECT json_object(
          'id', m.id,
          'content', m.content,
          'messageType', m.messageType,
          'sender', m.sender,
          'senderName', m.senderName,
          'createdAt', m.createdAt
        ) FROM LineChatMessage m WHERE m.roomId = r.id ORDER BY m.createdAt DESC LIMIT 1) as lastMessage
      FROM LineChatRoom r
      WHERE r.status = ?
    `;
    const params: (string | number)[] = [status];

    if (search) {
      query += ` AND r.displayName LIKE ?`;
      params.push(`%${search}%`);
    }

    if (filter === 'unread') {
      query += ` AND r.unreadCount > 0`;
    } else if (filter === 'pinned') {
      query += ` AND r.isPinned = 1`;
    }

    query += ` ORDER BY r.isPinned DESC, r.lastMessageAt DESC`;

    const rooms = db.prepare(query).all(...params) as ChatRoomRecord[];

    // Preload recent messages for all rooms (Telegram-style instant loading)
    const roomIds = rooms.map(r => r.id);
    const recentMessagesMap: { [roomId: string]: MessageRecord[] } = {};
    
    if (roomIds.length > 0) {
      // Get 15 recent messages per room in a single query using UNION ALL
      const messagesQuery = roomIds.map(roomId => `
        SELECT * FROM (
          SELECT * FROM LineChatMessage 
          WHERE roomId = '${roomId}' AND isDeleted = 0
          ORDER BY createdAt DESC LIMIT 15
        )
      `).join(' UNION ALL ') + ' ORDER BY createdAt ASC';
      
      const allMessages = db.prepare(messagesQuery).all() as MessageRecord[];
      
      // Group messages by roomId
      allMessages.forEach(msg => {
        if (!recentMessagesMap[msg.roomId]) {
          recentMessagesMap[msg.roomId] = [];
        }
        recentMessagesMap[msg.roomId].push(msg);
      });
    }

    // Parse JSON fields and attach recent messages
    const parsedRooms = rooms.map(room => ({
      ...room,
      tags: JSON.parse(room.tags || '[]'),
      isPinned: !!room.isPinned,
      isMuted: !!room.isMuted,
      lastMessage: room.lastMessage ? JSON.parse(room.lastMessage) : null,
      recentMessages: recentMessagesMap[room.id] || [], // Preloaded messages
    }));

    return NextResponse.json(parsedRooms);
  } catch (error) {
    console.error('[Chat Rooms API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch chat rooms' }, { status: 500 });
  } finally {
    db.close();
  }
}

// PATCH - Update chat room (pin, mute, tags, etc.)
export async function PATCH(request: NextRequest) {
  const db = getDb();
  
  try {
    const body = await request.json();
    const { id, isPinned, isMuted, tags, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (typeof isPinned !== 'undefined') {
      updates.push('isPinned = ?');
      params.push(isPinned ? 1 : 0);
    }

    if (typeof isMuted !== 'undefined') {
      updates.push('isMuted = ?');
      params.push(isMuted ? 1 : 0);
    }

    if (tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(tags));
    }

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    updates.push('updatedAt = ?');
    params.push(new Date().toISOString());
    params.push(id);

    db.prepare(`UPDATE LineChatRoom SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updatedRoom = db.prepare('SELECT * FROM LineChatRoom WHERE id = ?').get(id);

    return NextResponse.json(updatedRoom);
  } catch (error) {
    console.error('[Chat Rooms API] Error:', error);
    return NextResponse.json({ error: 'Failed to update chat room' }, { status: 500 });
  } finally {
    db.close();
  }
}

interface ChatRoomRecord {
  id: string;
  lineUserId: string;
  lineTokenId?: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  isPinned: number;
  isMuted: number;
  tags: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
}

interface MessageRecord {
  id: string;
  roomId: string;
  lineMessageId?: string;
  messageType: string;
  content: string;
  mediaUrl?: string;
  stickerId?: string;
  packageId?: string;
  sender: string;
  senderName?: string;
  status: string;
  replyToId?: string;
  isDeleted: number;
  readAt?: string;
  createdAt: string;
}
