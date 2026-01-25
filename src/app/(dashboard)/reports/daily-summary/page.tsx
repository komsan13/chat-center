'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Plus, Search, Edit2, Trash2, ArrowLeft, Filter, TrendingUp, TrendingDown, DollarSign, Save, RefreshCw, Globe, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Modal, DeleteConfirmModal, ToastContainer, useToast, FormGroup, TextInput, NumberInput, SelectInput, FormButton, PreviewCard } from '@/components/ui';

interface DailySummary {
  id: string;
  date: string;
  website: string;
  depositAmount: number;
  withdrawalAmount: number;
  netProfit: number;
  createdAt: string;
}

interface Website {
  id: string;
  name: string;
}

export default function DailySummaryPage() {
  const [summaryData, setSummaryData] = useState<DailySummary[]>([]);
  const [websitesList, setWebsitesList] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWebsite, setSelectedWebsite] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DailySummary | null>(null);
  const [deletingItem, setDeletingItem] = useState<DailySummary | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    website: '',
    depositAmount: '',
    withdrawalAmount: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toasts, removeToast, success: showSuccess, error: showError } = useToast();
  const [formErrors, setFormErrors] = useState<{ date?: string; website?: string; depositAmount?: string; withdrawalAmount?: string }>({});
  const { language } = useLanguage();
  const { isDark } = useTheme();

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedWebsite !== 'all') params.append('website', selectedWebsite);
      if (selectedDate) params.append('date', selectedDate);
      
      const response = await fetch(`/api/daily-summary?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        setSummaryData(result.data);
      } else {
        showError('Error', result.error || 'Failed to load data');
      }
    } catch {
      showError('Error', 'Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  }, [selectedWebsite, selectedDate, showError]);

  // Fetch websites
  const fetchWebsites = useCallback(async () => {
    try {
      const response = await fetch('/api/websites');
      const result = await response.json();
      if (result.success) {
        setWebsitesList(result.data);
      }
    } catch {
      console.error('Failed to fetch websites');
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchWebsites();
  }, [fetchData, fetchWebsites]);

  // Form validation
  const validateForm = () => {
    const errors: { date?: string; website?: string; depositAmount?: string; withdrawalAmount?: string } = {};
    if (!formData.date) {
      errors.date = language === 'th' ? 'กรุณาเลือกวันที่' : 'Date is required';
    }
    if (!formData.website) {
      errors.website = language === 'th' ? 'กรุณาเลือกเว็บไซต์' : 'Website is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const colors = {
    cardBg: isDark ? '#23262B' : '#ffffff',
    inputBg: isDark ? '#1D1E24' : '#f8fafc',
    border: isDark ? '#2A313C' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#1e293b',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b',
    textFaded: isDark ? 'rgba(255, 255, 255, 0.5)' : '#94a3b8',
    textInput: isDark ? 'rgba(255, 255, 255, 0.4)' : '#94a3b8',
    modalBg: isDark ? '#1D1E24' : '#ffffff',
    overlay: 'rgba(0, 0, 0, 0.6)',
  };

  const filteredData = summaryData.filter(item => {
    if (searchTerm && !item.website.toLowerCase().includes(searchTerm.toLowerCase()) && !item.date.includes(searchTerm)) return false;
    return true;
  });

  // Stats
  const totalDeposit = summaryData.reduce((sum, item) => sum + item.depositAmount, 0);
  const totalWithdrawal = summaryData.reduce((sum, item) => sum + item.withdrawalAmount, 0);
  const totalProfit = summaryData.reduce((sum, item) => sum + item.netProfit, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Calculate net profit from form
  const calculatedProfit = (parseFloat(formData.depositAmount) || 0) - (parseFloat(formData.withdrawalAmount) || 0);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      website: '',
      depositAmount: '',
      withdrawalAmount: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (item: DailySummary) => {
    setEditingItem(item);
    setFormData({
      date: item.date,
      website: item.website,
      depositAmount: item.depositAmount.toString(),
      withdrawalAmount: item.withdrawalAmount.toString(),
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openDeleteModal = (item: DailySummary) => {
    setDeletingItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showError(
        language === 'th' ? 'ข้อมูลไม่ถูกต้อง' : 'Invalid Data',
        language === 'th' ? 'กรุณาตรวจสอบข้อมูลที่กรอก' : 'Please check your input'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingItem) {
        const response = await fetch(`/api/daily-summary/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (result.success) {
          await fetchData();
          showSuccess(
            language === 'th' ? 'แก้ไขสำเร็จ!' : 'Updated Successfully!',
            language === 'th' ? 'ข้อมูลสรุปรายวันถูกแก้ไขเรียบร้อยแล้ว' : 'Daily summary has been updated'
          );
          setIsModalOpen(false);
        } else {
          showError(
            language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error',
            result.error || (language === 'th' ? 'ไม่สามารถแก้ไขข้อมูลได้' : 'Failed to update')
          );
        }
      } else {
        const response = await fetch('/api/daily-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (result.success) {
          await fetchData();
          showSuccess(
            language === 'th' ? 'เพิ่มสำเร็จ!' : 'Added Successfully!',
            language === 'th' ? 'ข้อมูลสรุปรายวันถูกเพิ่มเรียบร้อยแล้ว' : 'Daily summary has been added'
          );
          setIsModalOpen(false);
        } else {
          showError(
            language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error',
            result.error || (language === 'th' ? 'ไม่สามารถเพิ่มข้อมูลได้' : 'Failed to add')
          );
        }
      }
    } catch {
      showError(
        language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error Occurred',
        language === 'th' ? 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง' : 'Failed to save data. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/daily-summary/${deletingItem.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        await fetchData();
        setIsDeleteModalOpen(false);
        setDeletingItem(null);
        showSuccess(
          language === 'th' ? 'ลบสำเร็จ!' : 'Deleted Successfully!',
          language === 'th' ? 'ข้อมูลสรุปรายวันถูกลบเรียบร้อยแล้ว' : 'Daily summary has been deleted'
        );
      } else {
        showError(
          language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error',
          result.error || (language === 'th' ? 'ไม่สามารถลบข้อมูลได้' : 'Failed to delete')
        );
      }
    } catch {
      showError(
        language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error Occurred',
        language === 'th' ? 'ไม่สามารถลบข้อมูลได้ กรุณาลองใหม่อีกครั้ง' : 'Failed to delete data. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            href="/"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: colors.cardBg,
              border: `1px solid ${colors.border}`,
              color: colors.textMuted,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft style={{ width: '20px', height: '20px' }} />
          </Link>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: colors.text, margin: 0 }}>
              {language === 'th' ? 'สรุปรายวัน' : 'Daily Summary'}
            </h1>
            <p style={{ fontSize: '14px', color: colors.textMuted, margin: 0 }}>
              {language === 'th' ? 'จัดการข้อมูลสรุปยอดรายวัน' : 'Manage daily summary data'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={fetchData}
            disabled={isLoading}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: colors.cardBg,
              color: colors.textMuted,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={language === 'th' ? 'รีเฟรชข้อมูล' : 'Refresh data'}
          >
            <RefreshCw style={{
              width: '18px',
              height: '18px',
              animation: isLoading ? 'spin 1s linear infinite' : 'none',
            }} />
          </button>
          <button
            onClick={openAddModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)',
            }}
          >
            <Plus style={{ width: '18px', height: '18px' }} />
            <span>{language === 'th' ? 'เพิ่มรายการ' : 'Add Entry'}</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <div style={{
          background: colors.cardBg,
          borderRadius: '12px',
          padding: '16px',
          border: `1px solid ${colors.border}`,
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
              <TrendingUp style={{ width: '20px', height: '20px', color: '#22c55e' }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>{language === 'th' ? 'ยอดฝากรวม' : 'Total Deposit'}</p>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#22c55e', margin: 0 }}>฿{formatCurrency(totalDeposit)}</p>
            </div>
          </div>
        </div>
        <div style={{
          background: colors.cardBg,
          borderRadius: '12px',
          padding: '16px',
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <TrendingDown style={{ width: '20px', height: '20px', color: '#ef4444' }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>{language === 'th' ? 'ยอดถอนรวม' : 'Total Withdrawal'}</p>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444', margin: 0 }}>฿{formatCurrency(totalWithdrawal)}</p>
            </div>
          </div>
        </div>
        <div style={{
          background: colors.cardBg,
          borderRadius: '12px',
          padding: '16px',
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: totalProfit >= 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <DollarSign style={{ width: '20px', height: '20px', color: totalProfit >= 0 ? '#3b82f6' : '#ef4444' }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>{language === 'th' ? 'กำไรสุทธิรวม' : 'Total Net Profit'}</p>
              <p style={{ fontSize: '20px', fontWeight: 700, color: totalProfit >= 0 ? '#3b82f6' : '#ef4444', margin: 0 }}>
                {totalProfit >= 0 ? '+' : ''}฿{formatCurrency(totalProfit)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px',
        background: colors.cardBg,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
      }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '18px',
            height: '18px',
            color: colors.textInput
          }} />
          <input
            type="text"
            placeholder={language === 'th' ? 'ค้นหาเว็บไซต์, วันที่...' : 'Search website, date...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              height: '42px',
              paddingLeft: '44px',
              paddingRight: '16px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: colors.inputBg,
              color: colors.text,
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter style={{ width: '18px', height: '18px', color: colors.textInput }} />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              height: '42px',
              padding: '0 16px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: colors.inputBg,
              color: colors.text,
              fontSize: '14px',
              cursor: 'pointer',
              outline: 'none',
            }}
          />
          <select
            value={selectedWebsite}
            onChange={(e) => setSelectedWebsite(e.target.value)}
            style={{
              height: '42px',
              padding: '0 16px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: colors.inputBg,
              color: colors.text,
              fontSize: '14px',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">{language === 'th' ? 'ทุกเว็บไซต์' : 'All Websites'}</option>
            {websitesList.map(w => (
              <option key={w.id} value={w.name}>{w.name}</option>
            ))}
          </select>
          {(selectedDate || selectedWebsite !== 'all') && (
            <button
              onClick={() => {
                setSelectedDate('');
                setSelectedWebsite('all');
              }}
              style={{
                height: '42px',
                padding: '0 16px',
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                background: colors.inputBg,
                color: colors.textMuted,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              {language === 'th' ? 'ล้าง' : 'Clear'}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: colors.cardBg,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
              {[
                'ID',
                language === 'th' ? 'วันที่' : 'Date',
                language === 'th' ? 'เว็บไซต์' : 'Website',
                language === 'th' ? 'ยอดฝาก' : 'Deposit',
                language === 'th' ? 'ยอดถอน' : 'Withdrawal',
                language === 'th' ? 'กำไรสุทธิ' : 'Net Profit',
                language === 'th' ? 'จัดการ' : 'Actions'
              ].map((header) => (
                <th key={header} style={{
                  padding: '14px 16px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: colors.textFaded,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  background: colors.inputBg,
                }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Loading State */}
            {isLoading && (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                      <td key={j} style={{ padding: '14px 16px' }}>
                        <div style={{ width: '80px', height: '20px', borderRadius: '4px', background: colors.inputBg, animation: 'pulse 1.5s infinite' }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )}

            {/* Empty State */}
            {!isLoading && filteredData.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '60px 16px', textAlign: 'center' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '20px',
                    background: 'rgba(34, 197, 94, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                  }}>
                    <BarChart3 style={{ width: '40px', height: '40px', color: '#22c55e' }} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: colors.text, margin: '0 0 8px 0' }}>
                    {summaryData.length === 0
                      ? (language === 'th' ? 'ยังไม่มีข้อมูลสรุปรายวัน' : 'No daily summary yet')
                      : (language === 'th' ? 'ไม่พบข้อมูล' : 'No results found')
                    }
                  </h3>
                  <p style={{ fontSize: '14px', color: colors.textMuted, margin: 0 }}>
                    {summaryData.length === 0
                      ? (language === 'th' ? 'เริ่มต้นด้วยการเพิ่มรายการแรก' : 'Get started by adding your first entry')
                      : (language === 'th' ? 'ลองค้นหาด้วยคำอื่น' : 'Try a different search term')
                    }
                  </p>
                  {summaryData.length === 0 && (
                    <button
                      onClick={openAddModal}
                      style={{
                        marginTop: '20px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 24px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)',
                      }}
                    >
                      <Plus style={{ width: '18px', height: '18px' }} />
                      {language === 'th' ? 'เพิ่มรายการ' : 'Add Entry'}
                    </button>
                  )}
                </td>
              </tr>
            )}

            {/* Data Rows */}
            {!isLoading && filteredData.map((item, index) => (
              <tr key={item.id} style={{
                borderBottom: index < filteredData.length - 1 ? `1px solid ${colors.border}` : 'none',
              }}>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontSize: '12px', color: colors.textFaded, fontFamily: 'monospace' }}>
                    {item.id.slice(0, 12)}...
                  </span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar style={{ width: '16px', height: '16px', color: colors.textMuted }} />
                    <span style={{ fontSize: '14px', fontWeight: 500, color: colors.text }}>{formatDate(item.date)}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    background: 'rgba(34, 197, 94, 0.1)',
                    color: '#22c55e',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                  }}>
                    <Globe style={{ width: '14px', height: '14px' }} />
                    {item.website}
                  </span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#22c55e', fontFamily: 'monospace' }}>
                    +฿{formatCurrency(item.depositAmount)}
                  </span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#ef4444', fontFamily: 'monospace' }}>
                    -฿{formatCurrency(item.withdrawalAmount)}
                  </span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    background: item.netProfit >= 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: item.netProfit >= 0 ? '#3b82f6' : '#ef4444',
                  }}>
                    {item.netProfit >= 0 ? '+' : ''}฿{formatCurrency(item.netProfit)}
                  </span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => openEditModal(item)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'rgba(59, 130, 246, 0.15)',
                        color: '#3b82f6',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Edit2 style={{ width: '14px', height: '14px' }} />
                    </button>
                    <button
                      onClick={() => openDeleteModal(item)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#ef4444',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trash2 style={{ width: '14px', height: '14px' }} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? (language === 'th' ? 'แก้ไขสรุปรายวัน' : 'Edit Daily Summary') : (language === 'th' ? 'เพิ่มสรุปรายวันใหม่' : 'Add Daily Summary')}
        subtitle={editingItem
          ? (language === 'th' ? 'แก้ไขข้อมูลสรุปรายวัน' : 'Update daily summary')
          : (language === 'th' ? 'กรอกข้อมูลสรุปรายวัน' : 'Fill in daily summary details')
        }
        icon={editingItem ? Edit2 : Plus}
        iconColor="#22c55e"
        showSparkle={!editingItem}
        maxWidth="500px"
        footer={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', width: '100%' }}>
            <FormButton variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              {language === 'th' ? 'ยกเลิก' : 'Cancel'}
            </FormButton>
            <FormButton variant="primary" onClick={handleSave} loading={isSubmitting} icon={Save}>
              {language === 'th' ? 'บันทึก' : 'Save'}
            </FormButton>
          </div>
        }
      >
        <FormGroup label={language === 'th' ? 'วันที่' : 'Date'} required error={formErrors.date}>
          <TextInput
            type="date"
            icon={Calendar}
            iconColor={formData.date ? '#3b82f6' : undefined}
            value={formData.date}
            onChange={(e) => {
              setFormData({ ...formData, date: e.target.value });
              if (formErrors.date) setFormErrors({ ...formErrors, date: undefined });
            }}
            error={!!formErrors.date}
          />
        </FormGroup>

        <FormGroup label={language === 'th' ? 'เว็บไซต์' : 'Website'} required error={formErrors.website}>
          <SelectInput
            icon={Globe}
            value={formData.website}
            onChange={(e) => {
              setFormData({ ...formData, website: e.target.value });
              if (formErrors.website) setFormErrors({ ...formErrors, website: undefined });
            }}
            placeholder={language === 'th' ? 'เลือกเว็บไซต์' : 'Select Website'}
            options={websitesList.map(w => ({ value: w.name, label: w.name }))}
            error={!!formErrors.website}
          />
        </FormGroup>

        <FormGroup label={language === 'th' ? 'ยอดฝาก (฿)' : 'Deposit Amount (฿)'}>
          <NumberInput
            icon={TrendingUp}
            iconColor="#22c55e"
            value={formData.depositAmount}
            onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
            placeholder="0.00"
            min={0}
            step={0.01}
            highlight="positive"
          />
        </FormGroup>

        <FormGroup label={language === 'th' ? 'ยอดถอน (฿)' : 'Withdrawal Amount (฿)'}>
          <NumberInput
            icon={TrendingDown}
            iconColor="#ef4444"
            value={formData.withdrawalAmount}
            onChange={(e) => setFormData({ ...formData, withdrawalAmount: e.target.value })}
            placeholder="0.00"
            min={0}
            step={0.01}
            highlight="negative"
          />
        </FormGroup>

        <PreviewCard
          label={language === 'th' ? 'กำไรสุทธิ' : 'Net Profit'}
          sublabel={language === 'th' ? 'คำนวณอัตโนมัติ: ยอดฝาก - ยอดถอน' : 'Auto calculated: Deposit - Withdrawal'}
          value={`${calculatedProfit >= 0 ? '+' : ''}฿${formatCurrency(calculatedProfit)}`}
          icon={DollarSign}
          variant={calculatedProfit >= 0 ? 'info' : 'negative'}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen && !!deletingItem}
        onClose={() => { setIsDeleteModalOpen(false); setDeletingItem(null); }}
        onConfirm={handleDelete}
        title={language === 'th' ? 'ยืนยันการลบข้อมูล' : 'Confirm Deletion'}
        subtitle={language === 'th' ? 'คุณกำลังจะลบข้อมูลสรุปรายวัน' : 'You are about to delete this daily summary'}
        itemName={deletingItem?.website || ''}
        itemDetails={deletingItem ? [
          { label: language === 'th' ? 'วันที่' : 'Date', value: formatDate(deletingItem.date), icon: Calendar },
          { label: language === 'th' ? 'ฝาก' : 'Deposit', value: `฿${formatCurrency(deletingItem.depositAmount)}`, icon: TrendingUp },
          { label: language === 'th' ? 'ถอน' : 'Withdrawal', value: `฿${formatCurrency(deletingItem.withdrawalAmount)}`, icon: TrendingDown },
        ] : []}
        warningMessage={language === 'th' ? 'การดำเนินการนี้ไม่สามารถยกเลิกได้' : 'This action cannot be undone'}
        confirmText={language === 'th' ? 'ยืนยันลบ' : 'Delete'}
        cancelText={language === 'th' ? 'ยกเลิก' : 'Cancel'}
        loading={isSubmitting}
      />
    </div>
  );
}
