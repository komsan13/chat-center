'use client';

import { useState } from 'react';
import { UserCheck, Calendar, Download, Filter, Search, Users, Wallet, Clock, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

const payrollData = [
  { id: 'EMP-001', name: 'สมชาย ใจดี', department: 'sales', position: 'Sales Manager', baseSalary: 65000, bonus: 15000, deductions: 8500, netSalary: 71500, status: 'paid' },
  { id: 'EMP-002', name: 'สมหญิง มั่นคง', department: 'accounting', position: 'Senior Accountant', baseSalary: 55000, bonus: 8000, deductions: 6800, netSalary: 56200, status: 'paid' },
  { id: 'EMP-003', name: 'วิชัย รักงาน', department: 'it', position: 'Developer', baseSalary: 60000, bonus: 10000, deductions: 7500, netSalary: 62500, status: 'pending' },
  { id: 'EMP-004', name: 'นภา สวยงาม', department: 'hr', position: 'HR Specialist', baseSalary: 45000, bonus: 5000, deductions: 5500, netSalary: 44500, status: 'paid' },
  { id: 'EMP-005', name: 'พิชัย เก่งกาจ', department: 'it', position: 'Senior Developer', baseSalary: 75000, bonus: 20000, deductions: 10200, netSalary: 84800, status: 'pending' },
  { id: 'EMP-006', name: 'มานี ดีงาม', department: 'operations', position: 'Operations Manager', baseSalary: 58000, bonus: 12000, deductions: 7600, netSalary: 62400, status: 'paid' },
];

const summaryStats = { totalPayroll: 381900, totalEmployees: 6, paid: 4, pending: 2 };

const departmentColors: Record<string, string> = {
  sales: '#22c55e', accounting: '#3b82f6', it: '#8b5cf6', hr: '#ec4899', operations: '#f59e0b',
};

export default function PayrollPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const { t } = useLanguage();
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

  const filteredData = payrollData.filter(item => {
    if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
    if (selectedDepartment !== 'all' && item.department !== selectedDepartment) return false;
    if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase()) && !item.id.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: colors.text, margin: 0 }}>{t('payroll.title')}</h1>
          <p style={{ fontSize: '14px', color: colors.textMuted, marginTop: '4px' }}>{t('payroll.subtitle')}</p>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: '#ffffff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)' }}>
          <Download style={{ width: '16px', height: '16px' }} /><span>{t('common.export')}</span>
        </button>
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
          <p style={{ fontSize: '24px', fontWeight: 700 }}>{formatCurrency(summaryStats.totalPayroll)}</p>
        </div>
        {[
          { icon: Users, color: '#8b5cf6', label: t('payroll.totalEmployees'), value: summaryStats.totalEmployees.toString() },
          { icon: CheckCircle, color: '#22c55e', label: t('payroll.paid'), value: `${summaryStats.paid} คน` },
          { icon: Clock, color: '#f59e0b', label: t('payroll.pending'), value: `${summaryStats.pending} คน` },
        ].map((card, i) => (
          <div key={i} style={{ background: colors.cardBg, borderRadius: '16px', padding: '20px', border: `1px solid ${colors.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${card.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <card.icon style={{ width: '20px', height: '20px', color: card.color }} />
              </div>
              <span style={{ fontSize: '14px', color: colors.textMuted }}>{card.label}</span>
            </div>
            <p style={{ fontSize: '24px', fontWeight: 700, color: card.color }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: colors.cardBg, borderRadius: '16px', padding: '20px', border: `1px solid ${colors.border}` }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: colors.textMuted }} />
            <input type="text" placeholder={t('payroll.searchPlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', paddingLeft: '40px', paddingRight: '16px', height: '42px', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: '10px', color: colors.text, fontSize: '14px', outline: 'none' }} />
          </div>
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ padding: '0 16px', height: '42px', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: '10px', color: colors.text, fontSize: '14px', cursor: 'pointer', outline: 'none' }}>
            <option value="all">{t('status.all')}</option>
            <option value="paid">{t('payroll.paid')}</option>
            <option value="pending">{t('payroll.pending')}</option>
          </select>
          <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)}
            style={{ padding: '0 16px', height: '42px', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: '10px', color: colors.text, fontSize: '14px', cursor: 'pointer', outline: 'none' }}>
            <option value="all">{t('payroll.allDepartments')}</option>
            <option value="sales">{t('payroll.sales')}</option>
            <option value="accounting">{t('payroll.accounting')}</option>
            <option value="it">{t('payroll.it')}</option>
            <option value="hr">{t('payroll.hr')}</option>
            <option value="operations">{t('payroll.operations')}</option>
          </select>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', border: 'none', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
            <Filter style={{ width: '16px', height: '16px' }} /><span>{t('common.filter')}</span>
          </button>
        </div>
      </div>

      {/* Payroll Table */}
      <div style={{ background: colors.cardBg, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
              {[t('payroll.employeeId'), t('payroll.employeeName'), t('payroll.department'), t('payroll.position'), t('payroll.baseSalary'), t('payroll.bonus'), t('payroll.deductions'), t('payroll.netSalary'), t('common.status')].map((h, i) => (
                <th key={i} style={{ padding: '14px 16px', textAlign: i >= 4 && i <= 7 ? 'right' : i === 8 ? 'center' : 'left', fontSize: '12px', fontWeight: 600, color: colors.textFaded, textTransform: 'uppercase', letterSpacing: '0.5px', background: colors.inputBg }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item, i) => (
              <tr key={item.id} style={{ borderBottom: i < filteredData.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '14px', fontWeight: 500, color: '#22c55e' }}>{item.id}</td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 600 }}>{item.name.charAt(0)}</div>
                    <span style={{ fontWeight: 500, color: colors.text }}>{item.name}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: `${departmentColors[item.department]}20`, color: departmentColors[item.department] }}>{t(`payroll.${item.department}`)}</span>
                </td>
                <td style={{ padding: '14px 16px', fontSize: '14px', color: colors.textMuted }}>{item.position}</td>
                <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', color: colors.text }}>{formatCurrency(item.baseSalary)}</td>
                <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', color: '#22c55e' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                    <TrendingUp style={{ width: '14px', height: '14px' }} />+{formatCurrency(item.bonus)}
                  </div>
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', color: '#ef4444' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                    <TrendingDown style={{ width: '14px', height: '14px' }} />-{formatCurrency(item.deductions)}
                  </div>
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: colors.text }}>{formatCurrency(item.netSalary)}</td>
                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: item.status === 'paid' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: item.status === 'paid' ? '#22c55e' : '#f59e0b' }}>
                    {item.status === 'paid' ? <CheckCircle style={{ width: '14px', height: '14px' }} /> : <Clock style={{ width: '14px', height: '14px' }} />}
                    {t(`payroll.${item.status}`)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: '16px', borderTop: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(34, 197, 94, 0.05)' }}>
          <span style={{ fontSize: '14px', color: colors.textMuted }}>{t('common.showing')} {filteredData.length} {t('common.of')} {payrollData.length} {t('common.items')}</span>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '12px', color: colors.textMuted }}>{t('payroll.totalPayroll')}</p>
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#22c55e' }}>{formatCurrency(filteredData.reduce((s, i) => s + i.netSalary, 0))}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
