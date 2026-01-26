import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database connection - use prisma/dev.db as primary (where LINE webhook saves data)
function getDb() {
  const prismaPath = path.join(process.cwd(), 'prisma', 'dev.db');
  const dataPath = path.join(process.cwd(), 'data', 'dev.db');
  
  // Prefer prisma/dev.db as it has the LINE chat data
  if (fs.existsSync(prismaPath)) {
    return new Database(prismaPath);
  }
  if (fs.existsSync(dataPath)) {
    return new Database(dataPath);
  }
  // Create in prisma folder if neither exists
  return new Database(prismaPath);
}

// Auto-migrate function to ensure all columns exist
function ensureSchema(db: Database.Database) {
  try {
    // Check if table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='LineChatRoom'
    `).get();
    
    if (!tableExists) {
      // Create table if not exists
      db.exec(`
        CREATE TABLE LineChatRoom (
          id TEXT PRIMARY KEY,
          lineUserId TEXT NOT NULL,
          lineTokenId TEXT,
          displayName TEXT NOT NULL,
          pictureUrl TEXT,
          statusMessage TEXT,
          lastMessageAt TEXT,
          unreadCount INTEGER DEFAULT 0,
          isPinned INTEGER DEFAULT 0,
          isMuted INTEGER DEFAULT 0,
          tags TEXT DEFAULT '[]',
          status TEXT DEFAULT 'active',
          assignedTo TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
      return;
    }
    
    // Add missing columns
    const columns = db.prepare(`PRAGMA table_info(LineChatRoom)`).all() as { name: string }[];
    const columnNames = columns.map(c => c.name);
    
    const migrations = [
      { column: 'isPinned', sql: 'ALTER TABLE LineChatRoom ADD COLUMN isPinned INTEGER DEFAULT 0' },
      { column: 'isMuted', sql: 'ALTER TABLE LineChatRoom ADD COLUMN isMuted INTEGER DEFAULT 0' },
      { column: 'tags', sql: "ALTER TABLE LineChatRoom ADD COLUMN tags TEXT DEFAULT '[]'" },
      { column: 'status', sql: "ALTER TABLE LineChatRoom ADD COLUMN status TEXT DEFAULT 'active'" },
      { column: 'assignedTo', sql: 'ALTER TABLE LineChatRoom ADD COLUMN assignedTo TEXT' },
    ];
    
    for (const m of migrations) {
      if (!columnNames.includes(m.column)) {
        try { db.exec(m.sql); } catch {}
      }
    }
    
    // Create ChatNote table
    db.exec(`
      CREATE TABLE IF NOT EXISTS ChatNote (
        id TEXT PRIMARY KEY,
        roomId TEXT NOT NULL,
        content TEXT NOT NULL,
        createdBy TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create LineChatMessage table if not exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS LineChatMessage (
        id TEXT PRIMARY KEY,
        roomId TEXT NOT NULL,
        lineMessageId TEXT,
        messageType TEXT NOT NULL DEFAULT 'text',
        content TEXT,
        mediaUrl TEXT,
        stickerId TEXT,
        packageId TEXT,
        sender TEXT NOT NULL DEFAULT 'user',
        senderName TEXT,
        status TEXT DEFAULT 'sent',
        replyToId TEXT,
        isDeleted INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (roomId) REFERENCES LineChatRoom(id)
      )
    `);
    
    // Create indexes
    try {
      db.exec(`CREATE INDEX IF NOT EXISTS idx_linechatmessage_roomid ON LineChatMessage(roomId)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_linechatroom_status ON LineChatRoom(status)`);
    } catch {}
  } catch (err) {
    console.error('[Schema Migration]', err);
  }
}

// GET - Get all chat rooms with recent messages (Telegram-style preload)
export async function GET(request: NextRequest) {
  const db = getDb();
  
  // Auto-migrate schema on first request
  ensureSchema(db);
  
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const filter = searchParams.get('filter') || 'all'; // all, unread, pinned, spam

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
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    // Handle spam filter - show spam rooms, otherwise show active rooms
    if (filter === 'spam') {
      query += ` AND r.status = 'spam'`;
    } else {
      // For other filters, show non-spam rooms
      query += ` AND (r.status = 'active' OR r.status IS NULL)`;
    }

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
