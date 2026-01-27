import { NextRequest, NextResponse } from 'next/server';
import { db, users } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const usersList = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatar: users.avatar,
        role: users.role,
      })
      .from(users)
      .where(eq(users.role, id))
      .orderBy(asc(users.name));

    return NextResponse.json({
      success: true,
      data: usersList,
    });
  } catch (error) {
    console.error('Error fetching users by role:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
