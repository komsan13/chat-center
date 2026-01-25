import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';

// Database connection
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');

function getDb() {
  const db = new Database(dbPath);
  
  // Create Salaries table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS Salaries (
      id TEXT PRIMARY KEY,
      employeeId TEXT NOT NULL,
      employeeName TEXT,
      employeeNickname TEXT,
      month TEXT NOT NULL,
      websiteId TEXT,
      websiteName TEXT,
      position TEXT,
      baseSalary REAL NOT NULL DEFAULT 0,
      positionAllowance REAL DEFAULT 0,
      commission REAL DEFAULT 0,
      diligenceAllowance REAL DEFAULT 0,
      shiftAllowance REAL DEFAULT 0,
      overtime REAL DEFAULT 0,
      bonus REAL DEFAULT 0,
      totalSalary REAL DEFAULT 0,
      status TEXT DEFAULT 'unpaid',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  return db;
}

// GET - List all salaries with optional filters
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    
    const month = searchParams.get('month');
    const status = searchParams.get('status');
    const websiteId = searchParams.get('websiteId');
    const employeeId = searchParams.get('employeeId');
    
    let query = 'SELECT * FROM Salaries WHERE 1=1';
    const params: string[] = [];
    
    if (month) {
      query += ' AND month = ?';
      params.push(month);
    }
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    if (websiteId) {
      query += ' AND websiteId = ?';
      params.push(websiteId);
    }
    
    if (employeeId) {
      query += ' AND employeeId = ?';
      params.push(employeeId);
    }
    
    query += ' ORDER BY month DESC, employeeName ASC';
    
    const stmt = db.prepare(query);
    const data = stmt.all(...params);
    
    db.close();
    
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
    const db = getDb();
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
      db.close();
      return NextResponse.json(
        { success: false, error: 'Missing required fields: employeeId, month' },
        { status: 400 }
      );
    }
    
    // Calculate total salary
    const totalSalary = (baseSalary || 0) + (positionAllowance || 0) + (commission || 0) + 
                        (diligenceAllowance || 0) + (shiftAllowance || 0) + (overtime || 0) + (bonus || 0);
    
    const id = randomUUID();
    
    const insertStmt = db.prepare(`
      INSERT INTO Salaries (
        id, employeeId, employeeName, employeeNickname, month, websiteId, websiteName, position,
        baseSalary, positionAllowance, commission, diligenceAllowance, shiftAllowance,
        overtime, bonus, totalSalary, status, createdAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    insertStmt.run(
      id,
      employeeId,
      employeeName || '',
      employeeNickname || '',
      month,
      websiteId || null,
      websiteName || '',
      position || '',
      baseSalary || 0,
      positionAllowance || 0,
      commission || 0,
      diligenceAllowance || 0,
      shiftAllowance || 0,
      overtime || 0,
      bonus || 0,
      totalSalary,
      status || 'unpaid'
    );
    
    db.close();
    
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
    const db = getDb();
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
      db.close();
      return NextResponse.json(
        { success: false, error: 'Missing salary ID' },
        { status: 400 }
      );
    }
    
    // Calculate total salary
    const totalSalary = (baseSalary || 0) + (positionAllowance || 0) + (commission || 0) + 
                        (diligenceAllowance || 0) + (shiftAllowance || 0) + (overtime || 0) + (bonus || 0);
    
    const updateStmt = db.prepare(`
      UPDATE Salaries SET
        employeeId = ?,
        employeeName = ?,
        employeeNickname = ?,
        month = ?,
        websiteId = ?,
        websiteName = ?,
        position = ?,
        baseSalary = ?,
        positionAllowance = ?,
        commission = ?,
        diligenceAllowance = ?,
        shiftAllowance = ?,
        overtime = ?,
        bonus = ?,
        totalSalary = ?,
        status = ?,
        updatedAt = datetime('now')
      WHERE id = ?
    `);
    
    updateStmt.run(
      employeeId,
      employeeName || '',
      employeeNickname || '',
      month,
      websiteId || null,
      websiteName || '',
      position || '',
      baseSalary || 0,
      positionAllowance || 0,
      commission || 0,
      diligenceAllowance || 0,
      shiftAllowance || 0,
      overtime || 0,
      bonus || 0,
      totalSalary,
      status || 'unpaid',
      id
    );
    
    db.close();
    
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
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      db.close();
      return NextResponse.json(
        { success: false, error: 'Missing salary ID' },
        { status: 400 }
      );
    }
    
    const deleteStmt = db.prepare('DELETE FROM Salaries WHERE id = ?');
    deleteStmt.run(id);
    
    db.close();
    
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
