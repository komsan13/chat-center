import { NextResponse } from 'next/server';
import { db, lineChatRooms, lineChatMessages, chatNotes } from '@/lib/db';
import { sql } from 'drizzle-orm';

// This endpoint provides database schema info for chat features (migration is handled by Drizzle)
export async function POST() {
  try {
    // With Drizzle ORM, migrations are handled separately via drizzle-kit
    // This endpoint now just verifies the schema is working
    
    // Test queries to verify tables exist
    await db.select().from(lineChatRooms).limit(1);
    await db.select().from(lineChatMessages).limit(1);
    await db.select().from(chatNotes).limit(1);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database schema verified successfully (using Drizzle ORM with PostgreSQL)' 
    });
  } catch (error) {
    console.error('[Migration API] Error:', error);
    return NextResponse.json({ 
      error: 'Schema verification failed', 
      details: String(error) 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Count records
    const [roomCountResult] = await db.select({ count: sql<number>`count(*)` }).from(lineChatRooms);
    const [messageCountResult] = await db.select({ count: sql<number>`count(*)` }).from(lineChatMessages);
    const [noteCountResult] = await db.select({ count: sql<number>`count(*)` }).from(chatNotes);
    
    return NextResponse.json({
      database: 'PostgreSQL (Drizzle ORM)',
      tables: {
        lineChatRooms: 'OK',
        lineChatMessages: 'OK',
        chatNotes: 'OK',
      },
      counts: {
        rooms: roomCountResult?.count || 0,
        messages: messageCountResult?.count || 0,
        notes: noteCountResult?.count || 0,
      }
    });
  } catch (error) {
    console.error('[Migration API] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
