import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');

function generateId(prefix: string = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// GET - ดึงข้อมูล LINE Tokens ทั้งหมด
export async function GET() {
  try {
    const db = new Database(dbPath);
    
    const tokens = db.prepare(`
      SELECT * FROM LineToken 
      ORDER BY createdAt DESC
    `).all() as Record<string, any>[];

    db.close();

    return NextResponse.json({
      success: true,
      data: tokens.map((token) => ({
        ...token,
        // ซ่อน token บางส่วน
        accessToken: token.accessToken ? maskToken(token.accessToken as string) : null,
        channelSecret: token.channelSecret ? maskToken(token.channelSecret as string) : null,
      }))
    });
  } catch (error) {
    console.error('Error fetching LINE tokens:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch LINE tokens' }, { status: 500 });
  }
}

// POST - เพิ่ม LINE Token ใหม่
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, channelId, channelSecret, accessToken, websiteId, websiteName, status } = body;

    if (!name || !channelId || !channelSecret || !accessToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'กรุณากรอกข้อมูลให้ครบ (ชื่อ, Channel ID, Channel Secret, Access Token)' 
      }, { status: 400 });
    }

    const db = new Database(dbPath);
    const id = generateId('lt_');
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO LineToken (id, name, channelId, channelSecret, accessToken, websiteId, websiteName, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, channelId, channelSecret, accessToken, websiteId || null, websiteName || null, status || 'active', now, now);

    const newToken = db.prepare('SELECT * FROM LineToken WHERE id = ?').get(id);
    db.close();

    return NextResponse.json({
      success: true,
      message: 'เพิ่ม LINE Token สำเร็จ',
      data: newToken
    });
  } catch (error) {
    console.error('Error creating LINE token:', error);
    return NextResponse.json({ success: false, error: 'Failed to create LINE token' }, { status: 500 });
  }
}

// PUT - แก้ไข LINE Token
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, channelId, channelSecret, accessToken, websiteId, websiteName, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing token ID' }, { status: 400 });
    }

    const db = new Database(dbPath);
    const existing = db.prepare('SELECT * FROM LineToken WHERE id = ?').get(id);

    if (!existing) {
      db.close();
      return NextResponse.json({ success: false, error: 'Token not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // ถ้าไม่ได้ส่ง secret/token ใหม่มา ให้ใช้ค่าเดิม
    const existingToken = existing as Record<string, unknown>;
    const finalChannelSecret = channelSecret || existingToken.channelSecret;
    const finalAccessToken = accessToken || existingToken.accessToken;

    db.prepare(`
      UPDATE LineToken 
      SET name = ?, channelId = ?, channelSecret = ?, accessToken = ?, 
          websiteId = ?, websiteName = ?, status = ?, updatedAt = ?
      WHERE id = ?
    `).run(name, channelId, finalChannelSecret, finalAccessToken, websiteId || null, websiteName || null, status, now, id);

    const updated = db.prepare('SELECT * FROM LineToken WHERE id = ?').get(id);
    db.close();

    return NextResponse.json({
      success: true,
      message: 'แก้ไข LINE Token สำเร็จ',
      data: updated
    });
  } catch (error) {
    console.error('Error updating LINE token:', error);
    return NextResponse.json({ success: false, error: 'Failed to update LINE token' }, { status: 500 });
  }
}

// DELETE - ลบ LINE Token
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing token ID' }, { status: 400 });
    }

    const db = new Database(dbPath);
    const existing = db.prepare('SELECT * FROM LineToken WHERE id = ?').get(id);

    if (!existing) {
      db.close();
      return NextResponse.json({ success: false, error: 'Token not found' }, { status: 404 });
    }

    db.prepare('DELETE FROM LineToken WHERE id = ?').run(id);
    db.close();

    return NextResponse.json({
      success: true,
      message: 'ลบ LINE Token สำเร็จ'
    });
  } catch (error) {
    console.error('Error deleting LINE token:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete LINE token' }, { status: 500 });
  }
}

// Helper function - ซ่อน token บางส่วน
function maskToken(token: string): string {
  if (token.length <= 10) return '••••••••••';
  return token.substring(0, 8) + '••••••••' + token.substring(token.length - 4);
}
