import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');

function getDb() {
  return new Database(dbPath);
}

// GET single salary base
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const salaryBase = db.prepare('SELECT * FROM SalaryBase WHERE id = ?').get(id);
    db.close();
    
    if (!salaryBase) {
      return NextResponse.json({ success: false, error: 'Salary base not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: salaryBase });
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
    
    const db = getDb();
    
    // Check if record exists
    const existing = db.prepare('SELECT * FROM SalaryBase WHERE id = ?').get(id);
    if (!existing) {
      db.close();
      return NextResponse.json({ success: false, error: 'Salary base not found' }, { status: 404 });
    }
    
    // Check if position already exists for another record
    const duplicate = db.prepare('SELECT id FROM SalaryBase WHERE position = ? AND id != ?').get(position, id);
    if (duplicate) {
      db.close();
      return NextResponse.json({ success: false, error: 'Position already exists' }, { status: 400 });
    }
    
    const now = new Date().toISOString();
    
    db.prepare(`
      UPDATE SalaryBase 
      SET position = ?, baseSalary = ?, positionAllowance = ?, updatedAt = ?
      WHERE id = ?
    `).run(position, baseSalary || 0, positionAllowance || 0, now, id);
    
    const updated = db.prepare('SELECT * FROM SalaryBase WHERE id = ?').get(id);
    db.close();
    
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
    const db = getDb();
    
    // Check if record exists
    const existing = db.prepare('SELECT * FROM SalaryBase WHERE id = ?').get(id);
    if (!existing) {
      db.close();
      return NextResponse.json({ success: false, error: 'Salary base not found' }, { status: 404 });
    }
    
    db.prepare('DELETE FROM SalaryBase WHERE id = ?').run(id);
    db.close();
    
    return NextResponse.json({ success: true, message: 'Salary base deleted successfully' });
  } catch (error) {
    console.error('Error deleting salary base:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete salary base' }, { status: 500 });
  }
}
