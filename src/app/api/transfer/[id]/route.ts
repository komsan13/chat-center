import { NextRequest, NextResponse } from 'next/server';
import { db, transfers } from '@/lib/db';
import { eq } from 'drizzle-orm';

// GET single transfer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [transfer] = await db.select().from(transfers).where(eq(transfers.id, id));
    
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
    
    // Check if record exists
    const [existing] = await db.select().from(transfers).where(eq(transfers.id, id));
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Transfer not found' }, { status: 404 });
    }
    
    const amountValue = parseFloat(amount) || 0;
    const statusValue = status || 'pending';
    const now = new Date();
    
    await db.update(transfers)
      .set({
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
        updatedAt: now
      })
      .where(eq(transfers.id, id));
    
    const [updated] = await db.select().from(transfers).where(eq(transfers.id, id));
    
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
    
    const [existing] = await db.select().from(transfers).where(eq(transfers.id, id));
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Transfer not found' }, { status: 404 });
    }
    
    await db.delete(transfers).where(eq(transfers.id, id));
    
    return NextResponse.json({ success: true, message: 'Transfer deleted successfully' });
  } catch (error) {
    console.error('Error deleting transfer:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete transfer' }, { status: 500 });
  }
}
