import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');

function getDb() {
  return new Database(dbPath);
}

// GET all salary bases
export async function GET() {
  try {
    const db = getDb();
    
    // Create table if not exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS SalaryBase (
        id TEXT PRIMARY KEY,
        position TEXT NOT NULL UNIQUE,
        baseSalary REAL NOT NULL DEFAULT 0,
        positionAllowance REAL NOT NULL DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const salaryBases = db.prepare('SELECT * FROM SalaryBase ORDER BY baseSalary DESC').all();
    db.close();
    
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
    
    const db = getDb();
    
    // Create table if not exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS SalaryBase (
        id TEXT PRIMARY KEY,
        position TEXT NOT NULL UNIQUE,
        baseSalary REAL NOT NULL DEFAULT 0,
        positionAllowance REAL NOT NULL DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Check if position already exists
    const existing = db.prepare('SELECT id FROM SalaryBase WHERE position = ?').get(position);
    if (existing) {
      db.close();
      return NextResponse.json({ success: false, error: 'Position already exists' }, { status: 400 });
    }
    
    const id = `sb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO SalaryBase (id, position, baseSalary, positionAllowance, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, position, baseSalary || 0, positionAllowance || 0, now, now);
    
    const newSalaryBase = db.prepare('SELECT * FROM SalaryBase WHERE id = ?').get(id);
    db.close();
    
    return NextResponse.json({ success: true, data: newSalaryBase });
  } catch (error) {
    console.error('Error creating salary base:', error);
    return NextResponse.json({ success: false, error: 'Failed to create salary base' }, { status: 500 });
  }
}
