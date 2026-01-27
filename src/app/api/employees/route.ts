import { NextRequest, NextResponse } from 'next/server';
import { db, employees } from '@/lib/db';
import { eq, desc, and, ne } from 'drizzle-orm';

// GET - ดึงรายการพนักงานทั้งหมด
export async function GET() {
  try {
    const result = await db
      .select()
      .from(employees)
      .orderBy(desc(employees.createdAt));
    
    // Parse websites JSON
    const parsed = result.map(emp => ({
      ...emp,
      websites: JSON.parse(emp.websites || '[]')
    }));

    return NextResponse.json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

// POST - เพิ่มพนักงานใหม่
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, position, websites, bankName, accountNumber, status } = body;

    // Validation
    if (!fullName || !bankName || !accountNumber) {
      return NextResponse.json(
        { success: false, error: 'Full name, bank name and account number are required' },
        { status: 400 }
      );
    }

    if (!position) {
      return NextResponse.json(
        { success: false, error: 'Position is required' },
        { status: 400 }
      );
    }

    if (!websites || !Array.isArray(websites) || websites.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one website must be selected' },
        { status: 400 }
      );
    }

    // Check for duplicate account number
    const [existing] = await db
      .select()
      .from(employees)
      .where(eq(employees.accountNumber, accountNumber))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Account number already exists' },
        { status: 400 }
      );
    }

    // Insert - let schema handle id and timestamps via $defaultFn and defaultNow()
    const [employee] = await db.insert(employees).values({
      fullName,
      position,
      websites: JSON.stringify(websites),
      bankName,
      accountNumber,
      status: status || 'active',
    }).returning();

    return NextResponse.json({
      success: true,
      data: {
        ...employee,
        websites: JSON.parse(employee.websites || '[]')
      },
      message: 'Employee created successfully',
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}
