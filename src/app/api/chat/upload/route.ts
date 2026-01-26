import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import Database from 'better-sqlite3';
import fs from 'fs';
import { LineBotService } from '@/lib/line-bot';

interface RoomRecord {
  id: string;
  lineUserId: string;
  lineTokenId: string;
  displayName: string;
  status: string;
}

interface LineTokenRecord {
  id: string;
  accessToken: string;
  channelSecret: string;
  status: string;
}

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

// Get base URL for public access
function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  return `${protocol}://${host}`;
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

    // Generate public URL - use API route instead of static file
    const mediaUrl = `/api/uploads/${roomId}/${fileName}`;
    const baseUrl = getBaseUrl(request);
    const publicMediaUrl = `${baseUrl}${mediaUrl}`;

    // Get room info for LINE
    const room = db.prepare('SELECT * FROM LineChatRoom WHERE id = ?').get(roomId) as RoomRecord | undefined;

    // Send to LINE if it's media and we have room info
    let lineResult: { success: boolean; error?: string } = { success: false, error: 'Not sent to LINE' };
    
    if (room && (messageType === 'image' || messageType === 'video' || messageType === 'audio')) {
      // Check video format (LINE only supports MP4)
      if (messageType === 'video' && !mimeType.includes('mp4')) {
        console.log('[Upload API] Video format not supported by LINE:', mimeType);
        lineResult = { success: false, error: 'LINE only supports MP4 video format' };
      } else {
        // Get LINE token
        let lineToken = db.prepare('SELECT * FROM LineToken WHERE id = ? AND status = ?').get(room.lineTokenId, 'active') as LineTokenRecord | undefined;
        
        if (!lineToken) {
          lineToken = db.prepare('SELECT * FROM LineToken WHERE status = ? ORDER BY createdAt DESC LIMIT 1').get('active') as LineTokenRecord | undefined;
        }
        
        if (lineToken) {
          try {
            const botService = new LineBotService(lineToken.accessToken, lineToken.channelSecret);
            let sendResult;
            
            // Ensure HTTPS for LINE API
            const secureMediaUrl = publicMediaUrl.replace('http://', 'https://');
            console.log('[Upload API] Sending media to LINE:', { messageType, url: secureMediaUrl });
            
            if (messageType === 'image') {
              sendResult = await botService.sendImage(room.lineUserId, secureMediaUrl);
            } else if (messageType === 'video') {
              sendResult = await botService.sendVideo(room.lineUserId, secureMediaUrl);
            } else if (messageType === 'audio') {
              sendResult = await botService.sendAudio(room.lineUserId, secureMediaUrl);
            }
            
            lineResult = sendResult || { success: false, error: 'Unknown message type' };
            console.log('[Upload API] LINE send result:', lineResult);
          } catch (error) {
            console.error('[Upload API] LINE send error:', error);
            lineResult = { success: false, error: String(error) };
          }
        }
      }
    }

    // Create message in database
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const status = lineResult.success ? 'sent' : 'failed';

    db.prepare(`
      INSERT INTO LineChatMessage (
        id, roomId, messageType, content, mediaUrl, sender, senderName, status, isDeleted, createdAt
      ) VALUES (?, ?, ?, ?, ?, 'agent', ?, ?, 0, ?)
    `).run(messageId, roomId, messageType, file.name, mediaUrl, senderName, status, now);

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
      status,
      createdAt: now,
    };

    return NextResponse.json({
      success: true,
      message,
      lineResult,
    });
  } catch (error) {
    console.error('[Upload API] Error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  } finally {
    db.close();
  }
}
