import { NextResponse } from 'next/server';
import { db, salaryBase, generateId } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';

// GET all salary bases
export async function GET() {
  try {
    const salaryBases = await db.select()
      .from(salaryBase)
      .orderBy(desc(salaryBase.baseSalary));
    
    return NextResponse.json({ success: true, data: salaryBases });
  } catch (error) {
    console.error('Error fetching salary bases:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch salary bases' }, { status: 500 });
  }
}

// POST create new salary base
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { position, baseSalary, positionAllowance } = body;
    
    if (!position) {
      return NextResponse.json({ success: false, error: 'Position is required' }, { status: 400 });
    }
    
    // Check if position already exists
    const [existing] = await db.select()
      .from(salaryBase)
      .where(eq(salaryBase.position, position));
    
    if (existing) {
      return NextResponse.json({ success: false, error: 'Position already exists' }, { status: 400 });
    }
    
    const id = generateId('sb');
    const now = new Date();
    
    await db.insert(salaryBase).values({
      id,
      position,
      baseSalary: baseSalary || 0,
      positionAllowance: positionAllowance || 0,
      createdAt: now,
      updatedAt: now
    });
    
    const [newSalaryBase] = await db.select()
      .from(salaryBase)
      .where(eq(salaryBase.id, id));
    
    return NextResponse.json({ success: true, data: newSalaryBase });
  } catch (error) {
    console.error('Error creating salary base:', error);
    return NextResponse.json({ success: false, error: 'Failed to create salary base' }, { status: 500 });
  }
}
