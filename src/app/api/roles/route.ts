import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

// Initialize SQLite database
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const db = new Database(dbPath);

interface RoleRow {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: string;
  createdAt: string;
  updatedAt: string;
}

interface UserRow {
  id: string;
  name: string;
  roleId: string;
}

// GET - ดึงรายการ roles ทั้งหมด
export async function GET() {
  try {
    const roles = db.prepare('SELECT * FROM Role ORDER BY createdAt ASC').all() as RoleRow[];
    
    // Get user count for each role
    const rolesWithUserCount = roles.map(role => {
      const userCount = db.prepare('SELECT COUNT(*) as count FROM User WHERE roleId = ?').get(role.id) as { count: number };
      return {
        ...role,
        permissions: JSON.parse(role.permissions || '{}'),
        usersCount: userCount?.count || 0
      };
    });

    return NextResponse.json({
      success: true,
      data: rolesWithUserCount,
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}

// POST - เพิ่ม role ใหม่
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, color, permissions } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Role name is required' },
        { status: 400 }
      );
    }

    // Check if role name already exists
    const existingRole = db.prepare('SELECT id FROM Role WHERE name = ?').get(name);
    if (existingRole) {
      return NextResponse.json(
        { success: false, error: 'Role name already exists' },
        { status: 400 }
      );
    }

    const id = 'role_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const stmt = db.prepare(`
      INSERT INTO Role (id, name, description, color, permissions, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    stmt.run(
      id, 
      name, 
      description || '', 
      color || '#22c55e', 
      JSON.stringify(permissions || {})
    );

    const role = db.prepare('SELECT * FROM Role WHERE id = ?').get(id) as RoleRow;

    return NextResponse.json({
      success: true,
      data: {
        ...role,
        permissions: JSON.parse(role.permissions || '{}'),
        usersCount: 0
      },
      message: 'Role created successfully',
    });
  } catch (error) {
    console.error('Error creating role:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create role' },
      { status: 500 }
    );
  }
}

// PUT - แก้ไข role
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, color, permissions } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Role ID is required' },
        { status: 400 }
      );
    }

    // Check if role exists
    const existingRole = db.prepare('SELECT * FROM Role WHERE id = ?').get(id) as RoleRow;
    if (!existingRole) {
      return NextResponse.json(
        { success: false, error: 'Role not found' },
        { status: 404 }
      );
    }

    // Check if name is taken by another role
    if (name && name !== existingRole.name) {
      const nameTaken = db.prepare('SELECT id FROM Role WHERE name = ? AND id != ?').get(name, id);
      if (nameTaken) {
        return NextResponse.json(
          { success: false, error: 'Role name already exists' },
          { status: 400 }
        );
      }
    }

    const stmt = db.prepare(`
      UPDATE Role 
      SET name = ?, description = ?, color = ?, permissions = ?, updatedAt = datetime('now')
      WHERE id = ?
    `);
    
    stmt.run(
      name || existingRole.name,
      description !== undefined ? description : existingRole.description,
      color || existingRole.color,
      permissions ? JSON.stringify(permissions) : existingRole.permissions,
      id
    );

    const role = db.prepare('SELECT * FROM Role WHERE id = ?').get(id) as RoleRow;
    const userCount = db.prepare('SELECT COUNT(*) as count FROM User WHERE roleId = ?').get(id) as { count: number };

    return NextResponse.json({
      success: true,
      data: {
        ...role,
        permissions: JSON.parse(role.permissions || '{}'),
        usersCount: userCount?.count || 0
      },
      message: 'Role updated successfully',
    });
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update role' },
      { status: 500 }
    );
  }
}

// DELETE - ลบ role
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Role ID is required' },
        { status: 400 }
      );
    }

    // Check if role exists
    const existingRole = db.prepare('SELECT * FROM Role WHERE id = ?').get(id);
    if (!existingRole) {
      return NextResponse.json(
        { success: false, error: 'Role not found' },
        { status: 404 }
      );
    }

    // Check if any users are using this role
    const userCount = db.prepare('SELECT COUNT(*) as count FROM User WHERE roleId = ?').get(id) as { count: number };
    if (userCount.count > 0) {
      return NextResponse.json(
        { success: false, error: `Cannot delete role with ${userCount.count} users assigned` },
        { status: 400 }
      );
    }

    db.prepare('DELETE FROM Role WHERE id = ?').run(id);

    return NextResponse.json({
      success: true,
      message: 'Role deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete role' },
      { status: 500 }
    );
  }
}

// GET users by role
export async function getUsersByRole(roleId: string) {
  const users = db.prepare('SELECT id, name, roleId FROM User WHERE roleId = ?').all(roleId) as UserRow[];
  return users;
}
