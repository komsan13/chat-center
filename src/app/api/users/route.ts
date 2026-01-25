import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

// Initialize SQLite database
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const db = new Database(dbPath);

interface UserRow {
  id: string;
  email: string;
  password: string;
  name: string;
  avatar: string | null;
  role: string;
  employeeId: string | null;
  createdAt: string;
  updatedAt: string;
}

// GET - ดึงรายการผู้ใช้ทั้งหมด
export async function GET() {
  try {
    const users = db.prepare('SELECT id, email, name, avatar, role, employeeId, createdAt, updatedAt FROM User ORDER BY createdAt DESC').all() as Omit<UserRow, 'password'>[];

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST - เพิ่มผู้ใช้ใหม่
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role, employeeId } = body;

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: 'Email, password and name are required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = db.prepare('SELECT id FROM User WHERE email = ?').get(email);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Generate ID
    const id = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const stmt = db.prepare(`
      INSERT INTO User (id, email, password, name, avatar, role, employeeId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    stmt.run(id, email, hashedPassword, name, null, role || 'user', employeeId || null);

    const user = db.prepare('SELECT id, email, name, avatar, role, employeeId, createdAt, updatedAt FROM User WHERE id = ?').get(id) as Omit<UserRow, 'password'>;

    return NextResponse.json({
      success: true,
      data: user,
      message: 'User created successfully',
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

// PUT - แก้ไขข้อมูลผู้ใช้
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, email, password, name, role, employeeId, roleId } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = db.prepare('SELECT * FROM User WHERE id = ?').get(id) as UserRow;
    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if email is taken by another user
    if (email && email !== existingUser.email) {
      const emailTaken = db.prepare('SELECT id FROM User WHERE email = ? AND id != ?').get(email, id);
      if (emailTaken) {
        return NextResponse.json(
          { success: false, error: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    // If password provided, hash it
    let hashedPassword = existingUser.password;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const stmt = db.prepare(`
      UPDATE User 
      SET email = ?, password = ?, name = ?, role = ?, employeeId = ?, roleId = ?, updatedAt = datetime('now')
      WHERE id = ?
    `);
    
    stmt.run(
      email || existingUser.email,
      hashedPassword,
      name || existingUser.name,
      role || existingUser.role,
      employeeId !== undefined ? employeeId : existingUser.employeeId,
      roleId !== undefined ? roleId : (existingUser as any).roleId,
      id
    );

    const user = db.prepare('SELECT id, email, name, avatar, role, employeeId, createdAt, updatedAt FROM User WHERE id = ?').get(id) as Omit<UserRow, 'password'>;

    return NextResponse.json({
      success: true,
      data: user,
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE - ลบผู้ใช้
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = db.prepare('SELECT * FROM User WHERE id = ?').get(id);
    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    db.prepare('DELETE FROM User WHERE id = ?').run(id);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
