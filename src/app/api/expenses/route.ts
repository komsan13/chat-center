import { NextRequest, NextResponse } from 'next/server';
import { db, expenses, banks, generateId } from '@/lib/db';
import { eq, and, desc } from 'drizzle-orm';

// GET - List all expenses with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const date = searchParams.get('date');
    const category = searchParams.get('category');
    const websiteId = searchParams.get('websiteId');
    
    // Build query conditions
    const conditions = [];
    
    if (date) {
      conditions.push(eq(expenses.date, date));
    }
    
    if (category) {
      conditions.push(eq(expenses.category, category));
    }
    
    if (websiteId) {
      conditions.push(eq(expenses.websiteId, websiteId));
    }
    
    let expensesData;
    if (conditions.length > 0) {
      expensesData = await db.select()
        .from(expenses)
        .where(and(...conditions))
        .orderBy(desc(expenses.date), desc(expenses.createdAt));
    } else {
      expensesData = await db.select()
        .from(expenses)
        .orderBy(desc(expenses.date), desc(expenses.createdAt));
    }
    
    // Get all banks for lookup
    let banksMap = new Map<string, { type: string; accountName: string }>();
    try {
      const banksList = await db.select({
        id: banks.id,
        type: banks.type,
        accountName: banks.accountName
      }).from(banks);
      banksMap = new Map(banksList.map(b => [b.id, b]));
    } catch {
      // Bank table might not exist, continue without bank info
    }
    
    // Add bank info to each expense
    const data = expensesData.map(expense => {
      // Note: expenses table in Drizzle doesn't have bankId, but keeping compatibility
      return {
        ...expense,
        bankType: null,
        accountName: ''
      };
    });
    
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

// POST - Create new expense
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      date, 
      websiteId, 
      websiteName, 
      category, 
      description, 
      amount, 
      note,
      createdBy
    } = body;
    
    // Validate required fields
    if (!date || !category || amount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: date, category, amount' },
        { status: 400 }
      );
    }
    
    const id = generateId();
    const now = new Date();
    
    await db.insert(expenses).values({
      id,
      date,
      websiteId: websiteId || null,
      websiteName: websiteName || null,
      category,
      description: description || null,
      amount: amount || 0,
      note: note || null,
      createdBy: createdBy || null,
      createdAt: now,
      updatedAt: now,
    });
    
    return NextResponse.json({
      success: true,
      data: { id },
      message: 'Expense created successfully'
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}

// PUT - Update expense
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      id,
      date, 
      websiteId, 
      websiteName, 
      category, 
      description, 
      amount, 
      note,
      createdBy
    } = body;
    
    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing expense ID' },
        { status: 400 }
      );
    }
    
    const result = await db.update(expenses)
      .set({
        date,
        websiteId: websiteId || null,
        websiteName: websiteName || null,
        category,
        description: description || null,
        amount: amount || 0,
        note: note || null,
        createdBy: createdBy || null,
        updatedAt: new Date(),
      })
      .where(eq(expenses.id, id));
    
    // Check if any row was updated (Drizzle returns the result differently)
    const [check] = await db.select().from(expenses).where(eq(expenses.id, id));
    
    if (!check) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Expense updated successfully'
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update expense' },
      { status: 500 }
    );
  }
}

// DELETE - Delete expense
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing expense ID' },
        { status: 400 }
      );
    }
    
    // Check if exists
    const [existing] = await db.select().from(expenses).where(eq(expenses.id, id));
    
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }
    
    await db.delete(expenses).where(eq(expenses.id, id));
    
    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete expense' },
      { status: 500 }
    );
  }
}
