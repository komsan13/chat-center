'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, ComposedChart, Line } from 'recharts';
import { PiggyBank, Minus, Plus } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface DailyBalanceData {
  date: string;
  dailyBalance: number;
  cashWithdrawal: number;
  fee: number;
  transfer: number;
  cashExpenses: number;
  netBalance: number;
}

interface FinancialChartProps {
  data: Array<DailyBalanceData>;
}

export default function FinancialChart({ data }: FinancialChartProps) {
  const { isDark } = useTheme();
  const { t, language } = useLanguage();

  const colors = {
    cardBg: isDark ? '#23262B' : '#ffffff',
    border: isDark ? '#2A313C' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#1e293b',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b',
    textFaded: isDark ? 'rgba(255, 255, 255, 0.4)' : '#94a3b8',
    gridColor: isDark ? '#2A313C' : '#e2e8f0',
    tooltipBg: isDark ? '#1A1D21' : '#ffffff',
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
  };

  // Format currency for tooltip
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', { 
      style: 'currency', 
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(value);
  };

  const labels = {
    cashWithdrawal: language === 'th' ? 'ถอนเงิน' : 'Cash Withdrawal',
    fee: language === 'th' ? 'ค่าธรรมเนียม' : 'Fee',
    transfer: language === 'th' ? 'โยกเงิน(เงินสด)' : 'Transfer (Cash)',
    cashExpenses: language === 'th' ? 'ค่าใช้จ่าย(เงินสด)' : 'Cash Expenses',
    dailyBalance: language === 'th' ? 'ยอดเงินคงเหลือรายวัน' : 'Daily Balance',
    netBalance: language === 'th' ? 'ยอดรวมเงินคงเหลือ' : 'Total Balance',
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dayData = data.find(d => d.date === label);
      if (!dayData) return null;
      
      return (
        <div style={{
          background: colors.tooltipBg,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          padding: '14px',
          boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.5)' : '0 8px 32px rgba(0, 0, 0, 0.15)',
          minWidth: '220px',
        }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '12px' }}>
            {formatDate(label)}
          </p>
          
          {/* Calculation breakdown */}
          <div style={{ fontSize: '12px', color: colors.textMuted }}>
            {/* Cash Withdrawal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>{labels.cashWithdrawal}</span>
              <span style={{ fontWeight: 600, color: '#f59e0b' }}>
                {formatCurrency(dayData.cashWithdrawal)}
              </span>
            </div>

            {/* Fee */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>- {labels.fee}</span>
              <span style={{ fontWeight: 600, color: '#ef4444' }}>
                {formatCurrency(dayData.fee)}
              </span>
            </div>

            {/* Transfer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>- {labels.transfer}</span>
              <span style={{ fontWeight: 600, color: '#8b5cf6' }}>
                {formatCurrency(dayData.transfer)}
              </span>
            </div>

            {/* Cash Expenses */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>- {labels.cashExpenses}</span>
              <span style={{ fontWeight: 600, color: '#ec4899' }}>
                {formatCurrency(dayData.cashExpenses)}
              </span>
            </div>

            {/* Daily Balance */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>+ {labels.dailyBalance}</span>
              <span style={{ fontWeight: 600, color: '#22c55e' }}>
                {formatCurrency(dayData.dailyBalance)}
              </span>
            </div>

            {/* Divider */}
            <div style={{ borderTop: `1px solid ${colors.border}`, marginBottom: '8px' }} />

            {/* Net Balance */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, color: colors.text }}>{labels.netBalance}</span>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: 700, 
                color: dayData.netBalance >= 0 ? '#22c55e' : '#ef4444' 
              }}>
                {formatCurrency(dayData.netBalance)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate totals
  const totals = data.reduce((acc, item) => ({
    cashWithdrawal: acc.cashWithdrawal + (item.cashWithdrawal || 0),
    fee: acc.fee + (item.fee || 0),
    transfer: acc.transfer + (item.transfer || 0),
    cashExpenses: acc.cashExpenses + (item.cashExpenses || 0),
    dailyBalance: acc.dailyBalance + (item.dailyBalance || 0),
    netBalance: acc.netBalance + (item.netBalance || 0),
  }), { cashWithdrawal: 0, fee: 0, transfer: 0, cashExpenses: 0, dailyBalance: 0, netBalance: 0 });

  // ถอนเงินรวม - ค่าธรรมเนียมรวม - โยกเงินสดรวม - ค่าใช้จ่ายเงินสด (แสดงตำแหน่งแรก)
  const cashAfterDeductions = totals.cashWithdrawal - totals.fee - totals.transfer - totals.cashExpenses;

  // Get the latest day's daily balance that has data (ยอดคงเหลือวันล่าสุดที่มีข้อมูล)
  const sortedData = [...data]
    .filter(d => d.dailyBalance > 0) // กรองเฉพาะวันที่มียอดคงเหลือ
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latestDailyBalance = sortedData.length > 0 ? (sortedData[0].dailyBalance || 0) : 0;
  
  // Calculate total net balance: (ถอนเงินรวม - ค่าธรรมเนียม - โยกเงินสด - ค่าใช้จ่าย) + ยอดคงเหลือวันล่าสุด
  const calculatedNetBalance = cashAfterDeductions + latestDailyBalance;

  return (
    <div style={{
      background: colors.cardBg,
      borderRadius: '16px',
      border: `1px solid ${colors.border}`,
      padding: '20px',
      boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        justifyContent: 'space-between', 
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '16px'
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
            <PiggyBank style={{ width: '22px', height: '22px', color: '#22c55e' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: colors.text, margin: 0 }}>
              {language === 'th' ? 'สรุปเงินคงเหลือรายวัน' : 'Daily Balance Summary'}
            </h3>
            <p style={{ fontSize: '12px', color: colors.textFaded, margin: 0 }}>
              {language === 'th' ? 'ถอนเงิน - ค่าธรรมเนียม - โยก - ค่าใช้จ่าย + ยอดคงเหลือ' : 'Withdrawal - Fee - Transfer - Expenses + Balance'}
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', color: colors.textFaded, margin: 0 }}>{language === 'th' ? 'ถอนเงิน - ค่าธรรมเนียม - โยก - ค่าใช้จ่าย' : 'Cash - Fee - Transfer - Expenses'}</p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#f59e0b', margin: 0 }}>
              {formatCurrency(cashAfterDeductions)}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', color: colors.textFaded, margin: 0 }}>{labels.netBalance}</p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: calculatedNetBalance >= 0 ? '#22c55e' : '#ef4444', margin: 0 }}>
              {formatCurrency(calculatedNetBalance)}
            </p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#f59e0b' }} />
          <span style={{ fontSize: '11px', color: colors.textMuted }}>{labels.cashWithdrawal}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#22c55e' }} />
          <span style={{ fontSize: '11px', color: colors.textMuted }}>{labels.dailyBalance}</span>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: '300px' }}>
        {data.length === 0 ? (
          <div style={{ 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: colors.textMuted,
          }}>
            <span>{t('dashboard.noDataAvailable')}</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.gridColor} vertical={false} />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: colors.textFaded, fontSize: 11 }}
                tickFormatter={formatDate}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: colors.textFaded, fontSize: 11 }}
                tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Bar for Cash Withdrawal */}
              <Bar 
                dataKey="cashWithdrawal" 
                fill="#f59e0b" 
                radius={[4, 4, 0, 0]} 
                name={labels.cashWithdrawal}
                maxBarSize={35}
              />
              
              {/* Bar for Daily Balance */}
              <Bar 
                dataKey="dailyBalance" 
                fill="#22c55e" 
                radius={[4, 4, 0, 0]} 
                name={labels.dailyBalance}
                maxBarSize={35}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}