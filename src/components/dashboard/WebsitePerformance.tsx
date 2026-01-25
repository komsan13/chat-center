'use client';

import { Globe2, TrendingUp, TrendingDown } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface WebsiteData {
  name: string;
  deposits: number;
  withdrawals: number;
  profit: number;
}

interface WebsitePerformanceProps {
  data: WebsiteData[];
}

export default function WebsitePerformance({ data }: WebsitePerformanceProps) {
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const colors = {
    cardBg: isDark ? '#23262B' : '#ffffff',
    border: isDark ? '#2A313C' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#1e293b',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b',
    textFaded: isDark ? 'rgba(255, 255, 255, 0.4)' : '#94a3b8',
    itemBg: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `฿${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `฿${(value / 1000).toFixed(0)}K`;
    }
    return `฿${value.toLocaleString()}`;
  };

  const websiteColors = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];

  return (
    <div style={{
      background: colors.cardBg,
      borderRadius: '16px',
      border: `1px solid ${colors.border}`,
      padding: '20px',
      height: '100%',
      boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(34, 197, 94, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Globe2 style={{ width: '22px', height: '22px', color: '#22c55e' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: colors.text, margin: 0 }}>
              {t('dashboard.websitePerformance')}
            </h3>
            <p style={{ fontSize: '12px', color: colors.textFaded, margin: 0 }}>
              {t('dashboard.topPerformingWebsites')}
            </p>
          </div>
        </div>
        <button style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#22c55e',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}>
          {t('dashboard.viewAll')}
        </button>
      </div>

      {/* Website List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {data.length === 0 ? (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center',
            color: colors.textMuted,
          }}>
            {t('dashboard.noDataAvailable')}
          </div>
        ) : (
          data.map((website, index) => (
            <div
              key={website.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px',
                borderRadius: '12px',
                background: colors.itemBg,
                border: `1px solid ${colors.border}`,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = websiteColors[index % websiteColors.length];
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = colors.border;
              }}
            >
              {/* Rank & Icon */}
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: `${websiteColors[index % websiteColors.length]}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: websiteColors[index % websiteColors.length],
                fontSize: '14px',
                fontWeight: 700,
              }}>
                {index + 1}
              </div>

              {/* Website Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: colors.text,
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {website.name}
                </p>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  marginTop: '4px' 
                }}>
                  <span style={{ fontSize: '11px', color: '#22c55e' }}>
                    ↑ {formatCurrency(website.deposits)}
                  </span>
                  <span style={{ fontSize: '11px', color: '#f59e0b' }}>
                    ↓ {formatCurrency(website.withdrawals)}
                  </span>
                </div>
              </div>

              {/* Profit */}
              <div style={{ textAlign: 'right' }}>
                <p style={{ 
                  fontSize: '14px', 
                  fontWeight: 700, 
                  color: website.profit >= 0 ? '#22c55e' : '#ef4444', 
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  justifyContent: 'flex-end',
                }}>
                  {website.profit >= 0 ? (
                    <TrendingUp style={{ width: '14px', height: '14px' }} />
                  ) : (
                    <TrendingDown style={{ width: '14px', height: '14px' }} />
                  )}
                  {formatCurrency(Math.abs(website.profit))}
                </p>
                <p style={{ fontSize: '11px', color: colors.textFaded, margin: 0 }}>
                  {t('dashboard.profit')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
