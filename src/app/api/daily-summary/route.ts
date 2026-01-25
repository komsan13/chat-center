import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');

function getDb() {
  const db = new Database(dbPath);
  return db;
}

interface DailySummaryRow {
  id: string;
  date: string;
  websiteId: string | null;
  websiteName: string | null;
  totalDeposit: number;
  totalWithdrawal: number;
  totalProfit: number;
  transactionCount: number;
  createdAt: string;
  updatedAt: string;
}

// GET all daily summaries
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const dateFilter = searchParams.get('date');
    const websiteFilter = searchParams.get('website');
    
    let query = 'SELECT * FROM DailySummary';
    const conditions: string[] = [];
    const params: string[] = [];
    
    if (dateFilter) {
      conditions.push('date = ?');
      params.push(dateFilter);
    }
    
    if (websiteFilter && websiteFilter !== 'all') {
      conditions.push('(websiteId = ? OR websiteName = ?)');
      params.push(websiteFilter, websiteFilter);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY date DESC, websiteName ASC';
    
    const summaries = db.prepare(query).all(...params) as DailySummaryRow[];
    db.close();
    
    // Transform data for frontend compatibility
    const transformedData = summaries.map(s => ({
      ...s,
      website: s.websiteName || s.websiteId || '',
      depositAmount: s.totalDeposit,
      withdrawalAmount: s.totalWithdrawal,
      netProfit: s.totalProfit
    }));

    return NextResponse.json({ success: true, data: transformedData });
  } catch (error) {
    console.error('Error fetching daily summaries:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch daily summaries' }, { status: 500 });
  }
}

// POST create new daily summary
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, website, websiteId, websiteName, depositAmount, withdrawalAmount, totalDeposit, totalWithdrawal } = body;
    
    if (!date) {
      return NextResponse.json({ success: false, error: 'Date is required' }, { status: 400 });
    }
    
    const db = getDb();
    const finalWebsiteName = websiteName || website || null;
    const finalWebsiteId = websiteId || null;
    
    // Check for duplicate date + website
    if (finalWebsiteName) {
      const duplicate = db.prepare('SELECT * FROM DailySummary WHERE date = ? AND websiteName = ?').get(date, finalWebsiteName);
      if (duplicate) {
        db.close();
        return NextResponse.json({ 
          success: false, 
          error: 'มีข้อมูลของวันที่และเว็บไซต์นี้อยู่แล้ว' 
        }, { status: 400 });
      }
    }
    
    // Calculate values
    const deposit = parseFloat(totalDeposit || depositAmount) || 0;
    const withdrawal = parseFloat(totalWithdrawal || withdrawalAmount) || 0;
    const profit = deposit - withdrawal;
    
    const id = `ds_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO DailySummary (id, date, websiteId, websiteName, totalDeposit, totalWithdrawal, totalProfit, transactionCount, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, date, finalWebsiteId, finalWebsiteName, deposit, withdrawal, profit, 0, now, now);
    
    const newSummary = db.prepare('SELECT * FROM DailySummary WHERE id = ?').get(id) as DailySummaryRow;
    db.close();
    
    return NextResponse.json({ 
      success: true, 
      data: {
        ...newSummary,
        website: newSummary.websiteName || newSummary.websiteId || '',
        depositAmount: newSummary.totalDeposit,
        withdrawalAmount: newSummary.totalWithdrawal,
        netProfit: newSummary.totalProfit
      }
    });
  } catch (error) {
    console.error('Error creating daily summary:', error);
    return NextResponse.json({ success: false, error: 'Failed to create daily summary' }, { status: 500 });
  }
}
