import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

// Database connection
function getDb() {
  const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  return new Database(dbPath);
}

// GET - Get messages for a specific room
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const db = getDb();
  const { roomId } = await params;
  
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before'); // For pagination

    let query = `
      SELECT * FROM LineChatMessage 
      WHERE roomId = ? AND isDeleted = 0
    `;
    const queryParams: (string | number)[] = [roomId];

    if (before) {
      query += ` AND createdAt < ?`;
      queryParams.push(before);
    }

    query += ` ORDER BY createdAt DESC LIMIT ?`;
    queryParams.push(limit);

    const messages = db.prepare(query).all(...queryParams) as MessageRecord[];

    // Reverse to get chronological order
    messages.reverse();

    // Parse emojis JSON for each message
    const parsedMessages = messages.map(msg => ({
      ...msg,
      emojis: msg.emojis ? JSON.parse(msg.emojis as string) : null,
    }));

    return NextResponse.json(parsedMessages);
  } catch (error) {
    console.error('[Chat Messages API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  } finally {
    db.close();
  }
}

// POST - Mark messages as read
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const db = getDb();
  const { roomId } = await params;
  
  try {
    const now = new Date().toISOString();

    // Mark all unread messages as read
    db.prepare(`
      UPDATE LineChatMessage 
      SET status = 'read', readAt = ?
      WHERE roomId = ? AND sender = 'user' AND status != 'read'
    `).run(now, roomId);

    // Reset unread count
    db.prepare(`
      UPDATE LineChatRoom 
      SET unreadCount = 0, updatedAt = ?
      WHERE id = ?
    `).run(now, roomId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Chat Messages API] Error:', error);
    return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 });
  } finally {
    db.close();
  }
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
  emojis?: string;
}
