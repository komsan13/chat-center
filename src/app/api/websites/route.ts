import { NextRequest, NextResponse } from 'next/server';
import { db, websites, generateId } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';

// GET - ดึงรายการเว็บไซต์ทั้งหมด
export async function GET() {
  try {
    const allWebsites = await db
      .select()
      .from(websites)
      .orderBy(desc(websites.createdAt));
    
    return NextResponse.json({
      success: true,
      data: allWebsites,
    });
  } catch (error) {
    console.error('Error fetching websites:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch websites' },
      { status: 500 }
    );
  }
}

// POST - เพิ่มเว็บไซต์ใหม่
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, url, status } = body;

    // Validation
    if (!name || !url) {
      return NextResponse.json(
        { success: false, error: 'Name and URL are required' },
        { status: 400 }
      );
    }

    // ตรวจสอบ URL ซ้ำ
    const existingWebsite = await db
      .select()
      .from(websites)
      .where(eq(websites.url, url))
      .limit(1);

    if (existingWebsite.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Website URL already exists' },
        { status: 400 }
      );
    }

    // Insert - let schema handle id and timestamps
    const [website] = await db.insert(websites).values({
      name,
      url,
      status: status || 'active',
    }).returning();

    return NextResponse.json({
      success: true,
      data: website,
      message: 'Website created successfully',
    });
  } catch (error) {
    console.error('Error creating website:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create website' },
      { status: 500 }
    );
  }
}
