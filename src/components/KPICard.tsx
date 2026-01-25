'use client';

import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface KPICardProps {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: LucideIcon;
  iconColor: 'primary' | 'success' | 'warning' | 'error' | 'info';
  index?: number;
}

const colorMap = {
  primary: { bg: '#22c55e', light: 'rgba(34, 197, 94, 0.15)' },
  success: { bg: '#10b981', light: 'rgba(16, 185, 129, 0.15)' },
  warning: { bg: '#f59e0b', light: 'rgba(245, 158, 11, 0.15)' },
  error: { bg: '#ef4444', light: 'rgba(239, 68, 68, 0.15)' },
  info: { bg: '#3b82f6', light: 'rgba(59, 130, 246, 0.15)' },
};

export default function KPICard({ title, value, change, changeLabel, icon: Icon, iconColor }: KPICardProps) {
  const { isDark } = useTheme();
  const isPositive = change >= 0;
  const iconColors = colorMap[iconColor];

  // Theme-aware colors
  const themeColors = {
    cardBg: isDark ? '#23262B' : '#ffffff',
    border: isDark ? '#2A313C' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#1e293b',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b',
    textFaded: isDark ? 'rgba(255, 255, 255, 0.5)' : '#94a3b8',
  };

  return (
    <div 
      style={{
        background: themeColors.cardBg,
        borderRadius: '16px',
        padding: '20px',
        border: `1px solid ${themeColors.border}`,
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.3)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = isDark ? '0 8px 25px rgba(0, 0, 0, 0.2)' : '0 8px 25px rgba(0, 0, 0, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = themeColors.border;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.1)';
      }}
    >
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div 
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: iconColors.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 12px ${iconColors.light}`,
          }}
        >
          <Icon style={{ width: '24px', height: '24px', color: '#ffffff' }} />
        </div>
        
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 10px',
            borderRadius: '8px',
            background: isPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: isPositive ? '#10b981' : '#ef4444',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {isPositive ? (
            <TrendingUp style={{ width: '14px', height: '14px' }} />
          ) : (
            <TrendingDown style={{ width: '14px', height: '14px' }} />
          )}
          <span>{isPositive ? '+' : ''}{change}%</span>
        </div>
      </div>

      {/* Title */}
      <p style={{ 
        fontSize: '13px', 
        fontWeight: 500, 
        color: themeColors.textMuted, 
        marginBottom: '8px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        {title}
      </p>

      {/* Value */}
      <p style={{ 
        fontSize: '28px', 
        fontWeight: 700, 
        color: themeColors.text,
        marginBottom: '12px',
        lineHeight: 1.2,
      }}>
        {value}
      </p>

      {/* Footer */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px',
        paddingTop: '12px',
        borderTop: `1px solid ${themeColors.border}`,
      }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isPositive ? '#10b981' : '#ef4444' }} />
        <span style={{ fontSize: '12px', color: themeColors.textFaded }}>{changeLabel}</span>
      </div>
    </div>
  );
}
