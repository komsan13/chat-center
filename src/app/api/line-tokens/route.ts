import { NextRequest, NextResponse } from 'next/server';
import { db, lineTokens, generateId } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';

// GET - ดึงข้อมูล LINE Tokens ทั้งหมด
export async function GET() {
  try {
    const tokens = await db.select().from(lineTokens).orderBy(desc(lineTokens.createdAt));

    return NextResponse.json({
      success: true,
      data: tokens.map((token) => ({
        ...token,
        // ซ่อน token บางส่วน
        accessToken: token.accessToken ? maskToken(token.accessToken) : null,
        channelSecret: token.channelSecret ? maskToken(token.channelSecret) : null,
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

    const id = 'lt_' + generateId();
    const now = new Date();

    const [newToken] = await db.insert(lineTokens).values({
      id,
      name,
      channelId,
      channelSecret,
      accessToken,
      websiteId: websiteId || null,
      websiteName: websiteName || null,
      status: status || 'active',
      createdAt: now,
      updatedAt: now,
    }).returning();

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

    const [existing] = await db.select().from(lineTokens).where(eq(lineTokens.id, id));

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Token not found' }, { status: 404 });
    }

    // ถ้าไม่ได้ส่ง secret/token ใหม่มา ให้ใช้ค่าเดิม
    const finalChannelSecret = channelSecret || existing.channelSecret;
    const finalAccessToken = accessToken || existing.accessToken;

    const [updated] = await db.update(lineTokens)
      .set({
        name,
        channelId,
        channelSecret: finalChannelSecret,
        accessToken: finalAccessToken,
        websiteId: websiteId || null,
        websiteName: websiteName || null,
        status,
        updatedAt: new Date(),
      })
      .where(eq(lineTokens.id, id))
      .returning();

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

    const [existing] = await db.select().from(lineTokens).where(eq(lineTokens.id, id));

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Token not found' }, { status: 404 });
    }

    await db.delete(lineTokens).where(eq(lineTokens.id, id));

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
