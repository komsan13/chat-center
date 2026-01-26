'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight,
  HandCoins,
  ArrowRightLeft,
  FileSpreadsheet,
  Landmark,
  Globe2,
  CreditCard,
  CalendarDays,
  RefreshCcw,
  Activity,
  Loader2
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import ProtectedPage from '@/components/ProtectedPage';
import FinancialChart from '@/components/dashboard/FinancialChart';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import WebsitePerformance from '@/components/dashboard/WebsitePerformance';
import QuickStats from '@/components/dashboard/QuickStats';

interface DashboardData {
  stats: {
    totalDeposits: { value: number; formatted: string; change: number };
    totalWithdrawals: { value: number; formatted: string; change: number };
    netProfit: { value: number; formatted: string; change: number };
    totalBalance: { value: number; formatted: string; change: number };
    transfers: { count: number; total: number; formatted: string };
    cashWithdrawals: { count: number; total: number; formatted: string };
    expenses: { count: number; total: number; formatted: string };
    websites: number;
    banks: number;
  };
  dailyChart: Array<{ 
    date: string; 
    dailyBalance: number; 
    cashWithdrawal: number; 
    fee: number; 
    transfer: number; 
    cashExpenses: number; 
    netBalance: number; 
  }>;
  recentTransactions: Array<any>;
  websitePerformance: Array<any>;
}

