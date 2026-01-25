import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

// Initialize SQLite database
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const db = new Database(dbPath);

interface BankRow {
  id: string;
  type: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// GET - ดึงข้อมูลธนาคารตาม ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const bank = db.prepare('SELECT * FROM Bank WHERE id = ?').get(id) as BankRow | undefined;

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
    const existingBank = db.prepare('SELECT * FROM Bank WHERE id = ?').get(id) as BankRow | undefined;

    if (!existingBank) {
      return NextResponse.json(
        { success: false, error: 'Bank not found' },
        { status: 404 }
      );
    }

    // ตรวจสอบเลขบัญชีซ้ำ (ยกเว้นตัวเอง)
    if (accountNumber && accountNumber !== existingBank.accountNumber) {
      const duplicateAccount = db.prepare('SELECT * FROM Bank WHERE accountNumber = ? AND id != ?').get(accountNumber, id) as BankRow | undefined;

      if (duplicateAccount) {
        return NextResponse.json(
          { success: false, error: 'Account number already exists' },
          { status: 400 }
        );
      }
    }

    const stmt = db.prepare(`
      UPDATE Bank 
      SET type = ?, bankName = ?, accountName = ?, accountNumber = ?, status = ?, updatedAt = datetime('now')
      WHERE id = ?
    `);
    
    stmt.run(
      type || existingBank.type,
      bankName || existingBank.bankName,
      accountName || existingBank.accountName,
      accountNumber || existingBank.accountNumber,
      status || existingBank.status,
      id
    );

    const bank = db.prepare('SELECT * FROM Bank WHERE id = ?').get(id) as BankRow;

    return NextResponse.json({
      success: true,
      data: bank,
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
    const existingBank = db.prepare('SELECT * FROM Bank WHERE id = ?').get(id) as BankRow | undefined;

    if (!existingBank) {
      return NextResponse.json(
        { success: false, error: 'Bank not found' },
        { status: 404 }
      );
    }

    db.prepare('DELETE FROM Bank WHERE id = ?').run(id);

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
