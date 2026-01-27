import { NextRequest, NextResponse } from 'next/server';
import { db, dailyBalances, generateId } from '@/lib/db';
import { eq, and, desc, asc } from 'drizzle-orm';

// GET - List all daily balances with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const date = searchParams.get('date');
    const bankId = searchParams.get('bankId');
    
    // Build query conditions
    const conditions = [];
    
    if (date) {
      conditions.push(eq(dailyBalances.date, date));
    }
    
    if (bankId) {
      conditions.push(eq(dailyBalances.bankId, bankId));
    }
    
    let data;
    if (conditions.length > 0) {
      data = await db.select()
        .from(dailyBalances)
        .where(and(...conditions))
        .orderBy(desc(dailyBalances.date), asc(dailyBalances.bankName));
    } else {
      data = await db.select()
        .from(dailyBalances)
        .orderBy(desc(dailyBalances.date), asc(dailyBalances.bankName));
    }
    
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching daily balances:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch daily balances' },
      { status: 500 }
    );
  }
}

// POST - Create new daily balance(s) - support multiple items
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Support both single item and array of items
    const items = Array.isArray(body) ? body : [body];
    const results: { id: string; date: string; bankName: string }[] = [];
    const errors: { date: string; bankName: string; error: string }[] = [];
    
    for (const item of items) {
      const { date, bankId, bankName, openingBalance, closingBalance, deposits, withdrawals, note } = item;
      
      // Validate required fields
      if (!date || !bankId || !bankName) {
        errors.push({
          date: date || 'N/A',
          bankName: bankName || 'N/A',
          error: 'Missing required fields: date, bankId, bankName'
        });
        continue;
      }
      
      // Check for duplicate (same date + bankId)
      const [existing] = await db.select()
        .from(dailyBalances)
        .where(and(
          eq(dailyBalances.date, date),
          eq(dailyBalances.bankId, bankId)
        ));
      
      if (existing) {
        errors.push({
          date,
          bankName,
          error: `Record already exists for date ${date} and bank ${bankName}`
        });
        continue;
      }
      
      try {
        const id = generateId();
        const now = new Date();
        
        await db.insert(dailyBalances).values({
          id,
          date,
          bankId,
          bankName,
          openingBalance: openingBalance || 0,
          closingBalance: closingBalance || 0,
          deposits: deposits || 0,
          withdrawals: withdrawals || 0,
          note: note || null,
          createdAt: now,
          updatedAt: now,
        });
        
        results.push({ id, date, bankName });
      } catch (err) {
        errors.push({
          date,
          bankName,
          error: err instanceof Error ? err.message : 'Insert failed'
        });
      }
    }
    
    if (errors.length > 0 && results.length === 0) {
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: results,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully created ${results.length} record(s)${errors.length > 0 ? `, ${errors.length} failed` : ''}`
    });
  } catch (error) {
    console.error('Error creating daily balance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create daily balance' },
      { status: 500 }
    );
  }
}
