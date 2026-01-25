import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');

function getDb() {
  const db = new Database(dbPath);
  
  // Create table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS CashWithdrawal (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      websiteId TEXT,
      websiteName TEXT,
      bankId TEXT NOT NULL,
      bankName TEXT NOT NULL,
      accountNumber TEXT NOT NULL,
      accountName TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      fee REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add websiteId, websiteName columns if not exist
  try {
    db.exec(`ALTER TABLE CashWithdrawal ADD COLUMN websiteId TEXT`);
  } catch (e) { /* column already exists */ }
  try {
    db.exec(`ALTER TABLE CashWithdrawal ADD COLUMN websiteName TEXT`);
  } catch (e) { /* column already exists */ }
  
  return db;
}

interface CashWithdrawalRow {
  id: string;
  date: string;
  websiteId: string;
  websiteName: string;
  bankId: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  fee: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// GET all cash withdrawals
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const dateFilter = searchParams.get('date');
    const statusFilter = searchParams.get('status');
    
    let query = 'SELECT * FROM CashWithdrawal';
    const conditions: string[] = [];
    const params: string[] = [];
    
    if (dateFilter) {
      conditions.push('date = ?');
      params.push(dateFilter);
    }
    
    if (statusFilter && statusFilter !== 'all') {
      conditions.push('status = ?');
      params.push(statusFilter);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY date DESC, createdAt DESC';
    
    const withdrawals = db.prepare(query).all(...params) as CashWithdrawalRow[];
    db.close();
    
    return NextResponse.json({ success: true, data: withdrawals });
  } catch (error) {
    console.error('Error fetching cash withdrawals:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch cash withdrawals' }, { status: 500 });
  }
}

// POST create new cash withdrawal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, websiteId, websiteName, bankId, bankName, accountNumber, accountName, amount, fee, status } = body;
    
    if (!date || !bankId) {
      return NextResponse.json({ success: false, error: 'Date and bank are required' }, { status: 400 });
    }
    
    const db = getDb();
    
    const id = `cw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const amountValue = parseFloat(amount) || 0;
    const feeValue = parseFloat(fee) || 0;
    const statusValue = status || 'pending';
    
    db.prepare(`
      INSERT INTO CashWithdrawal (id, date, websiteId, websiteName, bankId, bankName, accountNumber, accountName, amount, fee, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, date, websiteId || null, websiteName || null, bankId, bankName, accountNumber, accountName, amountValue, feeValue, statusValue, now, now);
    
    const newWithdrawal = db.prepare('SELECT * FROM CashWithdrawal WHERE id = ?').get(id);
    db.close();
    
    return NextResponse.json({ success: true, data: newWithdrawal });
  } catch (error) {
    console.error('Error creating cash withdrawal:', error);
    return NextResponse.json({ success: false, error: 'Failed to create cash withdrawal' }, { status: 500 });
  }
}
