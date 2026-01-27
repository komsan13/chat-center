import { NextRequest, NextResponse } from 'next/server';
import { db, websites } from '@/lib/db';
import { eq, and, ne } from 'drizzle-orm';

// GET - ดึงข้อมูลเว็บไซต์ตาม ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const [website] = await db
      .select()
      .from(websites)
      .where(eq(websites.id, id))
      .limit(1);

    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Website not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: website,
    });
  } catch (error) {
    console.error('Error fetching website:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch website' },
      { status: 500 }
    );
  }
}

// PUT - แก้ไขเว็บไซต์
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, url, status } = body;

    // ตรวจสอบว่ามี website นี้อยู่หรือไม่
    const [existingWebsite] = await db
      .select()
      .from(websites)
      .where(eq(websites.id, id))
      .limit(1);

    if (!existingWebsite) {
      return NextResponse.json(
        { success: false, error: 'Website not found' },
        { status: 404 }
      );
    }

    // ตรวจสอบ URL ซ้ำ (ยกเว้นตัวเอง)
    if (url && url !== existingWebsite.url) {
      const [duplicateUrl] = await db
        .select()
        .from(websites)
        .where(and(eq(websites.url, url), ne(websites.id, id)))
        .limit(1);

      if (duplicateUrl) {
        return NextResponse.json(
          { success: false, error: 'Website URL already exists' },
          { status: 400 }
        );
      }
    }

    await db
      .update(websites)
      .set({
        name: name || existingWebsite.name,
        url: url || existingWebsite.url,
        status: status || existingWebsite.status,
        updatedAt: new Date(),
      })
      .where(eq(websites.id, id));

    const [website] = await db
      .select()
      .from(websites)
      .where(eq(websites.id, id))
      .limit(1);

    return NextResponse.json({
      success: true,
      data: website,
      message: 'Website updated successfully',
    });
  } catch (error) {
    console.error('Error updating website:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update website' },
      { status: 500 }
    );
  }
}

// DELETE - ลบเว็บไซต์
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // ตรวจสอบว่ามี website นี้อยู่หรือไม่
    const [existingWebsite] = await db
      .select()
      .from(websites)
      .where(eq(websites.id, id))
      .limit(1);

    if (!existingWebsite) {
      return NextResponse.json(
        { success: false, error: 'Website not found' },
        { status: 404 }
      );
    }

    await db.delete(websites).where(eq(websites.id, id));

    return NextResponse.json({
      success: true,
      message: 'Website deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting website:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete website' },
      { status: 500 }
    );
  }
}
