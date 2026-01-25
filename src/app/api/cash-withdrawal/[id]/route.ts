import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');

function getDb() {
  return new Database(dbPath);
}

// GET single cash withdrawal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const withdrawal = db.prepare('SELECT * FROM CashWithdrawal WHERE id = ?').get(id);
    db.close();
    
    if (!withdrawal) {
      return NextResponse.json({ success: false, error: 'Cash withdrawal not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: withdrawal });
  } catch (error) {
    console.error('Error fetching cash withdrawal:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch cash withdrawal' }, { status: 500 });
  }
}

// PUT update cash withdrawal
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { date, websiteId, websiteName, bankId, bankName, accountNumber, accountName, amount, fee, status } = body;
    
    if (!date || !bankId) {
      return NextResponse.json({ success: false, error: 'Date and bank are required' }, { status: 400 });
    }
    
    const db = getDb();
    
    // Check if record exists
    const existing = db.prepare('SELECT * FROM CashWithdrawal WHERE id = ?').get(id);
    if (!existing) {
      db.close();
      return NextResponse.json({ success: false, error: 'Cash withdrawal not found' }, { status: 404 });
    }
    
    const amountValue = parseFloat(amount) || 0;
    const feeValue = parseFloat(fee) || 0;
    const statusValue = status || 'pending';
    const now = new Date().toISOString();
    
    db.prepare(`
      UPDATE CashWithdrawal 
      SET date = ?, websiteId = ?, websiteName = ?, bankId = ?, bankName = ?, accountNumber = ?, accountName = ?, amount = ?, fee = ?, status = ?, updatedAt = ?
      WHERE id = ?
    `).run(date, websiteId || null, websiteName || null, bankId, bankName, accountNumber, accountName, amountValue, feeValue, statusValue, now, id);
    
    const updated = db.prepare('SELECT * FROM CashWithdrawal WHERE id = ?').get(id);
    db.close();
    
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating cash withdrawal:', error);
    return NextResponse.json({ success: false, error: 'Failed to update cash withdrawal' }, { status: 500 });
  }
}

// DELETE cash withdrawal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    
    // Check if record exists
    const existing = db.prepare('SELECT * FROM CashWithdrawal WHERE id = ?').get(id);
    if (!existing) {
      db.close();
      return NextResponse.json({ success: false, error: 'Cash withdrawal not found' }, { status: 404 });
    }
    
    db.prepare('DELETE FROM CashWithdrawal WHERE id = ?').run(id);
    db.close();
    
    return NextResponse.json({ success: true, message: 'Cash withdrawal deleted successfully' });
  } catch (error) {
    console.error('Error deleting cash withdrawal:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete cash withdrawal' }, { status: 500 });
  }
}
