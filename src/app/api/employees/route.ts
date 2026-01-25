import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

// Initialize SQLite database
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const db = new Database(dbPath);

interface EmployeeRow {
  id: string;
  fullName: string;
  position: string;
  websites: string;
  bankName: string;
  accountNumber: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// GET - ดึงรายการพนักงานทั้งหมด
export async function GET() {
  try {
    const employees = db.prepare('SELECT * FROM Employee ORDER BY createdAt DESC').all() as EmployeeRow[];
    
    // Parse websites JSON
    const parsed = employees.map(emp => ({
      ...emp,
      websites: JSON.parse(emp.websites || '[]')
    }));

    return NextResponse.json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

// POST - เพิ่มพนักงานใหม่
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, position, websites, bankName, accountNumber, status } = body;

    // Validation
    if (!fullName || !bankName || !accountNumber) {
      return NextResponse.json(
        { success: false, error: 'Full name, bank name and account number are required' },
        { status: 400 }
      );
    }

    if (!position) {
      return NextResponse.json(
        { success: false, error: 'Position is required' },
        { status: 400 }
      );
    }

    if (!websites || !Array.isArray(websites) || websites.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one website must be selected' },
        { status: 400 }
      );
    }

    // Generate ID
    const id = 'emp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const stmt = db.prepare(`
      INSERT INTO Employee (id, fullName, position, websites, bankName, accountNumber, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    stmt.run(id, fullName, position, JSON.stringify(websites), bankName, accountNumber, status || 'active');

    const employee = db.prepare('SELECT * FROM Employee WHERE id = ?').get(id) as EmployeeRow;

    return NextResponse.json({
      success: true,
      data: {
        ...employee,
        websites: JSON.parse(employee.websites || '[]')
      },
      message: 'Employee created successfully',
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}
