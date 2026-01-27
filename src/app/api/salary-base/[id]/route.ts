import { NextResponse } from 'next/server';
import { db, salaryBase } from '@/lib/db';
import { eq, and, ne } from 'drizzle-orm';

// GET single salary base
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [salaryBaseRecord] = await db.select()
      .from(salaryBase)
      .where(eq(salaryBase.id, id));
    
    if (!salaryBaseRecord) {
      return NextResponse.json({ success: false, error: 'Salary base not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: salaryBaseRecord });
  } catch (error) {
    console.error('Error fetching salary base:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch salary base' }, { status: 500 });
  }
}

// PUT update salary base
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { position, baseSalary, positionAllowance } = body;
    
    if (!position) {
      return NextResponse.json({ success: false, error: 'Position is required' }, { status: 400 });
    }
    
    // Check if record exists
    const [existing] = await db.select()
      .from(salaryBase)
      .where(eq(salaryBase.id, id));
    
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Salary base not found' }, { status: 404 });
    }
    
    // Check if position already exists for another record
    const [duplicate] = await db.select()
      .from(salaryBase)
      .where(and(eq(salaryBase.position, position), ne(salaryBase.id, id)));
    
    if (duplicate) {
      return NextResponse.json({ success: false, error: 'Position already exists' }, { status: 400 });
    }
    
    const now = new Date();
    
    await db.update(salaryBase)
      .set({
        position,
        baseSalary: baseSalary || 0,
        positionAllowance: positionAllowance || 0,
        updatedAt: now
      })
      .where(eq(salaryBase.id, id));
    
    const [updated] = await db.select()
      .from(salaryBase)
      .where(eq(salaryBase.id, id));
    
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating salary base:', error);
    return NextResponse.json({ success: false, error: 'Failed to update salary base' }, { status: 500 });
  }
}

// DELETE salary base
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if record exists
    const [existing] = await db.select()
      .from(salaryBase)
      .where(eq(salaryBase.id, id));
    
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Salary base not found' }, { status: 404 });
    }
    
    await db.delete(salaryBase).where(eq(salaryBase.id, id));
    
    return NextResponse.json({ success: true, message: 'Salary base deleted successfully' });
  } catch (error) {
    console.error('Error deleting salary base:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete salary base' }, { status: 500 });
  }
}
