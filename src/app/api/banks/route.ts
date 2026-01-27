import { NextRequest, NextResponse } from 'next/server';
import { db, banks, generateId } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';

// GET - ดึงรายการธนาคารทั้งหมด
export async function GET() {
  try {
    const allBanks = await db.select().from(banks).orderBy(desc(banks.createdAt));
    
    return NextResponse.json({
      success: true,
      data: allBanks,
    });
  } catch (error) {
    console.error('Error fetching banks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch banks' },
      { status: 500 }
    );
  }
}

// POST - เพิ่มธนาคารใหม่
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, bankName, accountName, accountNumber, status } = body;

    // Validation
    if (!bankName || !accountName || !accountNumber) {
      return NextResponse.json(
        { success: false, error: 'Bank name, account name and account number are required' },
        { status: 400 }
      );
    }

    // ตรวจสอบเลขบัญชีซ้ำ
    const [existingBank] = await db.select().from(banks).where(eq(banks.accountNumber, accountNumber));

    if (existingBank) {
      return NextResponse.json(
        { success: false, error: 'Account number already exists' },
        { status: 400 }
      );
    }

    // Generate ID
    const id = generateId('bank');
    const now = new Date();
    
    await db.insert(banks).values({
      id,
      type: type || 'deposit',
      bankName,
      accountName,
      accountNumber,
      status: status || 'active',
      createdAt: now,
      updatedAt: now,
    });

    const [bank] = await db.select().from(banks).where(eq(banks.id, id));

    return NextResponse.json({
      success: true,
      data: bank,
      message: 'Bank created successfully',
    });
  } catch (error) {
    console.error('Error creating bank:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create bank' },
      { status: 500 }
    );
  }
}
