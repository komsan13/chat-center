import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import Database from 'better-sqlite3';

function getDb() {
  const dbPath = path.join(process.cwd(), 'data', 'dev.db');
  const fallbackPath = path.join(process.cwd(), 'prisma', 'dev.db');
  
  try {
    return new Database(dbPath);
  } catch {
    return new Database(fallbackPath);
  }
}

// POST - Upload file and send as message
export async function POST(request: NextRequest) {
  const db = getDb();
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const roomId = formData.get('roomId') as string;
    const senderName = formData.get('senderName') as string || 'Agent';

    if (!file || !roomId) {
      return NextResponse.json({ error: 'File and roomId are required' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    // Determine file type and message type
    const mimeType = file.type;
    let messageType: 'image' | 'video' | 'audio' | 'file' = 'file';
    
    if (mimeType.startsWith('image/')) {
      messageType = 'image';
    } else if (mimeType.startsWith('video/')) {
      messageType = 'video';
    } else if (mimeType.startsWith('audio/')) {
      messageType = 'audio';
    }

    // Create uploads directory if not exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', roomId);
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const fileExt = path.extname(file.name);
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}${fileExt}`;
    const filePath = path.join(uploadsDir, fileName);

    // Write file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Generate public URL
    const mediaUrl = `/uploads/${roomId}/${fileName}`;

    // Create message in database
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO LineChatMessage (
        id, roomId, messageType, content, mediaUrl, sender, senderName, status, isDeleted, createdAt
      ) VALUES (?, ?, ?, ?, ?, 'agent', ?, 'sent', 0, ?)
    `).run(messageId, roomId, messageType, file.name, mediaUrl, senderName, now);

    // Update room's lastMessageAt
    db.prepare(`
      UPDATE LineChatRoom 
      SET lastMessageAt = ?, updatedAt = ?
      WHERE id = ?
    `).run(now, now, roomId);

    const message = {
      id: messageId,
      roomId,
      messageType,
      content: file.name,
      mediaUrl,
      sender: 'agent',
      senderName,
      status: 'sent',
      createdAt: now,
    };

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error('[Upload API] Error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  } finally {
    db.close();
  }
}
