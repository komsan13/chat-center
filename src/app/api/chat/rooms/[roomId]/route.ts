import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

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
  return new Database(prismaPath);
}

// GET - Get single room with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const db = getDb();
  const { roomId } = await params;
  
  try {
    const room = db.prepare(`
      SELECT r.*, 
        (SELECT json_object(
          'id', m.id,
          'content', m.content,
          'messageType', m.messageType,
          'sender', m.sender,
          'createdAt', m.createdAt
        ) FROM LineChatMessage m WHERE m.roomId = r.id ORDER BY m.createdAt DESC LIMIT 1) as lastMessage
      FROM LineChatRoom r
      WHERE r.id = ?
    `).get(roomId) as any;

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Get messages
    const rawMessages = db.prepare(`
      SELECT * FROM LineChatMessage 
      WHERE roomId = ? AND isDeleted = 0 
      ORDER BY createdAt ASC
    `).all(roomId) as any[];

    // Parse emojis JSON for each message
    const messages = rawMessages.map(msg => ({
      ...msg,
      emojis: msg.emojis ? JSON.parse(msg.emojis) : null,
    }));

    // Get notes (handle if ChatNote table doesn't exist)
    let notes: unknown[] = [];
    try {
      notes = db.prepare(`
        SELECT * FROM ChatNote 
        WHERE roomId = ? 
        ORDER BY createdAt DESC
      `).all(roomId);
    } catch {
      // ChatNote table might not exist, create it
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
      notes = [];
    }

    return NextResponse.json({
      ...room,
      tags: JSON.parse(room.tags || '[]'),
      isPinned: !!room.isPinned,
      isMuted: !!room.isMuted,
      lastMessage: room.lastMessage ? JSON.parse(room.lastMessage) : null,
      messages,
      notes,
    });
  } catch (error) {
    console.error('[Room API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch room' }, { status: 500 });
  } finally {
    db.close();
  }
}

// PATCH - Update room settings (pin, mute, tags, status, notes)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const db = getDb();
  const { roomId } = await params;
  
  try {
    const body = await request.json();
    const { isPinned, isMuted, tags, status, assignedTo, notes } = body;

    const updates: string[] = [];
    const updateParams: (string | number)[] = [];

    if (typeof isPinned !== 'undefined') {
      updates.push('isPinned = ?');
      updateParams.push(isPinned ? 1 : 0);
    }

    if (typeof isMuted !== 'undefined') {
      updates.push('isMuted = ?');
      updateParams.push(isMuted ? 1 : 0);
    }

    if (tags !== undefined) {
      updates.push('tags = ?');
      updateParams.push(JSON.stringify(tags));
    }

    if (status) {
      updates.push('status = ?');
      updateParams.push(status);
    }

    if (assignedTo !== undefined) {
      updates.push('assignedTo = ?');
      updateParams.push(assignedTo);
    }

    if (updates.length > 0) {
      updates.push('updatedAt = ?');
      updateParams.push(new Date().toISOString());
      updateParams.push(roomId);

      db.prepare(`UPDATE LineChatRoom SET ${updates.join(', ')} WHERE id = ?`).run(...updateParams);
    }

    // Handle notes separately (add/update/delete)
    if (notes && notes.action) {
      const { action, noteId, content, createdBy } = notes;
      
      // Ensure ChatNote table exists
      db.exec(`
        CREATE TABLE IF NOT EXISTS ChatNote (
          id TEXT PRIMARY KEY,
          roomId TEXT NOT NULL,
          content TEXT NOT NULL,
          createdBy TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          FOREIGN KEY (roomId) REFERENCES LineChatRoom(id)
        )
      `);

      if (action === 'add') {
        const noteInsertId = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        db.prepare(`
          INSERT INTO ChatNote (id, roomId, content, createdBy, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(noteInsertId, roomId, content, createdBy, new Date().toISOString(), new Date().toISOString());
      } else if (action === 'update' && noteId) {
        db.prepare(`
          UPDATE ChatNote SET content = ?, updatedAt = ? WHERE id = ? AND roomId = ?
        `).run(content, new Date().toISOString(), noteId, roomId);
      } else if (action === 'delete' && noteId) {
        db.prepare(`DELETE FROM ChatNote WHERE id = ? AND roomId = ?`).run(noteId, roomId);
      }
    }

    const updatedRoom = db.prepare('SELECT * FROM LineChatRoom WHERE id = ?').get(roomId) as any;
    
    if (!updatedRoom) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      room: {
        ...updatedRoom,
        tags: JSON.parse(updatedRoom.tags || '[]'),
        isPinned: !!updatedRoom.isPinned,
        isMuted: !!updatedRoom.isMuted,
      }
    });
  } catch (error) {
    console.error('[Room API] Error:', error);
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
  } finally {
    db.close();
  }
}

// DELETE - Delete/archive chat room and its messages
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const db = getDb();
  const { roomId } = await params;
  
  try {
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';

    if (permanent) {
      // Permanently delete messages and room
      db.prepare('DELETE FROM LineChatMessage WHERE roomId = ?').run(roomId);
      db.prepare('DELETE FROM ChatNote WHERE roomId = ?').run(roomId);
      db.prepare('DELETE FROM LineChatRoom WHERE id = ?').run(roomId);
      
      return NextResponse.json({ success: true, message: 'Room permanently deleted' });
    } else {
      // Soft delete - archive the room
      db.prepare(`
        UPDATE LineChatRoom 
        SET status = 'archived', updatedAt = ? 
        WHERE id = ?
      `).run(new Date().toISOString(), roomId);
      
      return NextResponse.json({ success: true, message: 'Room archived' });
    }
  } catch (error) {
    console.error('[Room API] Error:', error);
    return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 });
  } finally {
    db.close();
  }
}
