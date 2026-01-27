import { NextRequest, NextResponse } from 'next/server';
import { db, cashWithdrawals, generateId } from '@/lib/db';
import { eq, and, desc } from 'drizzle-orm';

// GET all cash withdrawals
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFilter = searchParams.get('date');
    const statusFilter = searchParams.get('status');
    
    const conditions = [];
    
    if (dateFilter) {
      conditions.push(eq(cashWithdrawals.date, dateFilter));
    }
    
    if (statusFilter && statusFilter !== 'all') {
      // Note: cashWithdrawals schema doesn't have status, but keeping for compatibility
    }
    
    const withdrawals = conditions.length > 0
      ? await db
          .select()
          .from(cashWithdrawals)
          .where(and(...conditions))
          .orderBy(desc(cashWithdrawals.date), desc(cashWithdrawals.createdAt))
      : await db
          .select()
          .from(cashWithdrawals)
          .orderBy(desc(cashWithdrawals.date), desc(cashWithdrawals.createdAt));
    
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
    const { date, websiteId, websiteName, bankId, bankName, accountNumber, accountName, amount, fee, note, createdBy } = body;
    
    if (!date || !bankId) {
      return NextResponse.json({ success: false, error: 'Date and bank are required' }, { status: 400 });
    }
    
    const id = `cw_${generateId()}`;
    
    const amountValue = parseFloat(amount) || 0;
    const feeValue = parseFloat(fee) || 0;
    
    const [newWithdrawal] = await db.insert(cashWithdrawals).values({
      id,
      date,
      websiteId: websiteId || null,
      websiteName: websiteName || null,
      bankId: bankId || null,
      bankName: bankName || null,
      amount: amountValue,
      fee: feeValue,
      note: note || null,
      createdBy: createdBy || null,
    }).returning();
    
    return NextResponse.json({ success: true, data: newWithdrawal });
  } catch (error) {
    console.error('Error creating cash withdrawal:', error);
    return NextResponse.json({ success: false, error: 'Failed to create cash withdrawal' }, { status: 500 });
  }
}
