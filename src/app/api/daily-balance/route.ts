import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';

// Database connection
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');

function getDb() {
  const db = new Database(dbPath);
  
  // Create DailyBalance table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS DailyBalance (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      websiteId TEXT,
      websiteName TEXT,
      bankId TEXT NOT NULL,
      bankName TEXT NOT NULL,
      accountNumber TEXT,
      openingBalance REAL DEFAULT 0,
      closingBalance REAL DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(date, bankId)
    )
  `);
  
  return db;
}

// GET - List all daily balances with optional filters
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    
    const date = searchParams.get('date');
    const bankId = searchParams.get('bankId');
    const websiteId = searchParams.get('websiteId');
    
    let query = 'SELECT * FROM DailyBalance WHERE 1=1';
    const params: string[] = [];
    
    if (date) {
      query += ' AND date = ?';
      params.push(date);
    }
    
    if (bankId) {
      query += ' AND bankId = ?';
      params.push(bankId);
    }
    
    if (websiteId) {
      query += ' AND websiteId = ?';
      params.push(websiteId);
    }
    
    query += ' ORDER BY date DESC, bankName ASC';
    
    const stmt = db.prepare(query);
    const data = stmt.all(...params);
    
    db.close();
    
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching daily balances:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch daily balances' },
      { status: 500 }
    );
  }
}

// POST - Create new daily balance(s) - support multiple items
export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    
    // Support both single item and array of items
    const items = Array.isArray(body) ? body : [body];
    const results: { id: string; date: string; bankName: string }[] = [];
    const errors: { date: string; bankName: string; error: string }[] = [];
    
    const insertStmt = db.prepare(`
      INSERT INTO DailyBalance (id, date, websiteId, websiteName, bankId, bankName, accountNumber, openingBalance, closingBalance, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    const checkExistsStmt = db.prepare('SELECT id FROM DailyBalance WHERE date = ? AND bankId = ?');
    
    for (const item of items) {
      const { date, websiteId, websiteName, bankId, bankName, accountNumber, openingBalance, closingBalance } = item;
      
      // Validate required fields
      if (!date || !bankId || !bankName) {
        errors.push({
          date: date || 'N/A',
          bankName: bankName || 'N/A',
          error: 'Missing required fields: date, bankId, bankName'
        });
        continue;
      }
      
      // Check for duplicate (same date + bankId)
      const existing = checkExistsStmt.get(date, bankId) as { id: string } | undefined;
      if (existing) {
        errors.push({
          date,
          bankName,
          error: `Record already exists for date ${date} and bank ${bankName}`
        });
        continue;
      }
      
      try {
        const id = randomUUID();
        insertStmt.run(
          id,
          date,
          websiteId || null,
          websiteName || '',
          bankId,
          bankName,
          accountNumber || '',
          openingBalance || 0,
          closingBalance || 0
        );
        
        results.push({ id, date, bankName });
      } catch (err) {
        errors.push({
          date,
          bankName,
          error: err instanceof Error ? err.message : 'Insert failed'
        });
      }
    }
    
    db.close();
    
    if (errors.length > 0 && results.length === 0) {
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: results,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully created ${results.length} record(s)${errors.length > 0 ? `, ${errors.length} failed` : ''}`
    });
  } catch (error) {
    console.error('Error creating daily balance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create daily balance' },
      { status: 500 }
    );
  }
}
