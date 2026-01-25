import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

// Initialize SQLite database
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const db = new Database(dbPath);

interface WebsiteRow {
  id: string;
  name: string;
  url: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// GET - ดึงข้อมูลเว็บไซต์ตาม ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const website = db.prepare('SELECT * FROM Website WHERE id = ?').get(id) as WebsiteRow | undefined;

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
    const existingWebsite = db.prepare('SELECT * FROM Website WHERE id = ?').get(id) as WebsiteRow | undefined;

    if (!existingWebsite) {
      return NextResponse.json(
        { success: false, error: 'Website not found' },
        { status: 404 }
      );
    }

    // ตรวจสอบ URL ซ้ำ (ยกเว้นตัวเอง)
    if (url && url !== existingWebsite.url) {
      const duplicateUrl = db.prepare('SELECT * FROM Website WHERE url = ? AND id != ?').get(url, id) as WebsiteRow | undefined;

      if (duplicateUrl) {
        return NextResponse.json(
          { success: false, error: 'Website URL already exists' },
          { status: 400 }
        );
      }
    }

    const stmt = db.prepare(`
      UPDATE Website 
      SET name = ?, url = ?, status = ?, updatedAt = datetime('now')
      WHERE id = ?
    `);
    
    stmt.run(
      name || existingWebsite.name,
      url || existingWebsite.url,
      status || existingWebsite.status,
      id
    );

    const website = db.prepare('SELECT * FROM Website WHERE id = ?').get(id) as WebsiteRow;

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
    const existingWebsite = db.prepare('SELECT * FROM Website WHERE id = ?').get(id) as WebsiteRow | undefined;

    if (!existingWebsite) {
      return NextResponse.json(
        { success: false, error: 'Website not found' },
        { status: 404 }
      );
    }

    db.prepare('DELETE FROM Website WHERE id = ?').run(id);

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
