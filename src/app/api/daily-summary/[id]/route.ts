import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');

function getDb() {
  return new Database(dbPath);
}

// GET single daily summary
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const summary = db.prepare('SELECT * FROM DailySummary WHERE id = ?').get(id);
    db.close();
    
    if (!summary) {
      return NextResponse.json({ success: false, error: 'Daily summary not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error fetching daily summary:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch daily summary' }, { status: 500 });
  }
}

// PUT update daily summary
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { date, website, depositAmount, withdrawalAmount } = body;
    
    if (!date || !website) {
      return NextResponse.json({ success: false, error: 'Date and website are required' }, { status: 400 });
    }
    
    const db = getDb();
    
    // Check if record exists
    const existing = db.prepare('SELECT * FROM DailySummary WHERE id = ?').get(id);
    if (!existing) {
      db.close();
      return NextResponse.json({ success: false, error: 'Daily summary not found' }, { status: 404 });
    }
    
    // Check for duplicate date + website (excluding current record)
    const duplicate = db.prepare('SELECT * FROM DailySummary WHERE date = ? AND websiteName = ? AND id != ?').get(date, website, id);
    if (duplicate) {
      db.close();
      return NextResponse.json({ 
        success: false, 
        error: 'มีข้อมูลของวันที่และเว็บไซต์นี้อยู่แล้ว' 
      }, { status: 400 });
    }
    
    // Calculate net profit
    const deposit = parseFloat(depositAmount) || 0;
    const withdrawal = parseFloat(withdrawalAmount) || 0;
    const profit = deposit - withdrawal;
    
    const now = new Date().toISOString();
    
    db.prepare(`
      UPDATE DailySummary 
      SET date = ?, websiteName = ?, totalDeposit = ?, totalWithdrawal = ?, totalProfit = ?, updatedAt = ?
      WHERE id = ?
    `).run(date, website, deposit, withdrawal, profit, now, id);
    
    const updated = db.prepare('SELECT * FROM DailySummary WHERE id = ?').get(id) as any;
    db.close();
    
    // Transform data for frontend compatibility
    return NextResponse.json({ 
      success: true, 
      data: {
        ...updated,
        website: updated.websiteName || updated.websiteId || '',
        depositAmount: updated.totalDeposit,
        withdrawalAmount: updated.totalWithdrawal,
        netProfit: updated.totalProfit
      }
    });
  } catch (error) {
    console.error('Error updating daily summary:', error);
    return NextResponse.json({ success: false, error: 'Failed to update daily summary' }, { status: 500 });
  }
}

// DELETE daily summary
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    
    // Check if record exists
    const existing = db.prepare('SELECT * FROM DailySummary WHERE id = ?').get(id);
    if (!existing) {
      db.close();
      return NextResponse.json({ success: false, error: 'Daily summary not found' }, { status: 404 });
    }
    
    db.prepare('DELETE FROM DailySummary WHERE id = ?').run(id);
    db.close();
    
    return NextResponse.json({ success: true, message: 'Daily summary deleted successfully' });
  } catch (error) {
    console.error('Error deleting daily summary:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete daily summary' }, { status: 500 });
  }
}
