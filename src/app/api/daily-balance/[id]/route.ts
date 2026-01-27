import { NextRequest, NextResponse } from 'next/server';
import { db, dailyBalances } from '@/lib/db';
import { eq, and, ne } from 'drizzle-orm';

// GET - Get single daily balance by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const [data] = await db.select().from(dailyBalances).where(eq(dailyBalances.id, id));
    
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
    const body = await request.json();
    
    const { date, bankId, bankName, openingBalance, closingBalance, deposits, withdrawals, note } = body;
    
    // Check if record exists
    const [existing] = await db.select().from(dailyBalances).where(eq(dailyBalances.id, id));
    
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Daily balance not found' },
        { status: 404 }
      );
    }
    
    // Check for duplicate (same date + bankId, but different id)
    if (date && bankId) {
      const [duplicate] = await db.select()
        .from(dailyBalances)
        .where(and(
          eq(dailyBalances.date, date),
          eq(dailyBalances.bankId, bankId),
          ne(dailyBalances.id, id)
        ));
      
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: `Record already exists for date ${date} and bank ${bankName}` },
          { status: 400 }
        );
      }
    }
    
    const [updated] = await db.update(dailyBalances)
      .set({
        date: date ?? existing.date,
        bankId: bankId ?? existing.bankId,
        bankName: bankName ?? existing.bankName,
        openingBalance: openingBalance !== undefined ? openingBalance : existing.openingBalance,
        closingBalance: closingBalance !== undefined ? closingBalance : existing.closingBalance,
        deposits: deposits !== undefined ? deposits : existing.deposits,
        withdrawals: withdrawals !== undefined ? withdrawals : existing.withdrawals,
        note: note !== undefined ? note : existing.note,
        updatedAt: new Date(),
      })
      .where(eq(dailyBalances.id, id))
      .returning();
    
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
    
    // Check if record exists
    const [existing] = await db.select().from(dailyBalances).where(eq(dailyBalances.id, id));
    
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Daily balance not found' },
        { status: 404 }
      );
    }
    
    await db.delete(dailyBalances).where(eq(dailyBalances.id, id));
    
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
