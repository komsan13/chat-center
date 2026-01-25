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

    const derivePermissions = (raw: Record<string, unknown> | null) => {
      const next = { ...basePermissions };
      if (raw) {
        (Object.keys(basePermissions) as Array<keyof typeof basePermissions>).forEach(key => {
          if (typeof raw[key] === 'boolean') {
            next[key] = raw[key] as boolean;
          }
        });
      }

      const hasAny = (keys: string[]) => keys.some(key => raw && raw[key] === true);

      next.viewReports = next.viewReports || hasAny([
        'viewDailySummary',
        'viewDailyBalance',
        'viewCashWithdrawal',
        'viewTransfer',
        'viewExpenses',
        'viewPayroll',
        'viewSalaries',
        'viewSalaryPayment',
        'manageReports',
      ]);

      next.manageData = next.manageData || hasAny([
        'viewDataManagement',
        'viewWebsites',
        'viewBanks',
        'viewEmployees',
        'viewSalaryBase',
        'viewLineTokens',
      ]);

      next.manageChat = next.manageChat || hasAny(['viewDataChat']);
      next.manageUsers = next.manageUsers || hasAny(['viewUsers']);
      next.managePermissions = next.managePermissions || hasAny(['viewPermissions', 'viewRoles', 'manageRoles']);
      next.manageSettings = next.manageSettings || hasAny(['manageSettings']);

      next.viewDashboard = next.viewDashboard || next.viewReports || next.manageData || next.manageChat || next.manageUsers || next.managePermissions || next.manageSettings || hasAny(['viewFinance', 'manageFinance']);

      return next;
    };

    let permissions = { ...basePermissions };

    if (user?.roleId) {
      const role = db.prepare('SELECT permissions FROM Role WHERE id = ?').get(user.roleId) as { permissions: string } | undefined;
      if (role?.permissions) {
        try {
          const parsed = JSON.parse(role.permissions) as Record<string, unknown>;
          permissions = derivePermissions(parsed);
        } catch (e) {
          console.error('Error parsing permissions:', e);
        }
      }
    } else {
      permissions = derivePermissions(null);
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
          viewDashboard: true,
          manageUsers: false,
          managePermissions: false,
          viewReports: true,
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
