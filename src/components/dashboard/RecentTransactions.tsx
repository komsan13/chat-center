'use client';

import { 
  ArrowRightLeft, 
  CircleDollarSign, 
  FileSpreadsheet, 
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface Transaction {
  id: string;
  date: string;
  type: 'transfer' | 'withdrawal' | 'expense';
  description: string;
  amount: number;
  status: string;
  website?: string;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export default function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const colors = {
    cardBg: isDark ? '#23262B' : '#ffffff',
    border: isDark ? '#2A313C' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#1e293b',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b',
    textFaded: isDark ? 'rgba(255, 255, 255, 0.4)' : '#94a3b8',
    headerBg: isDark ? '#1A1D21' : '#f8fafc',
    rowHover: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
  };

  const typeConfig = {
    transfer: { 
      icon: ArrowRightLeft, 
      color: '#06b6d4', 
      label: t('dashboard.transfer'),
      bg: 'rgba(6, 182, 212, 0.1)'
    },
    withdrawal: { 
      icon: CircleDollarSign, 
      color: '#f97316', 
      label: t('dashboard.withdrawal'),
      bg: 'rgba(249, 115, 22, 0.1)'
    },
    expense: { 
      icon: FileSpreadsheet, 
      color: '#ef4444', 
      label: t('dashboard.expense'),
      bg: 'rgba(239, 68, 68, 0.1)'
    },
  };

  const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    completed: { 
      icon: CheckCircle2, 
      color: '#22c55e', 
      bg: 'rgba(34, 197, 94, 0.1)',
      label: t('dashboard.completed')
    },
    pending: { 
      icon: Clock, 
      color: '#f59e0b', 
      bg: 'rgba(245, 158, 11, 0.1)',
      label: t('dashboard.pending')
    },
    paid: { 
      icon: CheckCircle2, 
      color: '#22c55e', 
      bg: 'rgba(34, 197, 94, 0.1)',
      label: t('dashboard.paid')
    },
    unpaid: { 
      icon: AlertCircle, 
      color: '#ef4444', 
      bg: 'rgba(239, 68, 68, 0.1)',
      label: t('dashboard.unpaid')
    },
    failed: { 
      icon: XCircle, 
      color: '#ef4444', 
      bg: 'rgba(239, 68, 68, 0.1)',
      label: t('dashboard.failed')
    },
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', { 
      style: 'currency', 
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
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
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(34, 197, 94, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Clock style={{ width: '22px', height: '22px', color: '#22c55e' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: colors.text, margin: 0 }}>
              {t('dashboard.recentTransactions')}
            </h3>
            <p style={{ fontSize: '12px', color: colors.textFaded, margin: 0 }}>
              {t('dashboard.latestTransactions')}
            </p>
          </div>
        </div>
        <button style={{
          padding: '10px 18px',
          borderRadius: '10px',
          border: 'none',
          background: 'rgba(34, 197, 94, 0.1)',
          color: '#22c55e',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}>
          {t('dashboard.viewAll')}
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        {transactions.length === 0 ? (
          <div style={{ 
            padding: '60px', 
            textAlign: 'center',
            color: colors.textMuted,
          }}>
            {t('dashboard.noTransactions')}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: colors.headerBg }}>
                <th style={{ 
                  padding: '14px 20px', 
                  textAlign: 'left', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {t('dashboard.type')}
                </th>
                <th style={{ 
                  padding: '14px 20px', 
                  textAlign: 'left', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {t('dashboard.description')}
                </th>
                <th style={{ 
                  padding: '14px 20px', 
                  textAlign: 'left', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {t('dashboard.website')}
                </th>
                <th style={{ 
                  padding: '14px 20px', 
                  textAlign: 'right', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {t('dashboard.amount')}
                </th>
                <th style={{ 
                  padding: '14px 20px', 
                  textAlign: 'center', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {t('dashboard.status')}
                </th>
                <th style={{ 
                  padding: '14px 20px', 
                  textAlign: 'left', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {t('dashboard.date')}
                </th>
                <th style={{ 
                  padding: '14px 20px', 
                  textAlign: 'center', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  width: '60px',
                }}>
                  
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction, index) => {
                const typeInfo = typeConfig[transaction.type] || typeConfig.transfer;
                const statusInfo = statusConfig[transaction.status?.toLowerCase()] || statusConfig.pending;
                const TypeIcon = typeInfo.icon;
                const StatusIcon = statusInfo.icon;

                return (
                  <tr 
                    key={transaction.id}
                    style={{ 
                      borderBottom: index < transactions.length - 1 ? `1px solid ${colors.border}` : 'none',
                      transition: 'background 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = colors.rowHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {/* Type */}
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          background: typeInfo.bg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <TypeIcon style={{ width: '16px', height: '16px', color: typeInfo.color }} />
                        </div>
                        <span style={{ 
                          fontSize: '13px', 
                          fontWeight: 500, 
                          color: colors.text 
                        }}>
                          {typeInfo.label}
                        </span>
                      </div>
                    </td>

                    {/* Description */}
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ 
                        fontSize: '13px', 
                        color: colors.text,
                        maxWidth: '200px',
                        display: 'block',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {transaction.description}
                      </span>
                    </td>

                    {/* Website */}
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ 
                        fontSize: '12px', 
                        color: colors.textMuted,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                      }}>
                        {transaction.website || '-'}
                      </span>
                    </td>

                    {/* Amount */}
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <span style={{ 
                        fontSize: '14px', 
                        fontWeight: 600, 
                        color: transaction.type === 'expense' ? '#ef4444' : colors.text,
                      }}>
                        {transaction.type === 'expense' ? '-' : ''}{formatCurrency(transaction.amount)}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        background: statusInfo.bg,
                        color: statusInfo.color,
                        fontSize: '12px',
                        fontWeight: 500,
                      }}>
                        <StatusIcon style={{ width: '14px', height: '14px' }} />
                        {statusInfo.label}
                      </div>
                    </td>

                    {/* Date */}
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontSize: '13px', color: colors.textMuted }}>
                        {formatDate(transaction.date)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <button style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'transparent',
                        color: colors.textMuted,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = colors.rowHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                      >
                        <Eye style={{ width: '16px', height: '16px' }} />
                      </button>
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
