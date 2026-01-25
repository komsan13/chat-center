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

// GET - ดึงรายการเว็บไซต์ทั้งหมด
export async function GET() {
  try {
    const websites = db.prepare('SELECT * FROM Website ORDER BY createdAt DESC').all() as WebsiteRow[];
    
    return NextResponse.json({
      success: true,
      data: websites,
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
    const existingWebsite = db.prepare('SELECT * FROM Website WHERE url = ?').get(url) as WebsiteRow | undefined;

    if (existingWebsite) {
      return NextResponse.json(
        { success: false, error: 'Website URL already exists' },
        { status: 400 }
      );
    }

    // Generate ID
    const id = 'site_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const stmt = db.prepare(`
      INSERT INTO Website (id, name, url, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    stmt.run(id, name, url, status || 'active');

    const website = db.prepare('SELECT * FROM Website WHERE id = ?').get(id) as WebsiteRow;

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
