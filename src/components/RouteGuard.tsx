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

export default function RouteGuard({ children }: RouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { permissions, isLoading } = usePermissions();

  const requiredPermission = useMemo(() => getRequiredPermission(pathname), [pathname]);

  useEffect(() => {
    if (isLoading) return;

    if (requiredPermission && !permissions?.[requiredPermission]) {
      router.replace('/no-access');
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
