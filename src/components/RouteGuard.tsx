'use client';

import { ReactNode, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { usePermissions, Permissions } from '@/hooks/usePermissions';

interface RouteGuardProps {
  children: ReactNode;
}

const getRequiredPermission = (pathname: string): keyof Permissions | null => {
  if (pathname === '/') return 'viewDashboard';
  if (pathname.startsWith('/data-management')) return 'manageData';
  if (pathname.startsWith('/reports')) return 'viewReports';
  if (pathname.startsWith('/data-chat')) return 'manageChat';
  if (pathname.startsWith('/permissions')) return 'managePermissions';
  if (pathname.startsWith('/users')) return 'manageUsers';
  if (pathname.startsWith('/settings')) return 'manageSettings';
  if (pathname.startsWith('/finance')) return 'viewReports';
  return null;
};

const permissionRouteMap: { permission: keyof Permissions; route: string }[] = [
  { permission: 'viewDashboard', route: '/' },
  { permission: 'manageChat', route: '/data-chat' },
  { permission: 'viewReports', route: '/reports/daily-summary' },
  { permission: 'manageData', route: '/data-management/websites' },
  { permission: 'manageUsers', route: '/users' },
  { permission: 'managePermissions', route: '/permissions' },
  { permission: 'manageSettings', route: '/settings' },
];

export default function RouteGuard({ children }: RouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { permissions, isLoading } = usePermissions();

  const requiredPermission = useMemo(() => getRequiredPermission(pathname), [pathname]);

  useEffect(() => {
    if (isLoading) return;

    if (requiredPermission && !permissions?.[requiredPermission]) {
      const firstAllowed = permissionRouteMap.find(item => permissions?.[item.permission])?.route;
      if (firstAllowed) {
        router.replace(firstAllowed);
      } else {
        router.replace('/no-access');
      }
    }
  }, [isLoading, permissions, requiredPermission, router]);

  if (isLoading) {
    return null;
  }

  if (requiredPermission && !permissions?.[requiredPermission]) {
    return null;
  }

  return <>{children}</>;
}
