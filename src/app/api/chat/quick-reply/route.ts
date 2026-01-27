import { NextRequest, NextResponse } from 'next/server';
import { db, quickReplies, generateId } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';

// GET all quick replies
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lineTokenId = searchParams.get('lineTokenId');
    
    let quickRepliesList;
    
    if (lineTokenId && lineTokenId !== 'all') {
      quickRepliesList = await db
        .select()
        .from(quickReplies)
        .where(eq(quickReplies.lineTokenId, lineTokenId))
        .orderBy(desc(quickReplies.createdAt));
    } else {
      quickRepliesList = await db
        .select()
        .from(quickReplies)
        .orderBy(desc(quickReplies.createdAt));
    }
    
    // Transform data
    const transformed = quickRepliesList.map(qr => ({
      ...qr,
      emojis: qr.emojis ? JSON.parse(qr.emojis) : undefined,
    }));

    return NextResponse.json({ success: true, data: transformed });
  } catch (error) {
    console.error('Error fetching quick replies:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch quick replies' }, { status: 500 });
  }
}

// POST create new quick reply
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lineTokenId, title, label, icon, emojis, isFavorite } = body;
    
    if (!lineTokenId || !title || !label) {
      return NextResponse.json({ 
        success: false, 
        error: 'lineTokenId, title and label are required' 
      }, { status: 400 });
    }
    
    const id = `qr_${generateId()}`;
    
    const [newQuickReply] = await db.insert(quickReplies).values({
      id,
      lineTokenId,
      title,
      label,
      icon: icon || '💬',
      emojis: emojis ? JSON.stringify(emojis) : null,
      isFavorite: isFavorite || false,
    }).returning();
    
    return NextResponse.json({ 
      success: true, 
      data: {
        ...newQuickReply,
        emojis: newQuickReply.emojis ? JSON.parse(newQuickReply.emojis) : undefined,
      }
    });
  } catch (error) {
    console.error('Error creating quick reply:', error);
    return NextResponse.json({ success: false, error: 'Failed to create quick reply' }, { status: 500 });
  }
}
