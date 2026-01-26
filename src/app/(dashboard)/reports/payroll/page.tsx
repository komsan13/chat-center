'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserCheck, Calendar, Download, Filter, Search, Users, Wallet, Clock, CheckCircle, TrendingUp, TrendingDown, Loader2, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

interface PayrollItem {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNickname: string;
  websiteId: string;
  websiteName: string;
  position: string;
  baseSalary: number;
  positionAllowance: number;
  commission: number;
  diligenceAllowance: number;
  shiftAllowance: number;
  overtime: number;
  bonus: number;
  totalSalary: number;
  status: string;
  month: string;
}

interface Website {
  id: string;
  name: string;
}

const positionColors: Record<string, string> = {
  'Admin': '#22c55e',
  'Operator': '#3b82f6',
  'Manager': '#8b5cf6',
  'Support': '#ec4899',
  'Other': '#f59e0b',
};

export default function PayrollPage() {
  const [payrollData, setPayrollData] = useState<PayrollItem[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedWebsite, setSelectedWebsite] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const { t, language } = useLanguage();
  const { isDark } = useTheme();

  const colors = {
    cardBg: isDark ? '#23262B' : '#ffffff',
    inputBg: isDark ? '#1D1E24' : '#f8fafc',
    border: isDark ? '#2A313C' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#1e293b',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b',
    textFaded: isDark ? 'rgba(255, 255, 255, 0.5)' : '#94a3b8',
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(value);

  // Fetch payroll data from salaries API
  const fetchPayrollData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedMonth) params.append('month', selectedMonth);
      if (selectedWebsite !== 'all') params.append('websiteId', selectedWebsite);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      
      const response = await fetch(`/api/salaries?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setPayrollData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch payroll data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedWebsite, selectedStatus]);

  // Fetch websites
  const fetchWebsites = useCallback(async () => {
    try {
      const response = await fetch('/api/websites');
      const result = await response.json();
      if (result.success) {
        setWebsites(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch websites:', error);
    }
  }, []);

  useEffect(() => {
    fetchWebsites();
  }, [fetchWebsites]);

  useEffect(() => {
    fetchPayrollData();
  }, [fetchPayrollData]);

  // Calculate summary stats
  const summaryStats = {
    totalPayroll: payrollData.reduce((sum, item) => sum + item.totalSalary, 0),
    totalEmployees: payrollData.length,
    paid: payrollData.filter(item => item.status === 'paid').length,
    pending: payrollData.filter(item => item.status === 'unpaid').length,
  };

  // Filter data
  const filteredData = payrollData.filter(item => {
    if (searchTerm && !item.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !item.employeeNickname?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Generate month options (last 12 months)
  const monthOptions = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = date.toISOString().slice(0, 7);
    const label = date.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { year: 'numeric', month: 'long' });
    monthOptions.push({ value, label });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: colors.text, margin: 0 }}>{t('payroll.title')}</h1>
          <p style={{ fontSize: '14px', color: colors.textMuted, marginTop: '4px' }}>{t('payroll.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => fetchPayrollData()}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', border: `1px solid ${colors.border}`, background: colors.cardBg, color: colors.text, fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
          >
            <RefreshCw style={{ width: '16px', height: '16px' }} />
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: '#ffffff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)' }}>
            <Download style={{ width: '16px', height: '16px' }} /><span>{t('common.export')}</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', borderRadius: '16px', padding: '20px', color: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet style={{ width: '20px', height: '20px' }} />
            </div>
            <span style={{ fontSize: '14px', opacity: 0.8 }}>{t('payroll.totalPayroll')}</span>
          </div>
          <p style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>{formatCurrency(summaryStats.totalPayroll)}</p>
        </div>
        {[
          { icon: Users, color: '#8b5cf6', label: t('payroll.totalEmployees'), value: summaryStats.totalEmployees.toString() },
          { icon: CheckCircle, color: '#22c55e', label: t('payroll.paid'), value: `${summaryStats.paid} ${language === 'th' ? 'คน' : 'people'}` },
          { icon: Clock, color: '#f59e0b', label: t('payroll.pending'), value: `${summaryStats.pending} ${language === 'th' ? 'คน' : 'people'}` },
        ].map((card, i) => (
          <div key={i} style={{ background: colors.cardBg, borderRadius: '16px', padding: '20px', border: `1px solid ${colors.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${card.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <card.icon style={{ width: '20px', height: '20px', color: card.color }} />
              </div>
              <span style={{ fontSize: '14px', color: colors.textMuted }}>{card.label}</span>
            </div>
            <p style={{ fontSize: '24px', fontWeight: 700, color: card.color, margin: 0 }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: colors.cardBg, borderRadius: '16px', padding: '20px', border: `1px solid ${colors.border}` }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: colors.textMuted }} />
            <input type="text" placeholder={t('payroll.searchPlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', paddingLeft: '40px', paddingRight: '16px', height: '42px', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: '10px', color: colors.text, fontSize: '14px', outline: 'none' }} />
          </div>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ padding: '0 16px', height: '42px', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: '10px', color: colors.text, fontSize: '14px', cursor: 'pointer', outline: 'none', minWidth: '180px' }}>
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select value={selectedWebsite} onChange={(e) => setSelectedWebsite(e.target.value)}
            style={{ padding: '0 16px', height: '42px', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: '10px', color: colors.text, fontSize: '14px', cursor: 'pointer', outline: 'none' }}>
            <option value="all">{language === 'th' ? 'ทุกเว็บไซต์' : 'All Websites'}</option>
            {websites.map(web => (
              <option key={web.id} value={web.id}>{web.name}</option>
            ))}
          </select>
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ padding: '0 16px', height: '42px', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: '10px', color: colors.text, fontSize: '14px', cursor: 'pointer', outline: 'none' }}>
            <option value="all">{t('status.all')}</option>
            <option value="paid">{t('payroll.paid')}</option>
            <option value="unpaid">{t('payroll.pending')}</option>
          </select>
        </div>
      </div>

      {/* Payroll Table */}
      <div style={{ background: colors.cardBg, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Loader2 style={{ width: '32px', height: '32px', color: '#22c55e', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
            <p style={{ marginTop: '12px', color: colors.textMuted }}>{language === 'th' ? 'กำลังโหลด...' : 'Loading...'}</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Users style={{ width: '48px', height: '48px', color: colors.textFaded, margin: '0 auto' }} />
            <p style={{ marginTop: '12px', color: colors.textMuted }}>{language === 'th' ? 'ไม่พบข้อมูลเงินเดือน' : 'No payroll data found'}</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                    {[
                      language === 'th' ? 'พนักงาน' : 'Employee', 
                      language === 'th' ? 'เว็บไซต์' : 'Website', 
                      language === 'th' ? 'ตำแหน่ง' : 'Position', 
                      language === 'th' ? 'เงินเดือน' : 'Base Salary', 
                      language === 'th' ? 'ค่าตำแหน่ง' : 'Position Allow.', 
                      language === 'th' ? 'คอมมิชชั่น' : 'Commission', 
                      language === 'th' ? 'โบนัส' : 'Bonus', 
                      language === 'th' ? 'รวม' : 'Total', 
                      language === 'th' ? 'สถานะ' : 'Status'
                    ].map((h, i) => (
                      <th key={i} style={{ padding: '14px 16px', textAlign: i >= 3 && i <= 7 ? 'right' : i === 8 ? 'center' : 'left', fontSize: '12px', fontWeight: 600, color: colors.textFaded, textTransform: 'uppercase', letterSpacing: '0.5px', background: colors.inputBg }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item, i) => {
                    const positionColor = positionColors[item.position] || positionColors['Other'];
                    return (
                      <tr key={item.id} style={{ borderBottom: i < filteredData.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 600 }}>
                              {item.employeeName.charAt(0)}
                            </div>
                            <div>
                              <p style={{ fontWeight: 500, color: colors.text, margin: 0, fontSize: '14px' }}>{item.employeeName}</p>
                              {item.employeeNickname && (
                                <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0 }}>({item.employeeNickname})</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '14px', color: colors.textMuted }}>{item.websiteName}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: `${positionColor}20`, color: positionColor }}>{item.position}</span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', color: colors.text }}>{formatCurrency(item.baseSalary)}</td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', color: colors.textMuted }}>{formatCurrency(item.positionAllowance)}</td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', color: '#22c55e' }}>
                          {item.commission > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                              <TrendingUp style={{ width: '14px', height: '14px' }} />+{formatCurrency(item.commission)}
                            </div>
                          )}
                          {item.commission === 0 && <span style={{ color: colors.textFaded }}>-</span>}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', color: '#f59e0b' }}>
                          {item.bonus > 0 ? `+${formatCurrency(item.bonus)}` : <span style={{ color: colors.textFaded }}>-</span>}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#22c55e', fontSize: '15px' }}>{formatCurrency(item.totalSalary)}</td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: item.status === 'paid' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: item.status === 'paid' ? '#22c55e' : '#f59e0b' }}>
                            {item.status === 'paid' ? <CheckCircle style={{ width: '14px', height: '14px' }} /> : <Clock style={{ width: '14px', height: '14px' }} />}
                            {item.status === 'paid' ? t('payroll.paid') : t('payroll.pending')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '16px', borderTop: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(34, 197, 94, 0.05)' }}>
              <span style={{ fontSize: '14px', color: colors.textMuted }}>{t('common.showing')} {filteredData.length} {t('common.of')} {payrollData.length} {t('common.items')}</span>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '12px', color: colors.textMuted, margin: '0 0 4px 0' }}>{t('payroll.totalPayroll')}</p>
                <p style={{ fontSize: '18px', fontWeight: 700, color: '#22c55e', margin: 0 }}>{formatCurrency(filteredData.reduce((s, i) => s + i.totalSalary, 0))}</p>
              </div>
            </div>
          </>
        )}
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
