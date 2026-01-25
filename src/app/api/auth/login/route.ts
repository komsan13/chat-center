import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import path from 'path';
import { createSession } from '@/lib/auth';

// Direct SQLite connection - use same path as other APIs
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Connect to database
    const db = new Database(dbPath);
    
    // Find user
    const user = db.prepare('SELECT * FROM User WHERE email = ?').get(email) as {
      id: string;
      email: string;
      password: string;
      name: string;
      role: string;
    } | undefined;
    
    db.close();

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create session
    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
