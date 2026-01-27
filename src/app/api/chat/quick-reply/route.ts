import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');

function getDb() {
  return new Database(dbPath);
}

interface QuickReplyRow {
  id: string;
  lineTokenId: string;
  title: string;
  label: string;
  icon: string;
  emojis: string | null;
  isFavorite: number;
  createdAt: string;
  updatedAt: string;
}

// GET all quick replies
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const lineTokenId = searchParams.get('lineTokenId');
    
    let query = 'SELECT * FROM QuickReply';
    const params: string[] = [];
    
    if (lineTokenId && lineTokenId !== 'all') {
      query += ' WHERE lineTokenId = ?';
      params.push(lineTokenId);
    }
    
    query += ' ORDER BY createdAt DESC';
    
    const quickReplies = db.prepare(query).all(...params) as QuickReplyRow[];
    db.close();
    
    // Transform data
    const transformed = quickReplies.map(qr => ({
      ...qr,
      emojis: qr.emojis ? JSON.parse(qr.emojis) : undefined,
      isFavorite: qr.isFavorite === 1
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
    
    const db = getDb();
    const id = `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO QuickReply (id, lineTokenId, title, label, icon, emojis, isFavorite, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, 
      lineTokenId, 
      title, 
      label, 
      icon || '💬', 
      emojis ? JSON.stringify(emojis) : null, 
      isFavorite ? 1 : 0, 
      now, 
      now
    );
    
    const newQuickReply = db.prepare('SELECT * FROM QuickReply WHERE id = ?').get(id) as QuickReplyRow;
    db.close();
    
    return NextResponse.json({ 
      success: true, 
      data: {
        ...newQuickReply,
        emojis: newQuickReply.emojis ? JSON.parse(newQuickReply.emojis) : undefined,
        isFavorite: newQuickReply.isFavorite === 1
      }
    });
  } catch (error) {
    console.error('Error creating quick reply:', error);
    return NextResponse.json({ success: false, error: 'Failed to create quick reply' }, { status: 500 });
  }
}
