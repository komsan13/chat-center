import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';

// Database connection
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');

function getDb() {
  const db = new Database(dbPath);
  
  // Create Expenses table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS Expenses (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      websiteId TEXT,
      websiteName TEXT,
      category TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL DEFAULT 0,
      requester TEXT,
      paymentType TEXT DEFAULT 'cash',
      bankId TEXT,
      bankName TEXT,
      accountNumber TEXT,
      status TEXT DEFAULT 'unpaid',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  return db;
}

// GET - List all expenses with optional filters
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    
    const date = searchParams.get('date');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const websiteId = searchParams.get('websiteId');
    
    let query = 'SELECT * FROM Expenses WHERE 1=1';
    const params: string[] = [];
    
    if (date) {
      query += ' AND date = ?';
      params.push(date);
    }
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    if (websiteId) {
      query += ' AND websiteId = ?';
      params.push(websiteId);
    }
    
    query += ' ORDER BY date DESC, createdAt DESC';
    
    const stmt = db.prepare(query);
    const expensesData = stmt.all(...params) as any[];
    
    // Check if Bank table exists and get all banks for lookup
    let banksMap = new Map<string, { type: string; accountName: string }>();
    try {
      const banksStmt = db.prepare('SELECT id, type, accountName FROM Bank');
      const banks = banksStmt.all() as { id: string; type: string; accountName: string }[];
      banksMap = new Map(banks.map(b => [b.id, b]));
    } catch (e) {
      // Bank table might not exist, continue without bank info
    }
    
    // Add bank info to each expense
    const data = expensesData.map(expense => {
      if (expense.bankId && banksMap.size > 0) {
        const bank = banksMap.get(expense.bankId);
        return {
          ...expense,
          bankType: bank?.type || null,
          accountName: bank?.accountName || ''
        };
      }
      return {
        ...expense,
        bankType: null,
        accountName: ''
      };
    });
    
    db.close();
    
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

// POST - Create new expense
export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    
    const { 
      date, 
      websiteId, 
      websiteName, 
      category, 
      description, 
      amount, 
      requester, 
      paymentType, 
      bankId, 
      bankName, 
      accountNumber,
      status 
    } = body;
    
    // Validate required fields
    if (!date || !category || amount === undefined) {
      db.close();
      return NextResponse.json(
        { success: false, error: 'Missing required fields: date, category, amount' },
        { status: 400 }
      );
    }
    
    const id = randomUUID();
    
    const insertStmt = db.prepare(`
      INSERT INTO Expenses (
        id, date, websiteId, websiteName, category, description, amount, 
        requester, paymentType, bankId, bankName, accountNumber, status, createdAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    insertStmt.run(
      id,
      date,
      websiteId || null,
      websiteName || '',
      category,
      description || '',
      amount || 0,
      requester || '',
      paymentType || 'cash',
      bankId || null,
      bankName || '',
      accountNumber || '',
      status || 'unpaid'
    );
    
    db.close();
    
    return NextResponse.json({
      success: true,
      data: { id },
      message: 'Expense created successfully'
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}

// PUT - Update expense
export async function PUT(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    
    const { 
      id,
      date, 
      websiteId, 
      websiteName, 
      category, 
      description, 
      amount, 
      requester, 
      paymentType, 
      bankId, 
      bankName, 
      accountNumber,
      status 
    } = body;
    
    // Validate required fields
    if (!id) {
      db.close();
      return NextResponse.json(
        { success: false, error: 'Missing expense ID' },
        { status: 400 }
      );
    }
    
    const updateStmt = db.prepare(`
      UPDATE Expenses SET
        date = ?,
        websiteId = ?,
        websiteName = ?,
        category = ?,
        description = ?,
        amount = ?,
        requester = ?,
        paymentType = ?,
        bankId = ?,
        bankName = ?,
        accountNumber = ?,
        status = ?,
        updatedAt = datetime('now')
      WHERE id = ?
    `);
    
    const result = updateStmt.run(
      date,
      websiteId || null,
      websiteName || '',
      category,
      description || '',
      amount || 0,
      requester || '',
      paymentType || 'cash',
      bankId || null,
      bankName || '',
      accountNumber || '',
      status || 'unpaid',
      id
    );
    
    db.close();
    
    if (result.changes === 0) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Expense updated successfully'
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update expense' },
      { status: 500 }
    );
  }
}

// DELETE - Delete expense
export async function DELETE(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      db.close();
      return NextResponse.json(
        { success: false, error: 'Missing expense ID' },
        { status: 400 }
      );
    }
    
    const deleteStmt = db.prepare('DELETE FROM Expenses WHERE id = ?');
    const result = deleteStmt.run(id);
    
    db.close();
    
    if (result.changes === 0) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete expense' },
      { status: 500 }
    );
  }
}
