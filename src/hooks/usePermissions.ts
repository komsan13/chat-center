'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface Permissions {
  viewDashboard: boolean;
  manageUsers: boolean;
  managePermissions: boolean;
  viewReports: boolean;
  manageData: boolean;
  manageChat: boolean;
  manageSettings: boolean;
}

interface User {
  userId: string;
  email: string;
  name: string;
  role: string;
  permissions: Permissions;
}

interface UsePermissionsReturn {
  user: User | null;
  permissions: Permissions | null;
  isLoading: boolean;
  hasPermission: (permission: keyof Permissions) => boolean;
  checkAndRedirect: (permission: keyof Permissions, redirectTo?: string) => boolean;
}

export function usePermissions(): UsePermissionsReturn {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        
        if (data.authenticated && data.user) {
          setUser(data.user);
          setPermissions(data.user.permissions || null);
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  const hasPermission = useCallback((permission: keyof Permissions): boolean => {
    if (!permissions) return false;
    return permissions[permission] === true;
  }, [permissions]);

  const checkAndRedirect = useCallback((permission: keyof Permissions, redirectTo: string = '/'): boolean => {
    if (isLoading) return true; // Still loading, don't redirect yet
    if (!permissions) return false;
    
    if (!permissions[permission]) {
      router.push(redirectTo);
      return false;
    }
    return true;
  }, [permissions, isLoading, router]);

  return {
    user,
    permissions,
    isLoading,
    hasPermission,
    checkAndRedirect,
  };
}
