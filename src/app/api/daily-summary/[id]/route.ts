import { NextRequest, NextResponse } from 'next/server';
import { db, dailySummaries } from '@/lib/db';
import { eq, and, ne } from 'drizzle-orm';

// GET single daily summary
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const [summary] = await db
      .select()
      .from(dailySummaries)
      .where(eq(dailySummaries.id, id))
      .limit(1);
    
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
    
    // Check if record exists
    const [existing] = await db
      .select()
      .from(dailySummaries)
      .where(eq(dailySummaries.id, id))
      .limit(1);
    
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Daily summary not found' }, { status: 404 });
    }
    
    // Check for duplicate date + website (excluding current record)
    const [duplicate] = await db
      .select()
      .from(dailySummaries)
      .where(and(
        eq(dailySummaries.date, date),
        eq(dailySummaries.websiteName, website),
        ne(dailySummaries.id, id)
      ))
      .limit(1);
    
    if (duplicate) {
      return NextResponse.json({ 
        success: false, 
        error: 'มีข้อมูลของวันที่และเว็บไซต์นี้อยู่แล้ว' 
      }, { status: 400 });
    }
    
    // Calculate net profit
    const deposit = parseFloat(depositAmount) || 0;
    const withdrawal = parseFloat(withdrawalAmount) || 0;
    const profit = deposit - withdrawal;
    
    const [updated] = await db
      .update(dailySummaries)
      .set({
        date,
        websiteName: website,
        totalDeposit: deposit,
        totalWithdrawal: withdrawal,
        totalProfit: profit,
        updatedAt: new Date(),
      })
      .where(eq(dailySummaries.id, id))
      .returning();
    
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
    
    // Check if record exists
    const [existing] = await db
      .select()
      .from(dailySummaries)
      .where(eq(dailySummaries.id, id))
      .limit(1);
    
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Daily summary not found' }, { status: 404 });
    }
    
    await db.delete(dailySummaries).where(eq(dailySummaries.id, id));
    
    return NextResponse.json({ success: true, message: 'Daily summary deleted successfully' });
  } catch (error) {
    console.error('Error deleting daily summary:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete daily summary' }, { status: 500 });
  }
}
