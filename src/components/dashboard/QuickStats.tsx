'use client';

import { ArrowRightLeft, CircleDollarSign, FileSpreadsheet, Globe2, Building } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface QuickStatsProps {
  transfers: { count: number; total: number; formatted: string };
  cashWithdrawals: { count: number; total: number; formatted: string };
  expenses: { count: number; total: number; formatted: string };
  websites: number;
  banks: number;
}

export default function QuickStats({ transfers, cashWithdrawals, expenses, websites, banks }: QuickStatsProps) {
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const colors = {
    cardBg: isDark ? '#23262B' : '#ffffff',
    border: isDark ? '#2A313C' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#1e293b',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b',
    textFaded: isDark ? 'rgba(255, 255, 255, 0.4)' : '#94a3b8',
  };

  const stats = [
    {
      icon: ArrowRightLeft,
      label: t('dashboard.transfers'),
      value: transfers.formatted,
      count: `${transfers.count} ${t('dashboard.transactions')}`,
      color: '#06b6d4',
    },
    {
      icon: CircleDollarSign,
      label: t('dashboard.cashWithdrawals'),
      value: cashWithdrawals.formatted,
      count: `${cashWithdrawals.count} ${t('dashboard.transactions')}`,
      color: '#f97316',
    },
    {
      icon: FileSpreadsheet,
      label: t('dashboard.expenses'),
      value: expenses.formatted,
      count: `${expenses.count} ${t('dashboard.items')}`,
      color: '#ef4444',
    },
    {
      icon: Globe2,
      label: t('dashboard.activeWebsites'),
      value: websites.toString(),
      count: t('dashboard.websites'),
      color: '#22c55e',
    },
    {
      icon: Building,
      label: t('dashboard.activeBanks'),
      value: banks.toString(),
      count: t('dashboard.bankAccounts'),
      color: '#8b5cf6',
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: '16px',
    }}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            style={{
              background: colors.cardBg,
              borderRadius: '12px',
              border: `1px solid ${colors.border}`,
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = stat.color;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.border;
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: `${stat.color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon style={{ width: '20px', height: '20px', color: stat.color }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ 
                fontSize: '11px', 
                color: colors.textFaded, 
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {stat.label}
              </p>
              <p style={{ 
                fontSize: '18px', 
                fontWeight: 700, 
                color: colors.text, 
                margin: 0,
                letterSpacing: '-0.3px',
              }}>
                {stat.value}
              </p>
              <p style={{ 
                fontSize: '11px', 
                color: colors.textMuted, 
                margin: 0,
              }}>
                {stat.count}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
