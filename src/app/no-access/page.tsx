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
  const [isLoading, setIsLoading] = useState(true);

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

          // No permissions granted, stay on no-access page
          setIsLoading(false);
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
  if (isLoading) {
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
        <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '16px', fontWeight: 600 }}>
          {language === 'th' ? 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้' : 'You do not have access to this page'}
        </p>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px' }}>
          {language === 'th' ? 'กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์' : 'Please contact an administrator to request access'}
        </p>
        <button
          onClick={() => router.replace('/login')}
          style={{
            marginTop: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            background: 'rgba(255, 255, 255, 0.06)',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          {language === 'th' ? 'กลับไปหน้าเข้าสู่ระบบ' : 'Back to login'}
        </button>
      </div>
    </div>
  );
}
