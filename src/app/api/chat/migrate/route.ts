import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

function getDb() {
  const prismaPath = path.join(process.cwd(), 'prisma', 'dev.db');
  const dataPath = path.join(process.cwd(), 'data', 'dev.db');
  
  if (fs.existsSync(prismaPath)) {
    return new Database(prismaPath);
  }
  if (fs.existsSync(dataPath)) {
    return new Database(dataPath);
  }
  return new Database(prismaPath);
}

// This endpoint runs database migrations for chat features
export async function POST() {
  const db = getDb();
  
  try {
    // Check if LineChatRoom table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='LineChatRoom'
    `).get();
    
    if (!tableExists) {
      // Create LineChatRoom table if it doesn't exist
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
    } else {
      // Add missing columns to existing table
      const columns = db.prepare(`PRAGMA table_info(LineChatRoom)`).all() as { name: string }[];
      const columnNames = columns.map(c => c.name);
      
      const migrations: { column: string; type: string; default: string }[] = [
        { column: 'isPinned', type: 'INTEGER', default: '0' },
        { column: 'isMuted', type: 'INTEGER', default: '0' },
        { column: 'tags', type: 'TEXT', default: "'[]'" },
        { column: 'status', type: 'TEXT', default: "'active'" },
        { column: 'assignedTo', type: 'TEXT', default: 'NULL' },
      ];
      
      for (const migration of migrations) {
        if (!columnNames.includes(migration.column)) {
          try {
            db.exec(`ALTER TABLE LineChatRoom ADD COLUMN ${migration.column} ${migration.type} DEFAULT ${migration.default}`);
            console.log(`[Migration] Added column: ${migration.column}`);
          } catch (err) {
            console.log(`[Migration] Column ${migration.column} might already exist:`, err);
          }
        }
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
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (roomId) REFERENCES LineChatRoom(id)
      )
    `);
    
    // Create LineChatMessage table if not exists
    const msgTableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='LineChatMessage'
    `).get();
    
    if (!msgTableExists) {
      db.exec(`
        CREATE TABLE LineChatMessage (
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
    }
    
    // Create indexes
    try {
      db.exec(`CREATE INDEX IF NOT EXISTS idx_chatnote_roomid ON ChatNote(roomId)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_linechatroom_ispinned ON LineChatRoom(isPinned)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_linechatroom_status ON LineChatRoom(status)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_linechatmessage_roomid ON LineChatMessage(roomId)`);
    } catch {}
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database migration completed successfully' 
    });
  } catch (error) {
    console.error('[Migration API] Error:', error);
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: String(error) 
    }, { status: 500 });
  } finally {
    db.close();
  }
}

export async function GET() {
  const db = getDb();
  
  try {
    // Get table info
    const lineChatRoomInfo = db.prepare(`PRAGMA table_info(LineChatRoom)`).all();
    let chatNoteInfo: unknown[] = [];
    try {
      chatNoteInfo = db.prepare(`PRAGMA table_info(ChatNote)`).all();
    } catch {}
    const lineChatMessageInfo = db.prepare(`PRAGMA table_info(LineChatMessage)`).all();
    
    // Count records
    let roomCount = 0, messageCount = 0, noteCount = 0;
    try { roomCount = (db.prepare('SELECT COUNT(*) as count FROM LineChatRoom').get() as any)?.count || 0; } catch {}
    try { messageCount = (db.prepare('SELECT COUNT(*) as count FROM LineChatMessage').get() as any)?.count || 0; } catch {}
    try { noteCount = (db.prepare('SELECT COUNT(*) as count FROM ChatNote').get() as any)?.count || 0; } catch {}
    
    return NextResponse.json({
      tables: {
        LineChatRoom: lineChatRoomInfo,
        LineChatMessage: lineChatMessageInfo,
        ChatNote: chatNoteInfo,
      },
      counts: {
        rooms: roomCount,
        messages: messageCount,
        notes: noteCount,
      }
    });
  } catch (error) {
    console.error('[Migration API] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  } finally {
    db.close();
  }
}
