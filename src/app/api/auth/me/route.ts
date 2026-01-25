import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    // Get user's roleId and permissions from database
    const db = new Database(dbPath);
    const user = db.prepare('SELECT roleId FROM User WHERE id = ?').get(session.userId) as { roleId: string | null } | undefined;
    
    let permissions = {
      viewDashboard: false,
      manageUsers: false,
      managePermissions: false,
      viewReports: false,
      manageData: false,
      manageChat: false,
      manageSettings: false,
    };

    if (user?.roleId) {
      const role = db.prepare('SELECT permissions FROM Role WHERE id = ?').get(user.roleId) as { permissions: string } | undefined;
      if (role?.permissions) {
        try {
          permissions = JSON.parse(role.permissions);
        } catch (e) {
          console.error('Error parsing permissions:', e);
        }
      }
    } else if (session.role === 'admin') {
      // Admin without roleId gets full permissions
      permissions = {
        viewDashboard: true,
        manageUsers: true,
        managePermissions: true,
        viewReports: true,
        manageData: true,
        manageChat: true,
        manageSettings: true,
      };
    }

    db.close();
    
    return NextResponse.json({
      authenticated: true,
      user: {
        userId: session.userId,
        email: session.email,
        name: session.name,
        role: session.role,
        permissions,
      },
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
