import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');

function getDb() {
  const db = new Database(dbPath);
  
  // Create table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS Transfer (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      websiteId TEXT,
      websiteName TEXT,
      fromBankId TEXT NOT NULL,
      fromBankName TEXT NOT NULL,
      fromAccountNumber TEXT,
      toBankId TEXT NOT NULL,
      toBankName TEXT NOT NULL,
      toAccountNumber TEXT,
      amount REAL NOT NULL DEFAULT 0,
      note TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  return db;
}

interface TransferRow {
  id: string;
  date: string;
  websiteId: string;
  websiteName: string;
  fromBankId: string;
  fromBankName: string;
  fromAccountNumber: string;
  toBankId: string;
  toBankName: string;
  toAccountNumber: string;
  amount: number;
  note: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// GET all transfers
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const dateFilter = searchParams.get('date');
    const statusFilter = searchParams.get('status');
    const websiteFilter = searchParams.get('websiteId');
    
    let query = 'SELECT * FROM Transfer';
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
    
    if (websiteFilter && websiteFilter !== 'all') {
      conditions.push('websiteId = ?');
      params.push(websiteFilter);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY date DESC, createdAt DESC';
    
    const transfers = db.prepare(query).all(...params) as TransferRow[];
    db.close();
    
    return NextResponse.json({ success: true, data: transfers });
  } catch (error) {
    console.error('Error fetching transfers:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch transfers' }, { status: 500 });
  }
}

// POST create new transfer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      date, websiteId, websiteName, 
      fromBankId, fromBankName, fromAccountNumber,
      toBankId, toBankName, toAccountNumber,
      amount, note, status 
    } = body;
    
    if (!date || !fromBankId || !toBankId) {
      return NextResponse.json({ success: false, error: 'Date, from bank and to bank are required' }, { status: 400 });
    }
    
    if (fromBankId === toBankId) {
      return NextResponse.json({ success: false, error: 'จากบัญชีและไปยังบัญชีต้องไม่ซ้ำกัน' }, { status: 400 });
    }
    
    const db = getDb();
    
    const id = `tf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const amountValue = parseFloat(amount) || 0;
    const statusValue = status || 'pending';
    
    db.prepare(`
      INSERT INTO Transfer (id, date, websiteId, websiteName, fromBankId, fromBankName, fromAccountNumber, toBankId, toBankName, toAccountNumber, amount, note, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, date, websiteId || null, websiteName || null, fromBankId, fromBankName, fromAccountNumber || null, toBankId, toBankName, toAccountNumber || null, amountValue, note || null, statusValue, now, now);
    
    const newTransfer = db.prepare('SELECT * FROM Transfer WHERE id = ?').get(id);
    db.close();
    
    return NextResponse.json({ success: true, data: newTransfer });
  } catch (error) {
    console.error('Error creating transfer:', error);
    return NextResponse.json({ success: false, error: 'Failed to create transfer' }, { status: 500 });
  }
}
