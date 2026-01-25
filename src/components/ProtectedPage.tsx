'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions, Permissions } from '@/hooks/usePermissions';
import { useTheme } from '@/contexts/ThemeContext';

interface ProtectedPageProps {
  children: ReactNode;
  permission: keyof Permissions;
}

// Map permission to route
const permissionRouteMap: { permission: keyof Permissions; route: string }[] = [
  { permission: 'viewDashboard', route: '/' },
  { permission: 'manageChat', route: '/data-chat' },
  { permission: 'viewReports', route: '/reports' },
  { permission: 'manageData', route: '/data-management' },
  { permission: 'manageUsers', route: '/users' },
  { permission: 'managePermissions', route: '/permissions' },
  { permission: 'manageSettings', route: '/settings' },
];

export default function ProtectedPage({ children, permission }: ProtectedPageProps) {
  const { permissions, isLoading, hasPermission } = usePermissions();
  const router = useRouter();
  const { isDark } = useTheme();

  const colors = {
    textMuted: isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b',
  };

  // Find first accessible route based on user's permissions
  const getFirstAccessibleRoute = (): string => {
    if (!permissions) return '/';
    
    for (const item of permissionRouteMap) {
      if (permissions[item.permission]) {
        return item.route;
      }
    }
    return '/';
  };

  useEffect(() => {
    if (!isLoading && permissions && !hasPermission(permission)) {
      const redirectTo = getFirstAccessibleRoute();
      router.replace(redirectTo);
    }
  }, [isLoading, permissions, permission, hasPermission, router]);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        minHeight: '400px',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid rgba(34, 197, 94, 0.2)',
            borderTopColor: '#22c55e',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ color: colors.textMuted, fontSize: '14px' }}>กำลังตรวจสอบสิทธิ์...</p>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!hasPermission(permission)) {
    // Show loading while redirecting
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        minHeight: '400px',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid rgba(34, 197, 94, 0.2)',
            borderTopColor: '#22c55e',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ color: colors.textMuted, fontSize: '14px' }}>กำลังเปลี่ยนหน้า...</p>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
}