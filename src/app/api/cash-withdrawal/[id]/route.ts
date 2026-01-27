import { NextRequest, NextResponse } from 'next/server';
import { db, cashWithdrawals } from '@/lib/db';
import { eq } from 'drizzle-orm';

// GET single cash withdrawal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const [withdrawal] = await db
      .select()
      .from(cashWithdrawals)
      .where(eq(cashWithdrawals.id, id))
      .limit(1);
    
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
    const { date, websiteId, websiteName, bankId, bankName, accountNumber, accountName, amount, fee, note, createdBy } = body;
    
    if (!date || !bankId) {
      return NextResponse.json({ success: false, error: 'Date and bank are required' }, { status: 400 });
    }
    
    // Check if record exists
    const [existing] = await db
      .select()
      .from(cashWithdrawals)
      .where(eq(cashWithdrawals.id, id))
      .limit(1);
    
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Cash withdrawal not found' }, { status: 404 });
    }
    
    const amountValue = parseFloat(amount) || 0;
    const feeValue = parseFloat(fee) || 0;
    
    const [updated] = await db
      .update(cashWithdrawals)
      .set({
        date,
        websiteId: websiteId || null,
        websiteName: websiteName || null,
        bankId: bankId || null,
        bankName: bankName || null,
        amount: amountValue,
        fee: feeValue,
        note: note || null,
        createdBy: createdBy || null,
        updatedAt: new Date(),
      })
      .where(eq(cashWithdrawals.id, id))
      .returning();
    
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
    
    // Check if record exists
    const [existing] = await db
      .select()
      .from(cashWithdrawals)
      .where(eq(cashWithdrawals.id, id))
      .limit(1);
    
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Cash withdrawal not found' }, { status: 404 });
    }
    
    await db.delete(cashWithdrawals).where(eq(cashWithdrawals.id, id));
    
    return NextResponse.json({ success: true, message: 'Cash withdrawal deleted successfully' });
  } catch (error) {
    console.error('Error deleting cash withdrawal:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete cash withdrawal' }, { status: 500 });
  }
}
