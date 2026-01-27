import { NextRequest, NextResponse } from 'next/server';
import { db, salaries, generateId } from '@/lib/db';
import { eq, desc, asc, and } from 'drizzle-orm';

// GET - List all salaries with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const month = searchParams.get('month');
    const status = searchParams.get('status');
    const websiteId = searchParams.get('websiteId');
    const employeeId = searchParams.get('employeeId');
    
    const conditions = [];
    
    if (month) {
      conditions.push(eq(salaries.month, month));
    }
    
    if (status) {
      conditions.push(eq(salaries.status, status));
    }
    
    if (websiteId) {
      conditions.push(eq(salaries.websiteId, websiteId));
    }
    
    if (employeeId) {
      conditions.push(eq(salaries.employeeId, employeeId));
    }
    
    let data;
    if (conditions.length > 0) {
      data = await db.select()
        .from(salaries)
        .where(and(...conditions))
        .orderBy(desc(salaries.month), asc(salaries.employeeName));
    } else {
      data = await db.select()
        .from(salaries)
        .orderBy(desc(salaries.month), asc(salaries.employeeName));
    }
    
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching salaries:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch salaries' },
      { status: 500 }
    );
  }
}

// POST - Create new salary record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      employeeId, 
      employeeName,
      employeeNickname,
      month, 
      websiteId, 
      websiteName, 
      position, 
      baseSalary, 
      positionAllowance, 
      commission, 
      diligenceAllowance, 
      shiftAllowance,
      overtime,
      bonus,
      status 
    } = body;
    
    // Validate required fields
    if (!employeeId || !month) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: employeeId, month' },
        { status: 400 }
      );
    }
    
    // Calculate total salary
    const totalSalary = (baseSalary || 0) + (positionAllowance || 0) + (commission || 0) + 
                        (diligenceAllowance || 0) + (shiftAllowance || 0) + (overtime || 0) + (bonus || 0);
    
    const id = generateId('sal');
    const now = new Date();
    
    await db.insert(salaries).values({
      id,
      employeeId,
      employeeName: employeeName || '',
      employeeNickname: employeeNickname || '',
      month,
      websiteId: websiteId || null,
      websiteName: websiteName || '',
      position: position || '',
      baseSalary: baseSalary || 0,
      positionAllowance: positionAllowance || 0,
      commission: commission || 0,
      diligenceAllowance: diligenceAllowance || 0,
      shiftAllowance: shiftAllowance || 0,
      overtime: overtime || 0,
      bonus: bonus || 0,
      totalSalary,
      status: status || 'unpaid',
      createdAt: now,
      updatedAt: now
    });
    
    return NextResponse.json({
      success: true,
      data: { id },
      message: 'Salary record created successfully'
    });
  } catch (error) {
    console.error('Error creating salary:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create salary record' },
      { status: 500 }
    );
  }
}

// PUT - Update salary record
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      id,
      employeeId, 
      employeeName,
      employeeNickname,
      month, 
      websiteId, 
      websiteName, 
      position, 
      baseSalary, 
      positionAllowance, 
      commission, 
      diligenceAllowance, 
      shiftAllowance,
      overtime,
      bonus,
      status 
    } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing salary ID' },
        { status: 400 }
      );
    }
    
    // Calculate total salary
    const totalSalary = (baseSalary || 0) + (positionAllowance || 0) + (commission || 0) + 
                        (diligenceAllowance || 0) + (shiftAllowance || 0) + (overtime || 0) + (bonus || 0);
    
    const now = new Date();
    
    await db.update(salaries)
      .set({
        employeeId,
        employeeName: employeeName || '',
        employeeNickname: employeeNickname || '',
        month,
        websiteId: websiteId || null,
        websiteName: websiteName || '',
        position: position || '',
        baseSalary: baseSalary || 0,
        positionAllowance: positionAllowance || 0,
        commission: commission || 0,
        diligenceAllowance: diligenceAllowance || 0,
        shiftAllowance: shiftAllowance || 0,
        overtime: overtime || 0,
        bonus: bonus || 0,
        totalSalary,
        status: status || 'unpaid',
        updatedAt: now
      })
      .where(eq(salaries.id, id));
    
    return NextResponse.json({
      success: true,
      message: 'Salary record updated successfully'
    });
  } catch (error) {
    console.error('Error updating salary:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update salary record' },
      { status: 500 }
    );
  }
}

// DELETE - Delete salary record
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing salary ID' },
        { status: 400 }
      );
    }
    
    await db.delete(salaries).where(eq(salaries.id, id));
    
    return NextResponse.json({
      success: true,
      message: 'Salary record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting salary:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete salary record' },
      { status: 500 }
    );
  }
}
