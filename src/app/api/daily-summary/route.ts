import { NextRequest, NextResponse } from 'next/server';
import { db, dailySummaries, generateId } from '@/lib/db';
import { eq, and, desc, asc, or } from 'drizzle-orm';

// GET all daily summaries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFilter = searchParams.get('date');
    const websiteFilter = searchParams.get('website');
    
    let query = db.select().from(dailySummaries);
    
    const conditions = [];
    
    if (dateFilter) {
      conditions.push(eq(dailySummaries.date, dateFilter));
    }
    
    if (websiteFilter && websiteFilter !== 'all') {
      conditions.push(
        or(
          eq(dailySummaries.websiteId, websiteFilter),
          eq(dailySummaries.websiteName, websiteFilter)
        )
      );
    }
    
    const summaries = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(desc(dailySummaries.date), asc(dailySummaries.websiteName))
      : await query.orderBy(desc(dailySummaries.date), asc(dailySummaries.websiteName));
    
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
    
    const finalWebsiteName = websiteName || website || null;
    const finalWebsiteId = websiteId || null;
    
    // Check for duplicate date + website
    if (finalWebsiteName) {
      const duplicate = await db
        .select()
        .from(dailySummaries)
        .where(and(
          eq(dailySummaries.date, date),
          eq(dailySummaries.websiteName, finalWebsiteName)
        ))
        .limit(1);
      
      if (duplicate.length > 0) {
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
    
    const id = `ds_${generateId()}`;
    
    const [newSummary] = await db.insert(dailySummaries).values({
      id,
      date,
      websiteId: finalWebsiteId,
      websiteName: finalWebsiteName,
      totalDeposit: deposit,
      totalWithdrawal: withdrawal,
      totalProfit: profit,
      memberCount: 0,
      newMemberCount: 0,
    }).returning();
    
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
