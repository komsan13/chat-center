import { NextRequest, NextResponse } from 'next/server';
import { db, banks } from '@/lib/db';
import { eq, and, ne } from 'drizzle-orm';

// GET - ดึงข้อมูลธนาคารตาม ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const [bank] = await db
      .select()
      .from(banks)
      .where(eq(banks.id, id))
      .limit(1);

    if (!bank) {
      return NextResponse.json(
        { success: false, error: 'Bank not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: bank,
    });
  } catch (error) {
    console.error('Error fetching bank:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bank' },
      { status: 500 }
    );
  }
}

// PUT - แก้ไขธนาคาร
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { type, bankName, accountName, accountNumber, status } = body;

    // ตรวจสอบว่ามี bank นี้อยู่หรือไม่
    const [existingBank] = await db
      .select()
      .from(banks)
      .where(eq(banks.id, id))
      .limit(1);

    if (!existingBank) {
      return NextResponse.json(
        { success: false, error: 'Bank not found' },
        { status: 404 }
      );
    }

    // ตรวจสอบเลขบัญชีซ้ำ (ยกเว้นตัวเอง)
    if (accountNumber && accountNumber !== existingBank.accountNumber) {
      const [duplicateAccount] = await db
        .select()
        .from(banks)
        .where(and(
          eq(banks.accountNumber, accountNumber),
          ne(banks.id, id)
        ))
        .limit(1);

      if (duplicateAccount) {
        return NextResponse.json(
          { success: false, error: 'Account number already exists' },
          { status: 400 }
        );
      }
    }

    const [updatedBank] = await db
      .update(banks)
      .set({
        type: type || existingBank.type,
        bankName: bankName || existingBank.bankName,
        accountName: accountName || existingBank.accountName,
        accountNumber: accountNumber || existingBank.accountNumber,
        status: status || existingBank.status,
        updatedAt: new Date(),
      })
      .where(eq(banks.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedBank,
      message: 'Bank updated successfully',
    });
  } catch (error) {
    console.error('Error updating bank:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update bank' },
      { status: 500 }
    );
  }
}

// DELETE - ลบธนาคาร
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // ตรวจสอบว่ามี bank นี้อยู่หรือไม่
    const [existingBank] = await db
      .select()
      .from(banks)
      .where(eq(banks.id, id))
      .limit(1);

    if (!existingBank) {
      return NextResponse.json(
        { success: false, error: 'Bank not found' },
        { status: 404 }
      );
    }

    await db.delete(banks).where(eq(banks.id, id));

    return NextResponse.json({
      success: true,
      message: 'Bank deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting bank:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete bank' },
      { status: 500 }
    );
  }
}
