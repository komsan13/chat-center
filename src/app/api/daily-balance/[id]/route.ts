import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

// Database connection
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');

function getDb() {
  return new Database(dbPath);
}

// GET - Get single daily balance by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    
    const stmt = db.prepare('SELECT * FROM DailyBalance WHERE id = ?');
    const data = stmt.get(id);
    
    db.close();
    
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Daily balance not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching daily balance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch daily balance' },
      { status: 500 }
    );
  }
}

// PUT - Update daily balance by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const body = await request.json();
    
    const { date, websiteId, websiteName, bankId, bankName, accountNumber, openingBalance, closingBalance } = body;
    
    // Check if record exists
    const existsStmt = db.prepare('SELECT id FROM DailyBalance WHERE id = ?');
    const existing = existsStmt.get(id);
    
    if (!existing) {
      db.close();
      return NextResponse.json(
        { success: false, error: 'Daily balance not found' },
        { status: 404 }
      );
    }
    
    // Check for duplicate (same date + bankId, but different id)
    if (date && bankId) {
      const dupStmt = db.prepare('SELECT id FROM DailyBalance WHERE date = ? AND bankId = ? AND id != ?');
      const duplicate = dupStmt.get(date, bankId, id);
      if (duplicate) {
        db.close();
        return NextResponse.json(
          { success: false, error: `Record already exists for date ${date} and bank ${bankName}` },
          { status: 400 }
        );
      }
    }
    
    const stmt = db.prepare(`
      UPDATE DailyBalance 
      SET date = COALESCE(?, date),
          websiteId = COALESCE(?, websiteId),
          websiteName = COALESCE(?, websiteName),
          bankId = COALESCE(?, bankId),
          bankName = COALESCE(?, bankName),
          accountNumber = COALESCE(?, accountNumber),
          openingBalance = COALESCE(?, openingBalance),
          closingBalance = COALESCE(?, closingBalance),
          updatedAt = datetime('now')
      WHERE id = ?
    `);
    
    stmt.run(
      date || null,
      websiteId || null,
      websiteName || null,
      bankId || null,
      bankName || null,
      accountNumber || null,
      openingBalance !== undefined ? openingBalance : null,
      closingBalance !== undefined ? closingBalance : null,
      id
    );
    
    // Get updated record
    const getStmt = db.prepare('SELECT * FROM DailyBalance WHERE id = ?');
    const updated = getStmt.get(id);
    
    db.close();
    
    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Daily balance updated successfully'
    });
  } catch (error) {
    console.error('Error updating daily balance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update daily balance' },
      { status: 500 }
    );
  }
}

// DELETE - Delete daily balance by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    
    // Check if record exists
    const existsStmt = db.prepare('SELECT id, date, bankName FROM DailyBalance WHERE id = ?');
    const existing = existsStmt.get(id) as { id: string; date: string; bankName: string } | undefined;
    
    if (!existing) {
      db.close();
      return NextResponse.json(
        { success: false, error: 'Daily balance not found' },
        { status: 404 }
      );
    }
    
    const stmt = db.prepare('DELETE FROM DailyBalance WHERE id = ?');
    stmt.run(id);
    
    db.close();
    
    return NextResponse.json({
      success: true,
      message: `Daily balance for ${existing.date} - ${existing.bankName} deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting daily balance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete daily balance' },
      { status: 500 }
    );
  }
}