export default function Dashboard() {
  const { isDark } = useTheme();
  const { t, language } = useLanguage();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  // Detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  // Get current month/year for default selection
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Thai month names
  const thaiMonths = [
    { value: 1, label: 'มกราคม' },
    { value: 2, label: 'กุมภาพันธ์' },
    { value: 3, label: 'มีนาคม' },
    { value: 4, label: 'เมษายน' },
    { value: 5, label: 'พฤษภาคม' },
    { value: 6, label: 'มิถุนายน' },
    { value: 7, label: 'กรกฎาคม' },
    { value: 8, label: 'สิงหาคม' },
    { value: 9, label: 'กันยายน' },
    { value: 10, label: 'ตุลาคม' },
    { value: 11, label: 'พฤศจิกายน' },
    { value: 12, label: 'ธันวาคม' }
  ];

  // Generate year options (last 5 years)
  const yearOptions = [];
  for (let year = currentYear; year >= currentYear - 4; year--) {
    yearOptions.push(year);
  }

  const colors = {
    bg: isDark ? '#1A1D21' : '#f8fafc',
    cardBg: isDark ? '#23262B' : '#ffffff',
    border: isDark ? '#2A313C' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#1e293b',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b',
    textFaded: isDark ? 'rgba(255, 255, 255, 0.4)' : '#94a3b8',
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedMonth, selectedYear]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/dashboard/overview?month=${selectedMonth}/${selectedYear}`);
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    setIsRefreshing(false);
  };

  const KPICard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    color,
    subtitle 
  }: { 
    title: string; 
    value: string; 
    change?: number; 
    icon: any; 
    color: string;
    subtitle?: string;
  }) => (
    <div style={{
      background: colors.cardBg,
      borderRadius: isMobile ? '12px' : '16px',
      border: `1px solid ${colors.border}`,
      padding: isMobile ? '16px' : '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? '10px' : '12px',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      minWidth: 0,
    }}
    onMouseEnter={(e) => {
      if (!isMobile) {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = isDark 
          ? '0 8px 32px rgba(0, 0, 0, 0.3)' 
          : '0 8px 32px rgba(0, 0, 0, 0.1)';
      }
    }}
    onMouseLeave={(e) => {
      if (!isMobile) {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }
    }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: isMobile ? '40px' : '48px',
          height: isMobile ? '40px' : '48px',
          borderRadius: isMobile ? '10px' : '12px',
          background: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon style={{ width: isMobile ? '20px' : '24px', height: isMobile ? '20px' : '24px', color }} />
        </div>
        {change !== undefined && change !== null && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: isMobile ? '3px 8px' : '4px 10px',
            borderRadius: '20px',
            background: change >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: change >= 0 ? '#22c55e' : '#ef4444',
            fontSize: isMobile ? '11px' : '12px',
            fontWeight: 600,
            flexShrink: 0,
          }}>
            {change >= 0 ? <ArrowUpRight size={isMobile ? 12 : 14} /> : <ArrowDownRight size={isMobile ? 12 : 14} />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ 
          fontSize: isMobile ? '12px' : '13px', 
          color: colors.textMuted, 
          margin: 0,
          marginBottom: '4px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {title}
        </p>
        <p style={{ 
          fontSize: isMobile ? '18px' : '24px', 
          fontWeight: 700, 
          color: colors.text, 
          margin: 0,
          letterSpacing: '-0.5px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {value}
        </p>
        {subtitle && (
          <p style={{ 
            fontSize: isMobile ? '11px' : '12px', 
            color: colors.textFaded, 
            margin: 0,
            marginTop: '4px'
          }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <ProtectedPage permission="viewDashboard">
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '24px' }}>
        {/* Page Header */}
        <div style={{ 
          display: 'flex', 
          alignItems: isMobile ? 'flex-start' : 'center', 
          justifyContent: 'space-between', 
          flexDirection: isMobile ? 'column' : 'row',
          gap: '16px' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '16px' }}>
            <div style={{
              width: isMobile ? '44px' : '52px',
              height: isMobile ? '44px' : '52px',
              borderRadius: isMobile ? '12px' : '14px',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(34, 197, 94, 0.3)',
              flexShrink: 0,
            }}>
              <Activity style={{ width: isMobile ? '22px' : '26px', height: isMobile ? '22px' : '26px', color: '#ffffff' }} />
            </div>
            <div>
              <h1 style={{ 
                fontSize: isMobile ? '22px' : '28px', 
                fontWeight: 700, 
                color: colors.text, 
                margin: 0,
                letterSpacing: '-0.5px'
              }}>
                {t('dashboard.title')}
              </h1>
              <p style={{ fontSize: isMobile ? '13px' : '14px', color: colors.textMuted, margin: 0 }}>
                {t('dashboard.welcome')}
              </p>
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: isMobile ? '8px' : '12px',
            width: isMobile ? '100%' : 'auto',
            flexWrap: isMobile ? 'wrap' : 'nowrap',
          }}>
            {/* Month Selector */}
            <div style={{ position: 'relative', flex: isMobile ? 1 : 'none', minWidth: isMobile ? '0' : '140px' }}>
              <CalendarDays style={{ 
                position: 'absolute', 
                left: isMobile ? '10px' : '14px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                width: '16px', 
                height: '16px', 
                color: colors.textFaded,
                pointerEvents: 'none'
              }} />
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: isMobile ? '40px' : '44px',
                  paddingLeft: isMobile ? '34px' : '42px',
                  paddingRight: '12px',
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  background: colors.cardBg,
                  color: colors.text,
                  fontSize: isMobile ? '13px' : '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  outline: 'none',
                  appearance: 'none',
                }}
              >
                {thaiMonths.map((month) => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>

            {/* Year Selector */}
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{
                height: isMobile ? '40px' : '44px',
                padding: '0 12px',
                borderRadius: '12px',
                border: `1px solid ${colors.border}`,
                background: colors.cardBg,
                color: colors.text,
                fontSize: isMobile ? '13px' : '14px',
                fontWeight: 500,
                cursor: 'pointer',
                outline: 'none',
                appearance: 'none',
                minWidth: isMobile ? '70px' : '100px',
              }}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            {/* Refresh Button */}
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: isMobile ? '40px' : '44px',
                height: isMobile ? '40px' : '44px',
                borderRadius: '12px',
                border: `1px solid ${colors.border}`,
                background: colors.cardBg,
                color: colors.textMuted,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                flexShrink: 0,
              }}
            >
              <RefreshCcw 
                style={{ 
                  width: '18px', 
                  height: '18px',
                  animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
                }} 
              />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '80px',
            color: colors.textMuted,
            gap: '12px',
          }}>
            <Loader2 style={{ width: '32px', height: '32px', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '16px' }}>{t('dashboard.loadingStats')}</span>
          </div>
        ) : data ? (
          <>
            {/* Calculate net balance: ถอนเงิน - ค่าธรรมเนียม - โยกเงินสด - ค่าใช้จ่าย + ยอดคงเหลือวันล่าสุด */}
            {(() => {
              const totals = data.dailyChart.reduce((acc, item) => ({
                cashWithdrawal: acc.cashWithdrawal + (item.cashWithdrawal || 0),
                fee: acc.fee + (item.fee || 0),
                transfer: acc.transfer + (item.transfer || 0),
                cashExpenses: acc.cashExpenses + (item.cashExpenses || 0),
              }), { cashWithdrawal: 0, fee: 0, transfer: 0, cashExpenses: 0 });
              
              const cashAfterDeductions = totals.cashWithdrawal - totals.fee - totals.transfer - totals.cashExpenses;
              const sortedData = [...data.dailyChart].filter(d => d.dailyBalance > 0).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              const latestDailyBalance = sortedData.length > 0 ? (sortedData[0].dailyBalance || 0) : 0;
              const calculatedNetBalance = cashAfterDeductions + latestDailyBalance;
              
              const formatCurrency = (value: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

              return (
            <>
            {/* Main KPI Cards */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', 
              gap: isMobile ? '12px' : '20px' 
            }}>
              <KPICard
                title={t('dashboard.totalDeposits')}
                value={data.stats.totalDeposits.formatted}
                change={data.stats.totalDeposits.change}
                icon={TrendingUp}
                color="#22c55e"
                subtitle={t('dashboard.vsLastPeriod')}
              />
              <KPICard
                title={t('dashboard.totalWithdrawals')}
                value={data.stats.totalWithdrawals.formatted}
                change={data.stats.totalWithdrawals.change}
                icon={TrendingDown}
                color="#f59e0b"
                subtitle={t('dashboard.vsLastPeriod')}
              />
              <KPICard
                title={t('dashboard.netProfit')}
                value={data.stats.netProfit.formatted}
                change={data.stats.netProfit.change}
                icon={HandCoins}
                color="#3b82f6"
                subtitle={t('dashboard.vsLastPeriod')}
              />
              <KPICard
                title={t('dashboard.totalBalance')}
                value={formatCurrency(calculatedNetBalance)}
                change={null as any}
                icon={Landmark}
                color="#8b5cf6"
                subtitle={t('dashboard.currentBalance')}
              />
            </div>

            {/* Quick Stats Row */}
            <QuickStats 
              transfers={data.stats.transfers}
              cashWithdrawals={data.stats.cashWithdrawals}
              expenses={data.stats.expenses}
              websites={data.stats.websites}
              banks={data.stats.banks}
              isMobile={isMobile}
            />

            {/* Charts Row */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr' : '2fr 1fr', 
              gap: isMobile ? '16px' : '20px' 
            }}>
              <FinancialChart data={data.dailyChart} />
              <WebsitePerformance data={data.websitePerformance} />
            </div>

            {/* Transactions */}
            <RecentTransactions transactions={data.recentTransactions} />
          </>
              );
            })()}
          </>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            color: colors.textMuted, 
            padding: '80px' 
          }}>
            {t('dashboard.failedToLoad')}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </ProtectedPage>
  );
}
