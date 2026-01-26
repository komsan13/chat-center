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
    
    const basePermissions = {
      viewDashboard: false,
      manageUsers: false,
      managePermissions: false,
      viewReports: false,
      manageData: false,
      manageChat: false,
      manageSettings: false,
    };

    // Simply read permissions from database without deriving
    const readPermissions = (raw: Record<string, unknown> | null) => {
      const next = { ...basePermissions };
      if (raw) {
        // Direct mapping from database values
        if (typeof raw['viewDashboard'] === 'boolean') next.viewDashboard = raw['viewDashboard'] as boolean;
        if (typeof raw['manageUsers'] === 'boolean') next.manageUsers = raw['manageUsers'] as boolean;
        if (typeof raw['managePermissions'] === 'boolean') next.managePermissions = raw['managePermissions'] as boolean;
        if (typeof raw['viewReports'] === 'boolean') next.viewReports = raw['viewReports'] as boolean;
        if (typeof raw['manageData'] === 'boolean') next.manageData = raw['manageData'] as boolean;
        if (typeof raw['manageChat'] === 'boolean') next.manageChat = raw['manageChat'] as boolean;
        if (typeof raw['manageSettings'] === 'boolean') next.manageSettings = raw['manageSettings'] as boolean;
      }
      return next;
    };

    let permissions = { ...basePermissions };

    if (user?.roleId) {
      const role = db.prepare('SELECT permissions FROM Role WHERE id = ?').get(user.roleId) as { permissions: string } | undefined;
      if (role?.permissions) {
        try {
          const parsed = JSON.parse(role.permissions) as Record<string, unknown>;
          permissions = readPermissions(parsed);
        } catch (e) {
          console.error('Error parsing permissions:', e);
        }
      }
    } else {
      permissions = readPermissions(null);
    }

    const isEmptyPermissions = Object.values(permissions).every(value => value === false);
    if (isEmptyPermissions) {
      const roleDefaults: Record<string, typeof basePermissions> = {
        admin: {
          viewDashboard: true,
          manageUsers: true,
          managePermissions: true,
          viewReports: true,
          manageData: true,
          manageChat: true,
          manageSettings: true,
        },
        manager: {
          viewDashboard: true,
          manageUsers: false,
          managePermissions: false,
          viewReports: true,
          manageData: true,
          manageChat: true,
          manageSettings: false,
        },
        user: {
          viewDashboard: false,
          manageUsers: false,
          managePermissions: false,
          viewReports: false,
          manageData: false,
          manageChat: true,
          manageSettings: false,
        },
      };

      if (roleDefaults[session.role]) {
        permissions = roleDefaults[session.role];
      }
    }

    if (session.role === 'admin') {
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
