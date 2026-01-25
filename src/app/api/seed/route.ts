import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

// สร้าง user เริ่มต้นสำหรับทดสอบ
export async function GET() {
  try {
    // Check if admin already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'admin@aurix.com' },
    });

    if (existingUser) {
      return NextResponse.json({
        message: 'Admin user already exists',
        email: 'admin@aurix.com',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 12);

    // Create admin user
    const user = await prisma.user.create({
      data: {
        email: 'admin@aurix.com',
        password: hashedPassword,
        name: 'Admin Aurix',
        role: 'admin',
      },
    });

    return NextResponse.json({
      message: 'Admin user created successfully',
      email: user.email,
      hint: 'Password is: admin123',
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Failed to seed database' },
      { status: 500 }
    );
  }
}
