import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

// Initialize SQLite database
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const db = new Database(dbPath);

interface BankRow {
  id: string;
  type: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// GET - ดึงรายการธนาคารทั้งหมด
export async function GET() {
  try {
    const banks = db.prepare('SELECT * FROM Bank ORDER BY createdAt DESC').all() as BankRow[];
    
    return NextResponse.json({
      success: true,
      data: banks,
    });
  } catch (error) {
    console.error('Error fetching banks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch banks' },
      { status: 500 }
    );
  }
}

// POST - เพิ่มธนาคารใหม่
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, bankName, accountName, accountNumber, status } = body;

    // Validation
    if (!bankName || !accountName || !accountNumber) {
      return NextResponse.json(
        { success: false, error: 'Bank name, account name and account number are required' },
        { status: 400 }
      );
    }

    // ตรวจสอบเลขบัญชีซ้ำ
    const existingBank = db.prepare('SELECT * FROM Bank WHERE accountNumber = ?').get(accountNumber) as BankRow | undefined;

    if (existingBank) {
      return NextResponse.json(
        { success: false, error: 'Account number already exists' },
        { status: 400 }
      );
    }

    // Generate ID
    const id = 'bank_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const stmt = db.prepare(`
      INSERT INTO Bank (id, type, bankName, accountName, accountNumber, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    stmt.run(id, type || 'deposit', bankName, accountName, accountNumber, status || 'active');

    const bank = db.prepare('SELECT * FROM Bank WHERE id = ?').get(id) as BankRow;

    return NextResponse.json({
      success: true,
      data: bank,
      message: 'Bank created successfully',
    });
  } catch (error) {
    console.error('Error creating bank:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create bank' },
      { status: 500 }
    );
  }
}
