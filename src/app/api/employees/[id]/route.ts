import { NextRequest, NextResponse } from 'next/server';
import { db, employees } from '@/lib/db';
import { eq } from 'drizzle-orm';

// GET - ดึงข้อมูลพนักงานตาม ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...employee,
        websites: typeof employee.websites === 'string' 
          ? JSON.parse(employee.websites || '[]') 
          : employee.websites || []
      },
    });
  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employee' },
      { status: 500 }
    );
  }
}

// PUT - แก้ไขพนักงาน
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { fullName, position, websites, bankName, accountNumber, status } = body;

    // ตรวจสอบว่ามี employee นี้อยู่หรือไม่
    const [existingEmployee] = await db.select().from(employees).where(eq(employees.id, id));

    if (!existingEmployee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Validation for websites
    if (websites && (!Array.isArray(websites) || websites.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'At least one website must be selected' },
        { status: 400 }
      );
    }

    const existingWebsites = typeof existingEmployee.websites === 'string' 
      ? JSON.parse(existingEmployee.websites || '[]') 
      : existingEmployee.websites || [];

    await db.update(employees)
      .set({
        fullName: fullName || existingEmployee.fullName,
        position: position || existingEmployee.position,
        websites: JSON.stringify(websites || existingWebsites),
        bankName: bankName || existingEmployee.bankName,
        accountNumber: accountNumber || existingEmployee.accountNumber,
        status: status || existingEmployee.status,
        updatedAt: new Date()
      })
      .where(eq(employees.id, id));

    const [employee] = await db.select().from(employees).where(eq(employees.id, id));

    return NextResponse.json({
      success: true,
      data: {
        ...employee,
        websites: typeof employee.websites === 'string' 
          ? JSON.parse(employee.websites || '[]') 
          : employee.websites || []
      },
      message: 'Employee updated successfully',
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update employee' },
      { status: 500 }
    );
  }
}

// DELETE - ลบพนักงาน
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // ตรวจสอบว่ามี employee นี้อยู่หรือไม่
    const [existingEmployee] = await db.select().from(employees).where(eq(employees.id, id));

    if (!existingEmployee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    await db.delete(employees).where(eq(employees.id, id));

    return NextResponse.json({
      success: true,
      message: 'Employee deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete employee' },
      { status: 500 }
    );
  }
}
