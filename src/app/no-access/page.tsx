'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Permissions {
  viewDashboard: boolean;
  manageUsers: boolean;
  managePermissions: boolean;
  viewReports: boolean;
  manageData: boolean;
  manageChat: boolean;
  manageSettings: boolean;
}

// Map permission to route (in priority order)
const permissionRouteMap: { permission: keyof Permissions; route: string }[] = [
  { permission: 'viewDashboard', route: '/' },
  { permission: 'manageChat', route: '/data-chat' },
  { permission: 'viewReports', route: '/reports' },
  { permission: 'manageData', route: '/data-management' },
  { permission: 'manageUsers', route: '/users' },
  { permission: 'managePermissions', route: '/permissions' },
  { permission: 'manageSettings', route: '/settings' },
];

export default function NoAccessPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<'en' | 'th'>('en');

  useEffect(() => {
    // Get language from localStorage
    const saved = localStorage.getItem('language') as 'en' | 'th';
    if (saved && (saved === 'en' || saved === 'th')) {
      setLanguage(saved);
    }
    
    // Fetch user permissions and redirect to first accessible page
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated && data.user.permissions) {
          const permissions = data.user.permissions as Permissions;
          
          // Find first accessible route
          for (const item of permissionRouteMap) {
            if (permissions[item.permission]) {
              router.replace(item.route);
              return;
            }
          }
          
          // Fallback to data-chat if no permissions match
          router.replace('/data-chat');
        } else {
          // Not authenticated, redirect to login
          router.replace('/login');
        }
      })
      .catch(() => {
        router.replace('/login');
      });
  }, [router]);

  // Show loading while redirecting
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      background: '#1A1D21',
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
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
          {language === 'th' ? 'กำลังเปลี่ยนหน้า...' : 'Redirecting...'}
        </p>
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
