'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  LayoutGrid,
  ChevronLeft,
  ChevronDown,
  ClipboardList,
  LogOut,
  CalendarDays,
  CircleDollarSign,
  ArrowRightLeft,
  Landmark,
  FileSpreadsheet,
  BadgeDollarSign,
  FolderCog,
  Globe2,
  Building,
  UserCog,
  ShieldCheck,
  MessagesSquare,
  KeyRound,
  HandCoins,
  UsersRound,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

interface Permissions {
  viewDashboard: boolean;
  manageUsers: boolean;
  managePermissions: boolean;
  viewReports: boolean;
  manageData: boolean;
  manageChat: boolean;
  manageSettings: boolean;
}

interface SubMenuItem {
  nameKey: string;
  href: string;
  icon: React.ElementType;
  permission?: keyof Permissions;
}

interface MenuItem {
  nameKey: string;
  icon: React.ElementType;
  href: string;
  badge?: string | null;
  subItems?: SubMenuItem[];
  permission?: keyof Permissions;
}

const menuItems: MenuItem[] = [
  { nameKey: 'sidebar.dashboard', icon: LayoutGrid, href: '/', badge: null, permission: 'viewDashboard' },
  { 
    nameKey: 'sidebar.dataManagement', 
    icon: FolderCog, 
    href: '/data-management', 
    badge: null,
    permission: 'manageData',
    subItems: [
      { nameKey: 'sidebar.manageWebsites', href: '/data-management/websites', icon: Globe2 },
      { nameKey: 'sidebar.manageBanks', href: '/data-management/banks', icon: Building },
      { nameKey: 'sidebar.manageEmployees', href: '/data-management/employees', icon: UserCog },
      { nameKey: 'sidebar.manageSalaryBase', href: '/data-management/salary-base', icon: HandCoins },
      { nameKey: 'sidebar.manageLineTokens', href: '/data-management/line-tokens', icon: KeyRound },
    ]
  },
  { 
    nameKey: 'sidebar.reports', 
    icon: ClipboardList, 
    href: '/reports', 
    badge: null,
    permission: 'viewReports',
    subItems: [
      { nameKey: 'sidebar.dailySummary', href: '/reports/daily-summary', icon: CalendarDays },
      { nameKey: 'sidebar.cashWithdrawal', href: '/reports/cash-withdrawal', icon: CircleDollarSign },
      { nameKey: 'sidebar.transfer', href: '/reports/transfer', icon: ArrowRightLeft },
      { nameKey: 'sidebar.dailyBalance', href: '/reports/daily-balance', icon: Landmark },
      { nameKey: 'sidebar.expenses', href: '/reports/expenses', icon: FileSpreadsheet },
      { nameKey: 'sidebar.salaries', href: '/reports/salaries', icon: BadgeDollarSign },
    ]
  },
  { nameKey: 'sidebar.dataChat', icon: MessagesSquare, href: '/data-chat', badge: null, permission: 'manageChat' },
  { nameKey: 'sidebar.stickerGenerator', icon: Sparkles, href: '/sticker-generator', badge: 'NEW', permission: 'manageChat' },
  { nameKey: 'sidebar.permissions', icon: ShieldCheck, href: '/permissions', badge: null, permission: 'managePermissions' },
  { nameKey: 'sidebar.manageUsers', icon: UsersRound, href: '/users', badge: null, permission: 'manageUsers' },
];

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const { isDark } = useTheme();

  // Theme colors
  const colors = {
    text: isDark ? '#ffffff' : '#1e293b',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.7)' : '#64748b',
    textFaded: isDark ? 'rgba(255, 255, 255, 0.5)' : '#94a3b8',
    border: isDark ? '#2A313C' : '#e2e8f0',
    hoverBg: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
  };

  // Fetch user permissions
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        if (data.authenticated && data.user?.permissions) {
          setPermissions(data.user.permissions);
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
      }
    };
    fetchPermissions();
  }, []);

  // Filter menu items based on permissions
  const filteredMenuItems = menuItems.filter(item => {
    if (!permissions) return false; // Hide all until permissions loaded
    if (!item.permission) return true; // No permission required
    return permissions[item.permission];
  });

  // Auto-expand menu based on current path
  useEffect(() => {
    filteredMenuItems.forEach(item => {
      if (item.subItems) {
        const isSubActive = item.subItems.some(sub => pathname === sub.href);
        if (isSubActive) {
          setExpandedMenu(item.nameKey);
        }
      }
    });
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const toggleSubmenu = (nameKey: string) => {
    setExpandedMenu(expandedMenu === nameKey ? null : nameKey);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px 12px', position: 'relative', overflow: 'hidden' }}>
      {/* Floating Bubbles Animation */}
      <style>{`
        @keyframes float1 {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); opacity: 0.4; }
          25% { transform: translateY(-20px) translateX(5px) scale(1.1); opacity: 0.6; }
          50% { transform: translateY(-35px) translateX(-5px) scale(0.9); opacity: 0.5; }
          75% { transform: translateY(-15px) translateX(8px) scale(1.05); opacity: 0.45; }
        }
        @keyframes float2 {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); opacity: 0.3; }
          33% { transform: translateY(-25px) translateX(-8px) scale(1.15); opacity: 0.5; }
          66% { transform: translateY(-40px) translateX(6px) scale(0.85); opacity: 0.4; }
        }
        @keyframes float3 {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.35; }
          50% { transform: translateY(-30px) scale(1.2); opacity: 0.55; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.3); opacity: 0.5; }
        }
      `}</style>
      
      {/* Bubble 1 - Large */}
      <div style={{
        position: 'absolute',
        bottom: '20%',
        left: '15%',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, rgba(34, 197, 94, 0.25), rgba(22, 163, 74, 0.1))',
        filter: 'blur(1px)',
        animation: 'float1 8s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      
      {/* Bubble 2 - Medium */}
      <div style={{
        position: 'absolute',
        bottom: '35%',
        right: '20%',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.08))',
        filter: 'blur(1px)',
        animation: 'float2 10s ease-in-out infinite',
        animationDelay: '-2s',
        pointerEvents: 'none',
      }} />
      
      {/* Bubble 3 - Small */}
      <div style={{
        position: 'absolute',
        bottom: '50%',
        left: '30%',
        width: '25px',
        height: '25px',
        borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, rgba(34, 197, 94, 0.3), rgba(22, 163, 74, 0.12))',
        filter: 'blur(0.5px)',
        animation: 'float3 6s ease-in-out infinite',
        animationDelay: '-1s',
        pointerEvents: 'none',
      }} />
      
      {/* Bubble 4 - Tiny */}
      <div style={{
        position: 'absolute',
        bottom: '60%',
        right: '35%',
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, rgba(34, 197, 94, 0.35), rgba(22, 163, 74, 0.15))',
        animation: 'float1 7s ease-in-out infinite',
        animationDelay: '-3s',
        pointerEvents: 'none',
      }} />
      
      {/* Bubble 5 - Extra Small */}
      <div style={{
        position: 'absolute',
        bottom: '75%',
        left: '50%',
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, rgba(34, 197, 94, 0.4), rgba(22, 163, 74, 0.2))',
        animation: 'float2 9s ease-in-out infinite',
        animationDelay: '-4s',
        pointerEvents: 'none',
      }} />
      
      {/* Bubble 6 - Bottom Glow */}
      <div style={{
        position: 'absolute',
        bottom: '5%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, transparent 70%)',
        animation: 'pulse 4s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', marginBottom: '24px', position: 'relative', zIndex: 10 }}>
        <div 
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '14px',
            background: 'linear-gradient(145deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(34, 197, 94, 0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Logo Design - Data Center Icon */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
            {/* Server Stack */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ 
                width: '20px', 
                height: '5px', 
                background: 'rgba(255,255,255,0.95)', 
                borderRadius: '1.5px',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: '2px',
                gap: '1px',
              }}>
                <div style={{ width: '2px', height: '2px', borderRadius: '50%', background: '#22c55e' }} />
                <div style={{ width: '2px', height: '2px', borderRadius: '50%', background: '#22c55e' }} />
              </div>
              <div style={{ 
                width: '20px', 
                height: '5px', 
                background: 'rgba(255,255,255,0.85)', 
                borderRadius: '1.5px',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: '2px',
                gap: '1px',
              }}>
                <div style={{ width: '2px', height: '2px', borderRadius: '50%', background: '#f59e0b' }} />
                <div style={{ width: '2px', height: '2px', borderRadius: '50%', background: '#22c55e' }} />
              </div>
              <div style={{ 
                width: '20px', 
                height: '5px', 
                background: 'rgba(255,255,255,0.75)', 
                borderRadius: '1.5px',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: '2px',
                gap: '1px',
              }}>
                <div style={{ width: '2px', height: '2px', borderRadius: '50%', background: '#22c55e' }} />
                <div style={{ width: '2px', height: '2px', borderRadius: '50%', background: '#22c55e' }} />
              </div>
            </div>
            {/* Connection Lines */}
            <div style={{ 
              width: '12px', 
              height: '1px', 
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)' 
            }} />
          </div>
          {/* Glow Effect */}
          <div style={{
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 50%)',
            pointerEvents: 'none',
          }} />
        </div>
        {!collapsed && (
          <div>
            <h1 style={{ 
              fontSize: '15px', 
              fontWeight: 800, 
              color: colors.text, 
              margin: 0, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              letterSpacing: '-0.02em',
            }}>
              <span style={{ 
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', 
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>DATA</span>
              <span>CENTER</span>
            </h1>
            <p style={{ 
              fontSize: '10px', 
              color: colors.textFaded, 
              margin: '2px 0 0 0',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}>Management System</p>
          </div>
        )}
        {onToggle && (
          <button
            onClick={onToggle}
            style={{
              marginLeft: 'auto',
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: colors.hoverBg,
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: colors.textFaded,
              transition: 'all 0.2s ease',
            }}
          >
            <ChevronLeft style={{ width: '16px', height: '16px', transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }} />
          </button>
        )}
      </div>

      {/* Main Menu */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative', zIndex: 10 }}>
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isExpanded = expandedMenu === item.nameKey;

          return (
            <div key={item.nameKey}>
              {hasSubItems ? (
                <button
                  onClick={() => toggleSubmenu(item.nameKey)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: collapsed ? '12px' : '12px 16px',
                    borderRadius: '12px',
                    border: 'none',
                    background: active || isExpanded ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                    color: active || isExpanded ? '#22c55e' : colors.textMuted,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                  }}
                >
                  <Icon style={{ width: '20px', height: '20px', flexShrink: 0 }} />
                  {!collapsed && (
                    <>
                      <span style={{ flex: 1, textAlign: 'left', fontSize: '14px', fontWeight: 500 }}>{t(item.nameKey)}</span>
                      <ChevronDown style={{ width: '16px', height: '16px', transition: 'transform 0.2s ease', transform: isExpanded ? 'rotate(180deg)' : 'none' }} />
                    </>
                  )}
                </button>
              ) : (
                <Link
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: collapsed ? '12px' : '12px 16px',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    background: active ? 'linear-gradient(90deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.05) 100%)' : 'transparent',
                    color: active ? '#22c55e' : colors.textMuted,
                    transition: 'all 0.2s ease',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    borderLeft: active ? '3px solid #22c55e' : '3px solid transparent',
                  }}
                >
                  <Icon style={{ width: '20px', height: '20px', flexShrink: 0 }} />
                  {!collapsed && (
                    <span style={{ fontSize: '14px', fontWeight: active ? 600 : 500 }}>{t(item.nameKey)}</span>
                  )}
                  {!collapsed && item.badge && (
                    <span style={{
                      marginLeft: 'auto',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                      color: '#ffffff',
                    }}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              )}

              {/* Sub Items */}
              {hasSubItems && isExpanded && !collapsed && (
                <div style={{ marginTop: '4px', marginLeft: '32px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {item.subItems?.map((subItem) => {
                    const SubIcon = subItem.icon;
                    const subActive = pathname === subItem.href;
                    return (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          background: subActive ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                          color: subActive ? '#22c55e' : colors.textFaded,
                          fontSize: '13px',
                          fontWeight: subActive ? 600 : 400,
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <SubIcon style={{ width: '16px', height: '16px' }} />
                        <span>{t(subItem.nameKey)}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Divider */}
      <div style={{ height: '1px', background: colors.border, margin: '16px 0', position: 'relative', zIndex: 10 }} />

      {/* Logout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative', zIndex: 10 }}>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: collapsed ? '12px' : '12px 16px',
            borderRadius: '12px',
            border: 'none',
            background: 'transparent',
            color: colors.textFaded,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            justifyContent: collapsed ? 'center' : 'flex-start',
            width: '100%',
          }}
        >
          <LogOut style={{ width: '20px', height: '20px', flexShrink: 0 }} />
          {!collapsed && <span style={{ fontSize: '14px', fontWeight: 500 }}>{t('sidebar.logout')}</span>}
        </button>
      </div>
    </div>
  );
}
