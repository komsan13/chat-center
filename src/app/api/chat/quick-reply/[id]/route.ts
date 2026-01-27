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

// GET single quick reply
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const quickReply = db.prepare('SELECT * FROM QuickReply WHERE id = ?').get(id) as QuickReplyRow | undefined;
    db.close();
    
    if (!quickReply) {
      return NextResponse.json({ success: false, error: 'Quick reply not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      data: {
        ...quickReply,
        emojis: quickReply.emojis ? JSON.parse(quickReply.emojis) : undefined,
        isFavorite: quickReply.isFavorite === 1
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
    
    const db = getDb();
    
    // Check if exists
    const existing = db.prepare('SELECT * FROM QuickReply WHERE id = ?').get(id) as QuickReplyRow | undefined;
    if (!existing) {
      db.close();
      return NextResponse.json({ success: false, error: 'Quick reply not found' }, { status: 404 });
    }
    
    const now = new Date().toISOString();
    
    db.prepare(`
      UPDATE QuickReply 
      SET lineTokenId = ?, title = ?, label = ?, icon = ?, emojis = ?, isFavorite = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      lineTokenId || existing.lineTokenId,
      title || existing.title,
      label || existing.label,
      icon || existing.icon,
      emojis !== undefined ? (emojis ? JSON.stringify(emojis) : null) : existing.emojis,
      isFavorite !== undefined ? (isFavorite ? 1 : 0) : existing.isFavorite,
      now,
      id
    );
    
    const updated = db.prepare('SELECT * FROM QuickReply WHERE id = ?').get(id) as QuickReplyRow;
    db.close();
    
    return NextResponse.json({ 
      success: true, 
      data: {
        ...updated,
        emojis: updated.emojis ? JSON.parse(updated.emojis) : undefined,
        isFavorite: updated.isFavorite === 1
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
    const db = getDb();
    
    // Check if exists
    const existing = db.prepare('SELECT * FROM QuickReply WHERE id = ?').get(id);
    if (!existing) {
      db.close();
      return NextResponse.json({ success: false, error: 'Quick reply not found' }, { status: 404 });
    }
    
    db.prepare('DELETE FROM QuickReply WHERE id = ?').run(id);
    db.close();
    
    return NextResponse.json({ success: true, message: 'Quick reply deleted successfully' });
  } catch (error) {
    console.error('Error deleting quick reply:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete quick reply' }, { status: 500 });
  }
}
