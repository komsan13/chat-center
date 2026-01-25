import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');

function getDb() {
  return new Database(dbPath);
}

// GET single transfer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const transfer = db.prepare('SELECT * FROM Transfer WHERE id = ?').get(id);
    db.close();
    
    if (!transfer) {
      return NextResponse.json({ success: false, error: 'Transfer not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: transfer });
  } catch (error) {
    console.error('Error fetching transfer:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch transfer' }, { status: 500 });
  }
}

// PUT update transfer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    
    // Check if record exists
    const existing = db.prepare('SELECT * FROM Transfer WHERE id = ?').get(id);
    if (!existing) {
      db.close();
      return NextResponse.json({ success: false, error: 'Transfer not found' }, { status: 404 });
    }
    
    const amountValue = parseFloat(amount) || 0;
    const statusValue = status || 'pending';
    const now = new Date().toISOString();
    
    db.prepare(`
      UPDATE Transfer 
      SET date = ?, websiteId = ?, websiteName = ?, fromBankId = ?, fromBankName = ?, fromAccountNumber = ?, toBankId = ?, toBankName = ?, toAccountNumber = ?, amount = ?, note = ?, status = ?, updatedAt = ?
      WHERE id = ?
    `).run(date, websiteId || null, websiteName || null, fromBankId, fromBankName, fromAccountNumber || null, toBankId, toBankName, toAccountNumber || null, amountValue, note || null, statusValue, now, id);
    
    const updated = db.prepare('SELECT * FROM Transfer WHERE id = ?').get(id);
    db.close();
    
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating transfer:', error);
    return NextResponse.json({ success: false, error: 'Failed to update transfer' }, { status: 500 });
  }
}

// DELETE transfer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    
    const existing = db.prepare('SELECT * FROM Transfer WHERE id = ?').get(id);
    if (!existing) {
      db.close();
      return NextResponse.json({ success: false, error: 'Transfer not found' }, { status: 404 });
    }
    
    db.prepare('DELETE FROM Transfer WHERE id = ?').run(id);
    db.close();
    
    return NextResponse.json({ success: true, message: 'Transfer deleted successfully' });
  } catch (error) {
    console.error('Error deleting transfer:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete transfer' }, { status: 500 });
  }
}
