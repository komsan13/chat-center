import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const db = new Database(dbPath);

interface UserRow {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: string;
  roleId: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const users = db.prepare(`
      SELECT id, email, name, avatar, role, roleId 
      FROM User 
      WHERE roleId = ?
      ORDER BY name ASC
    `).all(id) as UserRow[];

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('Error fetching users by role:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
