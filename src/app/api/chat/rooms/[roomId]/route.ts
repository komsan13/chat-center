import { NextRequest, NextResponse } from 'next/server';
import { db, lineChatRooms, lineChatMessages, chatNotes, generateId } from '@/lib/db';
import { eq, asc, desc } from 'drizzle-orm';

// GET - Get single room with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  
  try {
    const [room] = await db
      .select()
      .from(lineChatRooms)
      .where(eq(lineChatRooms.id, roomId))
      .limit(1);

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Get messages
    const rawMessages = await db
      .select()
      .from(lineChatMessages)
      .where(eq(lineChatMessages.roomId, roomId))
      .orderBy(asc(lineChatMessages.createdAt));

    // Parse emojis JSON for each message
    const messages = rawMessages.map(msg => ({
      ...msg,
      emojis: msg.emojis ? JSON.parse(msg.emojis) : null,
    }));

    // Get notes
    const notes = await db
      .select()
      .from(chatNotes)
      .where(eq(chatNotes.roomId, roomId))
      .orderBy(desc(chatNotes.createdAt));

    // Get last message
    const [lastMessage] = await db
      .select()
      .from(lineChatMessages)
      .where(eq(lineChatMessages.roomId, roomId))
      .orderBy(desc(lineChatMessages.createdAt))
      .limit(1);

    return NextResponse.json({
      ...room,
      tags: JSON.parse(room.tags || '[]'),
      lastMessage: lastMessage ? {
        id: lastMessage.id,
        content: lastMessage.content,
        messageType: lastMessage.messageType,
        sender: lastMessage.sender,
        createdAt: lastMessage.createdAt,
      } : null,
      messages,
      notes,
    });
  } catch (error) {
    console.error('[Room API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch room' }, { status: 500 });
  }
}

// PATCH - Update room settings (pin, mute, tags, status, notes)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  
  try {
    const body = await request.json();
    const { isPinned, isMuted, tags, status, assignedTo, notes } = body;

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

    if (assignedTo !== undefined) {
      updateData.assignedTo = assignedTo;
    }

    if (Object.keys(updateData).length > 1) {
      await db
        .update(lineChatRooms)
        .set(updateData)
        .where(eq(lineChatRooms.id, roomId));
    }

    // Handle notes separately (add/update/delete)
    if (notes && notes.action) {
      const { action, noteId, content, createdBy } = notes;

      if (action === 'add') {
        const noteInsertId = `note_${generateId()}`;
        await db.insert(chatNotes).values({
          id: noteInsertId,
          roomId,
          content,
          createdBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else if (action === 'update' && noteId) {
        await db
          .update(chatNotes)
          .set({ content, updatedAt: new Date() })
          .where(eq(chatNotes.id, noteId));
      } else if (action === 'delete' && noteId) {
        await db.delete(chatNotes).where(eq(chatNotes.id, noteId));
      }
    }

    const [updatedRoom] = await db
      .select()
      .from(lineChatRooms)
      .where(eq(lineChatRooms.id, roomId))
      .limit(1);
    
    if (!updatedRoom) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      room: {
        ...updatedRoom,
        tags: JSON.parse(updatedRoom.tags || '[]'),
      }
    });
  } catch (error) {
    console.error('[Room API] Error:', error);
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
  }
}

// DELETE - Delete/archive chat room and its messages
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'archive'; // 'archive' | 'clear' | 'permanent'

    if (mode === 'permanent') {
      // Permanently delete messages and room (dangerous!)
      await db.delete(lineChatMessages).where(eq(lineChatMessages.roomId, roomId));
      await db.delete(chatNotes).where(eq(chatNotes.roomId, roomId));
      await db.delete(lineChatRooms).where(eq(lineChatRooms.id, roomId));
      
      return NextResponse.json({ success: true, message: 'Room permanently deleted' });
    } else if (mode === 'clear') {
      // Clear messages only, keep room, tags, and notes for future messages
      await db.delete(lineChatMessages).where(eq(lineChatMessages.roomId, roomId));
      
      // Reset room state and set status to 'cleared' (hidden until new message)
      await db
        .update(lineChatRooms)
        .set({
          lastMessageAt: null,
          unreadCount: 0,
          status: 'cleared',
          updatedAt: new Date(),
        })
        .where(eq(lineChatRooms.id, roomId));
      
      return NextResponse.json({ success: true, message: 'Messages cleared, room hidden until new message' });
    } else {
      // Soft delete - archive the room
      await db
        .update(lineChatRooms)
        .set({
          status: 'archived',
          updatedAt: new Date(),
        })
        .where(eq(lineChatRooms.id, roomId));
      
      return NextResponse.json({ success: true, message: 'Room archived' });
    }
  } catch (error) {
    console.error('[Room API] Error:', error);
    return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 });
  }
}
