import { NextRequest, NextResponse } from 'next/server';
import { db, transfers, generateId } from '@/lib/db';
import { eq, desc, and } from 'drizzle-orm';

// GET all transfers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFilter = searchParams.get('date');
    const statusFilter = searchParams.get('status');
    const websiteFilter = searchParams.get('websiteId');
    
    const conditions = [];
    
    if (dateFilter) {
      conditions.push(eq(transfers.date, dateFilter));
    }
    
    if (statusFilter && statusFilter !== 'all') {
      conditions.push(eq(transfers.status, statusFilter));
    }
    
    if (websiteFilter && websiteFilter !== 'all') {
      conditions.push(eq(transfers.websiteId, websiteFilter));
    }
    
    let query;
    if (conditions.length > 0) {
      query = await db.select()
        .from(transfers)
        .where(and(...conditions))
        .orderBy(desc(transfers.date), desc(transfers.createdAt));
    } else {
      query = await db.select()
        .from(transfers)
        .orderBy(desc(transfers.date), desc(transfers.createdAt));
    }
    
    return NextResponse.json({ success: true, data: query });
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
    
    const id = generateId('tf');
    const now = new Date();
    
    const amountValue = parseFloat(amount) || 0;
    const statusValue = status || 'pending';
    
    await db.insert(transfers).values({
      id,
      date,
      websiteId: websiteId || null,
      websiteName: websiteName || null,
      fromBankId,
      fromBankName,
      fromAccountNumber: fromAccountNumber || null,
      toBankId,
      toBankName,
      toAccountNumber: toAccountNumber || null,
      amount: amountValue,
      note: note || null,
      status: statusValue,
      createdAt: now,
      updatedAt: now
    });
    
    const [newTransfer] = await db.select().from(transfers).where(eq(transfers.id, id));
    
    return NextResponse.json({ success: true, data: newTransfer });
  } catch (error) {
    console.error('Error creating transfer:', error);
    return NextResponse.json({ success: false, error: 'Failed to create transfer' }, { status: 500 });
  }
}
