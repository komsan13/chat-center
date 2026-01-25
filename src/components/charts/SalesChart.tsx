'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface SalesData {
  name: string;
  sales: number;
  orders: number;
}

export default function SalesChart() {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [data, setData] = useState<SalesData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Theme-aware colors
  const colors = {
    cardBg: isDark ? '#23262B' : '#ffffff',
    border: isDark ? '#2A313C' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#1e293b',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.7)' : '#64748b',
    textFaded: isDark ? 'rgba(255, 255, 255, 0.5)' : '#94a3b8',
    gridColor: isDark ? '#2A313C' : '#e2e8f0',
    selectBg: isDark ? '#1D1E24' : '#f8fafc',
    tooltipBg: isDark ? '#23262B' : '#ffffff',
  };

  useEffect(() => {
    fetchSalesData();
  }, []);

  const fetchSalesData = async () => {
    try {
      const response = await fetch('/api/dashboard/sales');
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch sales data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const maxSales = data.length > 0 ? Math.max(...data.map(d => d.sales)) : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: colors.tooltipBg,
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          padding: '10px 14px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: colors.text, marginBottom: '4px' }}>{label}</p>
          <p style={{ fontSize: '12px', color: '#22c55e', margin: 0 }}>
            Sales: <span style={{ fontWeight: 600 }}>${payload[0].value.toLocaleString()}</span>
          </p>
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
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
            <ShoppingCart style={{ width: '20px', height: '20px', color: '#22c55e' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: colors.text, margin: 0 }}>{t('salesChart.title')}</h3>
            <p style={{ fontSize: '12px', color: colors.textFaded, margin: 0 }}>{t('salesChart.subtitle')}</p>
          </div>
        </div>
        
        <select style={{
          padding: '8px 12px',
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          background: colors.selectBg,
          color: colors.text,
          fontSize: '12px',
          cursor: 'pointer',
          outline: 'none',
        }}>
          <option>{t('salesChart.thisWeek')}</option>
          <option>{t('salesChart.lastWeek')}</option>
        </select>
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
            <span>{t('salesChart.loading')}</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.gridColor} vertical={false} />
              <XAxis 
                dataKey="name" 
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
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(34, 197, 94, 0.1)' }} />
              <Bar dataKey="sales" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.sales === maxSales ? '#22c55e' : '#16a34a'} 
                    fillOpacity={entry.sales === maxSales ? 1 : 0.6}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
