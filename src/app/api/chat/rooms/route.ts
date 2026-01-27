import { NextRequest, NextResponse } from 'next/server';
import { db, lineChatRooms, lineChatMessages, chatNotes } from '@/lib/db';
import { eq, desc, asc, and, ne, like, gt, notInArray, isNull, or, sql } from 'drizzle-orm';

// GET - Get all chat rooms with recent messages (Telegram-style preload)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const filter = searchParams.get('filter') || 'all'; // all, unread, pinned, spam

    // Build conditions
    const conditions = [];

    // Handle spam filter - show spam rooms, otherwise show non-spam/non-cleared rooms
    if (filter === 'spam') {
      conditions.push(eq(lineChatRooms.status, 'spam'));
    } else if (filter === 'archived') {
      conditions.push(eq(lineChatRooms.status, 'archived'));
    } else if (filter === 'cleared') {
      conditions.push(eq(lineChatRooms.status, 'cleared'));
    } else {
      // For other filters, show all non-spam and non-cleared rooms
      conditions.push(
        or(
          notInArray(lineChatRooms.status, ['spam', 'cleared']),
          isNull(lineChatRooms.status)
        )
      );
    }

    if (search) {
      conditions.push(like(lineChatRooms.displayName, `%${search}%`));
    }

    if (filter === 'unread') {
      conditions.push(gt(lineChatRooms.unreadCount, 0));
    } else if (filter === 'pinned') {
      conditions.push(eq(lineChatRooms.isPinned, true));
    }

    const rooms = conditions.length > 0
      ? await db
          .select()
          .from(lineChatRooms)
          .where(and(...conditions))
          .orderBy(desc(lineChatRooms.isPinned), desc(lineChatRooms.lastMessageAt))
      : await db
          .select()
          .from(lineChatRooms)
          .orderBy(desc(lineChatRooms.isPinned), desc(lineChatRooms.lastMessageAt));

    // Get room IDs for fetching messages
    const roomIds = rooms.map(r => r.id);
    const recentMessagesMap: { [roomId: string]: typeof lineChatMessages.$inferSelect[] } = {};
    
    if (roomIds.length > 0) {
      // Get recent messages for each room (last 15)
      for (const roomId of roomIds) {
        const messages = await db
          .select()
          .from(lineChatMessages)
          .where(eq(lineChatMessages.roomId, roomId))
          .orderBy(desc(lineChatMessages.createdAt))
          .limit(15);
        
        // Reverse to get chronological order
        recentMessagesMap[roomId] = messages.reverse();
      }
    }

    // Get last message for each room
    const lastMessagesMap: { [roomId: string]: typeof lineChatMessages.$inferSelect | null } = {};
    for (const roomId of roomIds) {
      const [lastMsg] = await db
        .select()
        .from(lineChatMessages)
        .where(eq(lineChatMessages.roomId, roomId))
        .orderBy(desc(lineChatMessages.createdAt))
        .limit(1);
      lastMessagesMap[roomId] = lastMsg || null;
    }

    // Parse JSON fields and attach recent messages
    const parsedRooms = rooms.map(room => {
      const lastMessage = lastMessagesMap[room.id];
      const parsedLastMessage = lastMessage ? {
        id: lastMessage.id,
        content: lastMessage.content,
        messageType: lastMessage.messageType,
        sender: lastMessage.sender,
        senderName: lastMessage.senderName,
        createdAt: lastMessage.createdAt,
        emojis: lastMessage.emojis ? JSON.parse(lastMessage.emojis) : null,
      } : null;
      
      // Parse emojis in recentMessages
      const recentMessages = (recentMessagesMap[room.id] || []).map(msg => ({
        ...msg,
        emojis: msg.emojis ? JSON.parse(msg.emojis) : null,
      }));
      
      return {
        ...room,
        tags: JSON.parse(room.tags || '[]'),
        lastMessage: parsedLastMessage,
        recentMessages,
      };
    });

    return NextResponse.json(parsedRooms);
  } catch (error) {
    console.error('[Chat Rooms API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch chat rooms' }, { status: 500 });
  }
}

// PATCH - Update chat room (pin, mute, tags, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, isPinned, isMuted, tags, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    const updateData: Partial<typeof lineChatRooms.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (typeof isPinned !== 'undefined') {
      updateData.isPinned = isPinned;
    }

    if (typeof isMuted !== 'undefined') {
      updateData.isMuted = isMuted;
    }

    if (tags !== undefined) {
      updateData.tags = JSON.stringify(tags);
    }

    if (status) {
      updateData.status = status;
    }

    if (Object.keys(updateData).length === 1) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const [updatedRoom] = await db
      .update(lineChatRooms)
      .set(updateData)
      .where(eq(lineChatRooms.id, id))
      .returning();

    return NextResponse.json(updatedRoom);
  } catch (error) {
    console.error('[Chat Rooms API] Error:', error);
    return NextResponse.json({ error: 'Failed to update chat room' }, { status: 500 });
  }
}
