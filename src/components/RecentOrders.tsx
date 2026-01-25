'use client';

import { useState, useEffect } from 'react';
import { Package, Eye, MoreHorizontal, CheckCircle, Clock, XCircle, Loader2, LucideIcon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface StatusConfig {
  bg: string;
  color: string;
  icon: LucideIcon;
}

const statusConfig: Record<string, StatusConfig> = {
  Completed: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', icon: CheckCircle },
  Processing: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', icon: Loader2 },
  Pending: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', icon: Clock },
  Cancelled: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', icon: XCircle },
};

interface Order {
  id: string;
  customer: string;
  email: string;
  amount: string;
  status: string;
  date: string;
}

const avatarColors = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
];

export default function RecentOrders() {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Theme-aware colors
  const colors = {
    cardBg: isDark ? '#23262B' : '#ffffff',
    border: isDark ? '#2A313C' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#1e293b',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b',
    textFaded: isDark ? 'rgba(255, 255, 255, 0.5)' : '#94a3b8',
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/dashboard/orders?limit=6');
      const result = await response.json();
      if (result.success) {
        setOrders(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      background: colors.cardBg,
      borderRadius: '16px',
      border: `1px solid ${colors.border}`,
      overflow: 'hidden',
      boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px',
        borderBottom: `1px solid ${colors.border}`,
      }}>
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
            <Package style={{ width: '20px', height: '20px', color: '#22c55e' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: colors.text, margin: 0 }}>{t('recentOrders.title')}</h3>
            <p style={{ fontSize: '12px', color: colors.textFaded, margin: 0 }}>{t('recentOrders.subtitle')}</p>
          </div>
        </div>
        <button style={{
          padding: '8px 16px',
          borderRadius: '8px',
          border: 'none',
          background: 'rgba(34, 197, 94, 0.15)',
          color: '#22c55e',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
        }}>
          {t('recentOrders.viewAll')}
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        {isLoading ? (
          <div style={{ 
            padding: '40px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: colors.textMuted,
            gap: '8px',
          }}>
            <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
            <span>{t('recentOrders.loading')}</span>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                {['Order ID', 'Customer', 'Amount', 'Status', 'Date', 'Action'].map((header) => (
                  <th key={header} style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: colors.textFaded,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order, index) => {
                const status = statusConfig[order.status] || statusConfig.Pending;
                const StatusIcon = status.icon;
                const initials = order.customer.split(' ').map(n => n[0]).join('');
                
                return (
                  <tr key={order.id} style={{
                    borderBottom: index < orders.length - 1 ? `1px solid ${colors.border}` : 'none',
                    transition: 'background 0.2s ease',
                  }}>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#22c55e',
                        fontFamily: 'monospace',
                      }}>
                        {order.id}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: avatarColors[index % avatarColors.length],
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}>
                          {initials}
                        </div>
                        <div>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: colors.text, margin: 0 }}>{order.customer}</p>
                          <p style={{ fontSize: '11px', color: colors.textFaded, margin: 0 }}>{order.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>{order.amount}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: status.bg,
                        color: status.color,
                        fontSize: '12px',
                        fontWeight: 600,
                      }}>
                        <StatusIcon style={{ width: '14px', height: '14px' }} />
                        {order.status}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '12px', color: colors.textMuted }}>{order.date}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          border: `1px solid ${colors.border}`,
                          background: 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: colors.textMuted,
                        }}>
                          <Eye style={{ width: '14px', height: '14px' }} />
                        </button>
                        <button style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          border: `1px solid ${colors.border}`,
                          background: 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: colors.textMuted,
                        }}>
                          <MoreHorizontal style={{ width: '14px', height: '14px' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
