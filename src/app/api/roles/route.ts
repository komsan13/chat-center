import { NextRequest, NextResponse } from 'next/server';
import { db, roles, users, generateId } from '@/lib/db';
import { eq, asc, ne, count } from 'drizzle-orm';

// GET - ดึงรายการ roles ทั้งหมด
export async function GET() {
  try {
    const allRoles = await db
      .select()
      .from(roles)
      .orderBy(asc(roles.createdAt));
    
    // Get user count for each role
    const rolesWithUserCount = await Promise.all(
      allRoles.map(async (role) => {
        const [userCount] = await db
          .select({ count: count() })
          .from(users)
          .where(eq(users.roleId, role.id));
        
        return {
          ...role,
          permissions: typeof role.permissions === 'string' 
            ? JSON.parse(role.permissions || '{}') 
            : role.permissions || {},
          usersCount: userCount?.count || 0
        };
      })
    );

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
    const existingRole = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, name))
      .limit(1);
      
    if (existingRole.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Role name already exists' },
        { status: 400 }
      );
    }

    // Insert - let schema handle id and timestamps
    const [role] = await db.insert(roles).values({
      name,
      description: description || '',
      color: color || '#22c55e',
      permissions: JSON.stringify(permissions || {}),
    }).returning();

    return NextResponse.json({
      success: true,
      data: {
        ...role,
        permissions: typeof role.permissions === 'string' 
          ? JSON.parse(role.permissions || '{}') 
          : role.permissions || {},
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
    const [existingRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, id));
      
    if (!existingRole) {
      return NextResponse.json(
        { success: false, error: 'Role not found' },
        { status: 404 }
      );
    }

    // Check if name is taken by another role
    if (name && name !== existingRole.name) {
      const nameTaken = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.name, name))
        .limit(1);
        
      if (nameTaken.length > 0 && nameTaken[0].id !== id) {
        return NextResponse.json(
          { success: false, error: 'Role name already exists' },
          { status: 400 }
        );
      }
    }

    const existingPermissions = typeof existingRole.permissions === 'string' 
      ? existingRole.permissions 
      : JSON.stringify(existingRole.permissions || {});
    
    await db
      .update(roles)
      .set({
        name: name || existingRole.name,
        description: description !== undefined ? description : existingRole.description,
        color: color || existingRole.color,
        permissions: permissions ? JSON.stringify(permissions) : existingPermissions,
        updatedAt: new Date(),
      })
      .where(eq(roles.id, id));

    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, id));
      
    const [userCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.roleId, id));

    return NextResponse.json({
      success: true,
      data: {
        ...role,
        permissions: typeof role.permissions === 'string' 
          ? JSON.parse(role.permissions || '{}') 
          : role.permissions || {},
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
    const [existingRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, id));
      
    if (!existingRole) {
      return NextResponse.json(
        { success: false, error: 'Role not found' },
        { status: 404 }
      );
    }

    // Check if any users are using this role
    const [userCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.roleId, id));
      
    if (userCount.count > 0) {
      return NextResponse.json(
        { success: false, error: `Cannot delete role with ${userCount.count} users assigned` },
        { status: 400 }
      );
    }

    await db.delete(roles).where(eq(roles.id, id));

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
