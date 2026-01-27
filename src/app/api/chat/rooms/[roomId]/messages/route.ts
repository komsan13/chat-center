import { NextRequest, NextResponse } from 'next/server';
import { db, lineChatMessages, lineChatRooms } from '@/lib/db';
import { eq, and, lt, desc, ne } from 'drizzle-orm';

// GET - Get messages for a specific room
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before'); // For pagination

    let messages;
    
    if (before) {
      messages = await db
        .select()
        .from(lineChatMessages)
        .where(and(
          eq(lineChatMessages.roomId, roomId),
          lt(lineChatMessages.createdAt, new Date(before))
        ))
        .orderBy(desc(lineChatMessages.createdAt))
        .limit(limit);
    } else {
      messages = await db
        .select()
        .from(lineChatMessages)
        .where(eq(lineChatMessages.roomId, roomId))
        .orderBy(desc(lineChatMessages.createdAt))
        .limit(limit);
    }

    // Reverse to get chronological order
    messages.reverse();

    // Parse emojis JSON for each message
    const parsedMessages = messages.map(msg => ({
      ...msg,
      emojis: msg.emojis ? JSON.parse(msg.emojis) : null,
    }));

    return NextResponse.json(parsedMessages);
  } catch (error) {
    console.error('[Chat Messages API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST - Mark messages as read
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  
  try {
    const now = new Date();

    // Mark all unread messages as read
    await db
      .update(lineChatMessages)
      .set({ status: 'read', updatedAt: now })
      .where(and(
        eq(lineChatMessages.roomId, roomId),
        eq(lineChatMessages.sender, 'user'),
        ne(lineChatMessages.status, 'read')
      ));

    // Reset unread count
    await db
      .update(lineChatRooms)
      .set({ unreadCount: 0, updatedAt: now })
      .where(eq(lineChatRooms.id, roomId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Chat Messages API] Error:', error);
    return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 });
  }
}
