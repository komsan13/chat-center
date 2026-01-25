'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface RevenueData {
  month: string;
  revenue: number;
  profit: number;
}

export default function RevenueChart() {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [data, setData] = useState<RevenueData[]>([]);
  const [summary, setSummary] = useState<{ totalRevenue: number; totalProfit: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Theme-aware colors
  const colors = {
    cardBg: isDark ? '#23262B' : '#ffffff',
    border: isDark ? '#2A313C' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#1e293b',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.7)' : '#64748b',
    textFaded: isDark ? 'rgba(255, 255, 255, 0.5)' : '#94a3b8',
    gridColor: isDark ? '#2A313C' : '#e2e8f0',
    tooltipBg: isDark ? '#23262B' : '#ffffff',
  };

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const fetchRevenueData = async () => {
    try {
      const response = await fetch('/api/dashboard/revenue');
      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setSummary(result.summary);
      }
    } catch (error) {
      console.error('Failed to fetch revenue data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: colors.tooltipBg,
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>{label}</p>
          {payload.map((item: any, index: number) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
              <span style={{ fontSize: '12px', color: colors.textMuted }}>{item.name}:</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: colors.text }}>${item.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(34, 197, 94, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <TrendingUp style={{ width: '20px', height: '20px', color: '#22c55e' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: colors.text, margin: 0 }}>{t('revenueChart.title')}</h3>
            <p style={{ fontSize: '12px', color: colors.textFaded, margin: 0 }}>{t('revenueChart.subtitle')}</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', color: colors.textFaded, margin: 0 }}>{t('revenueChart.totalRevenue')}</p>
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#22c55e', margin: 0 }}>
              {summary ? `$${(summary.totalRevenue / 1000).toFixed(1)}k` : '-'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', color: colors.textFaded, margin: 0 }}>{t('revenueChart.totalProfit')}</p>
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#16a34a', margin: 0 }}>
              {summary ? `$${(summary.totalProfit / 1000).toFixed(1)}k` : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ fontSize: '12px', color: colors.textMuted }}>{t('revenueChart.revenue')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#16a34a' }} />
          <span style={{ fontSize: '12px', color: colors.textMuted }}>{t('revenueChart.profit')}</span>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: '280px' }}>
        {isLoading ? (
          <div style={{ 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: colors.textMuted,
            gap: '8px',
          }}>
            <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
            <span>{t('revenueChart.loading')}</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.gridColor} vertical={false} />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: colors.textFaded, fontSize: 11 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: colors.textFaded, fontSize: 11 }}
                tickFormatter={(value) => `$${value / 1000}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#22c55e" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
                name="Revenue"
              />
              <Area 
                type="monotone" 
                dataKey="profit" 
                stroke="#16a34a" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorProfit)" 
                name="Profit"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
