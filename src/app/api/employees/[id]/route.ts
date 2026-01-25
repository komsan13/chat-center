import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

// Initialize SQLite database
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const db = new Database(dbPath);

interface EmployeeRow {
  id: string;
  fullName: string;
  position: string;
  websites: string;
  bankName: string;
  accountNumber: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// GET - ดึงข้อมูลพนักงานตาม ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const employee = db.prepare('SELECT * FROM Employee WHERE id = ?').get(id) as EmployeeRow | undefined;

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
        websites: JSON.parse(employee.websites || '[]')
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
    const existingEmployee = db.prepare('SELECT * FROM Employee WHERE id = ?').get(id) as EmployeeRow | undefined;

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

    const stmt = db.prepare(`
      UPDATE Employee 
      SET fullName = ?, position = ?, websites = ?, bankName = ?, accountNumber = ?, status = ?, updatedAt = datetime('now')
      WHERE id = ?
    `);
    
    const existingWebsites = JSON.parse(existingEmployee.websites || '[]');
    
    stmt.run(
      fullName || existingEmployee.fullName,
      position || existingEmployee.position,
      JSON.stringify(websites || existingWebsites),
      bankName || existingEmployee.bankName,
      accountNumber || existingEmployee.accountNumber,
      status || existingEmployee.status,
      id
    );

    const employee = db.prepare('SELECT * FROM Employee WHERE id = ?').get(id) as EmployeeRow;

    return NextResponse.json({
      success: true,
      data: {
        ...employee,
        websites: JSON.parse(employee.websites || '[]')
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
    const existingEmployee = db.prepare('SELECT * FROM Employee WHERE id = ?').get(id) as EmployeeRow | undefined;

    if (!existingEmployee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    db.prepare('DELETE FROM Employee WHERE id = ?').run(id);

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
