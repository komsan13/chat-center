import { NextRequest, NextResponse } from 'next/server';
import { db, quickReplies } from '@/lib/db';
import { eq } from 'drizzle-orm';

// GET single quick reply
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const [quickReply] = await db
      .select()
      .from(quickReplies)
      .where(eq(quickReplies.id, id))
      .limit(1);
    
    if (!quickReply) {
      return NextResponse.json({ success: false, error: 'Quick reply not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      data: {
        ...quickReply,
        emojis: quickReply.emojis ? JSON.parse(quickReply.emojis) : undefined,
      }
    });
  } catch (error) {
    console.error('Error fetching quick reply:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch quick reply' }, { status: 500 });
  }
}

// PUT update quick reply
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { lineTokenId, title, label, icon, emojis, isFavorite } = body;
    
    // Check if exists
    const [existing] = await db
      .select()
      .from(quickReplies)
      .where(eq(quickReplies.id, id))
      .limit(1);
    
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Quick reply not found' }, { status: 404 });
    }
    
    const [updated] = await db
      .update(quickReplies)
      .set({
        lineTokenId: lineTokenId || existing.lineTokenId,
        title: title || existing.title,
        label: label || existing.label,
        icon: icon || existing.icon,
        emojis: emojis !== undefined ? (emojis ? JSON.stringify(emojis) : null) : existing.emojis,
        isFavorite: isFavorite !== undefined ? isFavorite : existing.isFavorite,
        updatedAt: new Date(),
      })
      .where(eq(quickReplies.id, id))
      .returning();
    
    return NextResponse.json({ 
      success: true, 
      data: {
        ...updated,
        emojis: updated.emojis ? JSON.parse(updated.emojis) : undefined,
      }
    });
  } catch (error) {
    console.error('Error updating quick reply:', error);
    return NextResponse.json({ success: false, error: 'Failed to update quick reply' }, { status: 500 });
  }
}

// DELETE quick reply
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if exists
    const [existing] = await db
      .select()
      .from(quickReplies)
      .where(eq(quickReplies.id, id))
      .limit(1);
    
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Quick reply not found' }, { status: 404 });
    }
    
    await db.delete(quickReplies).where(eq(quickReplies.id, id));
    
    return NextResponse.json({ success: true, message: 'Quick reply deleted successfully' });
  } catch (error) {
    console.error('Error deleting quick reply:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete quick reply' }, { status: 500 });
  }
}
