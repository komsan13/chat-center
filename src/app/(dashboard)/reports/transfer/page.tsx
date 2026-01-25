'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Plus, Search, Edit2, Trash2, ArrowLeft, Filter, ArrowLeftRight, Save, RefreshCw, Building2, Clock, CheckCircle, Globe, Banknote, FileText, ArrowRight, X, Sparkles, AlertTriangle, XOctagon } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { DeleteConfirmModal, ToastContainer, useToast } from '@/components/ui';

interface Transfer {
  id: string;
  date: string;
  websiteId: string;
  websiteName: string;
  fromBankId: string;
  fromBankName: string;
  fromAccountNumber: string;
  toBankId: string;
  toBankName: string;
  toAccountNumber: string;
  amount: number;
  note: string;
  status: string;
  createdAt: string;
}

interface Bank {
  id: string;
  type: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

interface Website {
  id: string;
  name: string;
}

// เพิ่ม "เงินสด" เป็นตัวเลือกพิเศษสำหรับ "จากบัญชี" (ไว้คำนวณหักลบ)
const CASH_OPTION = {
  id: 'cash',
  type: 'cash',
  bankName: 'เงินสด',
  accountNumber: '-',
  accountName: 'เงินสดในมือ',
};

// เพิ่ม "โยกเข้าลูกค้า" เป็นตัวเลือกพิเศษสำหรับ "ไปยังบัญชี"
const CUSTOMER_OPTION = {
  id: 'customer',
  type: 'customer',
  bankName: 'โยกเข้าลูกค้า',
  accountNumber: '-',
  accountName: 'โยกเงินเข้าลูกค้า',
};

export default function TransferPage() {
  const [transferData, setTransferData] = useState<Transfer[]>([]);
  const [banksList, setBanksList] = useState<Bank[]>([]);
  const [websitesList, setWebsitesList] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Transfer | null>(null);
  const [deletingItem, setDeletingItem] = useState<Transfer | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    websiteId: '',
    fromBankId: '',
    toBankId: '',
    amount: '',
    note: '',
    status: 'pending',
  });
  const { toasts, removeToast, success: showSuccess, error: showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ date?: string; fromBankId?: string; toBankId?: string; amount?: string }>({});
  const { language } = useLanguage();
  const { isDark } = useTheme();

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (selectedDate) params.append('date', selectedDate);
      
      const response = await fetch(`/api/transfer?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        setTransferData(result.data);
      } else {
        showError('Error', result.error || 'Failed to load data');
      }
    } catch {
      showError('Error', 'Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus, selectedDate, showError]);

  // Fetch banks
  const fetchBanks = useCallback(async () => {
    try {
      const response = await fetch('/api/banks');
      const result = await response.json();
      if (result.success) {
        setBanksList(result.data);
      }
    } catch {
      console.error('Failed to fetch banks');
    }
  }, []);

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
    fetchBanks();
    fetchWebsites();
  }, [fetchData, fetchBanks, fetchWebsites]);

  // Form validation
  const validateForm = () => {
    const errors: { date?: string; fromBankId?: string; toBankId?: string; amount?: string } = {};
    if (!formData.date) {
      errors.date = language === 'th' ? 'กรุณาเลือกวันที่' : 'Date is required';
    }
    if (!formData.fromBankId) {
      errors.fromBankId = language === 'th' ? 'กรุณาเลือกบัญชีต้นทาง' : 'From account is required';
    }
    if (!formData.toBankId) {
      errors.toBankId = language === 'th' ? 'กรุณาเลือกบัญชีปลายทาง' : 'To account is required';
    }
    if (formData.fromBankId && formData.toBankId && formData.fromBankId === formData.toBankId) {
      errors.toBankId = language === 'th' ? 'บัญชีต้นทางและปลายทางต้องไม่ซ้ำกัน' : 'From and To accounts must be different';
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      errors.amount = language === 'th' ? 'กรุณาระบุจำนวนเงิน' : 'Amount is required';
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

  const filteredData = transferData.filter(item => {
    if (searchTerm && 
      !item.fromBankName.toLowerCase().includes(searchTerm.toLowerCase()) && 
      !item.toBankName.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !(item.note && item.note.toLowerCase().includes(searchTerm.toLowerCase()))
    ) return false;
    return true;
  });

  // Stats
  const totalAmount = transferData.reduce((sum, item) => sum + item.amount, 0);
  const pendingCount = transferData.filter(item => item.status === 'pending').length;
  const completedCount = transferData.filter(item => item.status === 'completed').length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // รวม banks กับ options พิเศษ
  const fromBankOptions = [CASH_OPTION, ...banksList]; // จากบัญชี: มี "เงินสด"
  const toBankOptions = [CUSTOMER_OPTION, ...banksList]; // ไปยังบัญชี: มี "โยกเข้าลูกค้า"

  const getSelectedFromBank = () => {
    return fromBankOptions.find(b => b.id === formData.fromBankId);
  };

  const getSelectedToBank = () => {
    return toBankOptions.find(b => b.id === formData.toBankId);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      websiteId: '',
      fromBankId: '',
      toBankId: '',
      amount: '',
      note: '',
      status: 'pending',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (item: Transfer) => {
    setEditingItem(item);
    setFormData({
      date: item.date,
      websiteId: item.websiteId || '',
      fromBankId: item.fromBankId,
      toBankId: item.toBankId,
      amount: item.amount.toString(),
      note: item.note || '',
      status: item.status,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openDeleteModal = (item: Transfer) => {
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
    const selectedFromBank = getSelectedFromBank();
    const selectedToBank = getSelectedToBank();
    const selectedWebsite = websitesList.find(w => w.id === formData.websiteId);

    try {
      const payload = {
        ...formData,
        websiteName: selectedWebsite?.name || '',
        fromBankName: selectedFromBank?.bankName || '',
        fromAccountNumber: selectedFromBank?.accountNumber || '',
        toBankName: selectedToBank?.bankName || '',
        toAccountNumber: selectedToBank?.accountNumber || '',
      };

      if (editingItem) {
        const response = await fetch(`/api/transfer/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (result.success) {
          await fetchData();
          showSuccess(
            language === 'th' ? 'แก้ไขสำเร็จ!' : 'Updated Successfully!',
            language === 'th' ? 'ข้อมูลโยกเงินถูกแก้ไขเรียบร้อยแล้ว' : 'Transfer has been updated'
          );
          setIsModalOpen(false);
        } else {
          showError(
            language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error',
            result.error || (language === 'th' ? 'ไม่สามารถแก้ไขข้อมูลได้' : 'Failed to update')
          );
        }
      } else {
        const response = await fetch('/api/transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (result.success) {
          await fetchData();
          showSuccess(
            language === 'th' ? 'เพิ่มสำเร็จ!' : 'Added Successfully!',
            language === 'th' ? 'ข้อมูลโยกเงินถูกเพิ่มเรียบร้อยแล้ว' : 'Transfer has been added'
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
      const response = await fetch(`/api/transfer/${deletingItem.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        await fetchData();
        setIsDeleteModalOpen(false);
        setDeletingItem(null);
        showSuccess(
          language === 'th' ? 'ลบสำเร็จ!' : 'Deleted Successfully!',
          language === 'th' ? 'ข้อมูลโยกเงินถูกลบเรียบร้อยแล้ว' : 'Transfer has been deleted'
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
              {language === 'th' ? 'โยกเงิน' : 'Transfer'}
            </h1>
            <p style={{ fontSize: '14px', color: colors.textMuted, margin: 0 }}>
              {language === 'th' ? 'จัดการรายการโยกเงินระหว่างบัญชี' : 'Manage fund transfers between accounts'}
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
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
            }}
          >
            <Plus style={{ width: '18px', height: '18px' }} />
            <span>{language === 'th' ? 'โยกเงิน' : 'New Transfer'}</span>
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
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ArrowLeftRight style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>{language === 'th' ? 'ยอดโยกรวม' : 'Total Transfer'}</p>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6', margin: 0 }}>฿{formatCurrency(totalAmount)}</p>
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
              background: 'rgba(251, 191, 36, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Clock style={{ width: '20px', height: '20px', color: '#fbbf24' }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>{language === 'th' ? 'รอดำเนินการ' : 'Pending'}</p>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#fbbf24', margin: 0 }}>{pendingCount}</p>
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
              background: 'rgba(34, 197, 94, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CheckCircle style={{ width: '20px', height: '20px', color: '#22c55e' }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>{language === 'th' ? 'สำเร็จ' : 'Completed'}</p>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#22c55e', margin: 0 }}>{completedCount}</p>
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
            placeholder={language === 'th' ? 'ค้นหาธนาคาร, หมายเหตุ...' : 'Search bank, note...'}
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
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
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
            <option value="all">{language === 'th' ? 'ทุกสถานะ' : 'All Status'}</option>
            <option value="pending">{language === 'th' ? 'รอดำเนินการ' : 'Pending'}</option>
            <option value="completed">{language === 'th' ? 'สำเร็จ' : 'Completed'}</option>
          </select>
          {(selectedDate || selectedStatus !== 'all') && (
            <button
              onClick={() => {
                setSelectedDate('');
                setSelectedStatus('all');
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
                language === 'th' ? 'วันที่' : 'Date',
                language === 'th' ? 'เว็บไซต์' : 'Website',
                language === 'th' ? 'จากบัญชี' : 'From',
                language === 'th' ? 'ไปยังบัญชี' : 'To',
                language === 'th' ? 'จำนวนเงิน' : 'Amount',
                language === 'th' ? 'หมายเหตุ' : 'Note',
                language === 'th' ? 'สถานะ' : 'Status',
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
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((j) => (
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
                <td colSpan={8} style={{ padding: '60px 16px', textAlign: 'center' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '20px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                  }}>
                    <ArrowLeftRight style={{ width: '40px', height: '40px', color: '#3b82f6' }} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: colors.text, margin: '0 0 8px 0' }}>
                    {transferData.length === 0
                      ? (language === 'th' ? 'ยังไม่มีรายการโยกเงิน' : 'No transfers yet')
                      : (language === 'th' ? 'ไม่พบข้อมูล' : 'No results found')
                    }
                  </h3>
                  <p style={{ fontSize: '14px', color: colors.textMuted, margin: 0 }}>
                    {transferData.length === 0
                      ? (language === 'th' ? 'เริ่มต้นด้วยการโยกเงินรายการแรก' : 'Get started by creating your first transfer')
                      : (language === 'th' ? 'ลองค้นหาด้วยคำอื่น' : 'Try a different search term')
                    }
                  </p>
                  {transferData.length === 0 && (
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
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
                      }}
                    >
                      <Plus style={{ width: '18px', height: '18px' }} />
                      {language === 'th' ? 'โยกเงิน' : 'New Transfer'}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar style={{ width: '16px', height: '16px', color: colors.textMuted }} />
                    <span style={{ fontSize: '14px', fontWeight: 500, color: colors.text }}>{formatDate(item.date)}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  {item.websiteName ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Globe style={{ width: '16px', height: '16px', color: '#8b5cf6' }} />
                      <span style={{ fontSize: '14px', fontWeight: 500, color: colors.text }}>{item.websiteName}</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '13px', color: colors.textFaded }}>-</span>
                  )}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.fromBankId === 'cash' ? (
                      <Banknote style={{ width: '16px', height: '16px', color: '#22c55e' }} />
                    ) : (
                      <Building2 style={{ width: '16px', height: '16px', color: '#ef4444' }} />
                    )}
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: colors.text, margin: 0 }}>{item.fromBankName}</p>
                      {item.fromAccountNumber && item.fromAccountNumber !== '-' && (
                        <p style={{ fontSize: '11px', color: colors.textMuted, margin: '2px 0 0 0', fontFamily: 'monospace' }}>{item.fromAccountNumber}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ArrowRight style={{ width: '14px', height: '14px', color: colors.textMuted }} />
                    {item.toBankId === 'cash' ? (
                      <Banknote style={{ width: '16px', height: '16px', color: '#22c55e' }} />
                    ) : (
                      <Building2 style={{ width: '16px', height: '16px', color: '#3b82f6' }} />
                    )}
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: colors.text, margin: 0 }}>{item.toBankName}</p>
                      {item.toAccountNumber && item.toAccountNumber !== '-' && (
                        <p style={{ fontSize: '11px', color: colors.textMuted, margin: '2px 0 0 0', fontFamily: 'monospace' }}>{item.toAccountNumber}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#3b82f6', fontFamily: 'monospace' }}>
                    ฿{formatCurrency(item.amount)}
                  </span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  {item.note ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText style={{ width: '14px', height: '14px', color: colors.textMuted }} />
                      <span style={{ fontSize: '13px', color: colors.text, maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.note}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '13px', color: colors.textFaded }}>-</span>
                  )}
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
                    background: item.status === 'completed' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                    color: item.status === 'completed' ? '#22c55e' : '#fbbf24',
                  }}>
                    {item.status === 'completed' ? (
                      <CheckCircle style={{ width: '14px', height: '14px' }} />
                    ) : (
                      <Clock style={{ width: '14px', height: '14px' }} />
                    )}
                    {item.status === 'completed' 
                      ? (language === 'th' ? 'สำเร็จ' : 'Completed')
                      : (language === 'th' ? 'รอดำเนินการ' : 'Pending')
                    }
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
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: colors.overlay,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(8px)',
          padding: '20px',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '550px',
            maxHeight: '90vh',
            background: colors.modalBg,
            borderRadius: '24px',
            border: `1px solid ${colors.border}`,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '24px 28px',
              borderBottom: `1px solid ${colors.border}`,
              background: isDark
                ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, transparent 100%)'
                : 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, transparent 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)',
                }}>
                  {editingItem ? (
                    <Edit2 style={{ width: '24px', height: '24px', color: '#fff' }} />
                  ) : (
                    <ArrowLeftRight style={{ width: '24px', height: '24px', color: '#fff' }} />
                  )}
                </div>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: colors.text, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {editingItem
                      ? (language === 'th' ? 'แก้ไขรายการ' : 'Edit Transfer')
                      : (language === 'th' ? 'โยกเงิน' : 'New Transfer')
                    }
                    {!editingItem && <Sparkles style={{ width: '18px', height: '18px', color: '#3b82f6' }} />}
                  </h2>
                  <p style={{ fontSize: '14px', color: colors.textMuted, margin: '4px 0 0 0' }}>
                    {editingItem
                      ? (language === 'th' ? 'แก้ไขข้อมูลการโยกเงิน' : 'Update transfer details')
                      : (language === 'th' ? 'กรอกข้อมูลการโยกเงิน' : 'Fill in transfer details')
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  border: 'none',
                  background: colors.inputBg,
                  color: colors.textMuted,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
              {/* Date */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>
                  {language === 'th' ? 'วันที่' : 'Date'} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Calendar style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '18px',
                    height: '18px',
                    color: formData.date ? '#3b82f6' : colors.textInput,
                    pointerEvents: 'none',
                  }} />
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => {
                      setFormData({ ...formData, date: e.target.value });
                      if (formErrors.date) setFormErrors({ ...formErrors, date: undefined });
                    }}
                    style={{
                      width: '100%',
                      height: '52px',
                      paddingLeft: '46px',
                      paddingRight: '16px',
                      borderRadius: '12px',
                      border: `2px solid ${formErrors.date ? '#ef4444' : colors.border}`,
                      background: colors.inputBg,
                      color: colors.text,
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
                {formErrors.date && (
                  <p style={{ fontSize: '12px', color: '#ef4444', margin: '8px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle style={{ width: '14px', height: '14px' }} />
                    {formErrors.date}
                  </p>
                )}
              </div>

              {/* Website Selection */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>
                  {language === 'th' ? 'เว็บไซต์' : 'Website'}
                </label>
                <div style={{
                  padding: '12px',
                  borderRadius: '12px',
                  border: `2px solid ${colors.border}`,
                  background: colors.inputBg,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}>
                  {websitesList.length === 0 ? (
                    <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>
                      {language === 'th' ? 'ไม่มีเว็บไซต์ในระบบ' : 'No websites available'}
                    </p>
                  ) : (
                    websitesList.map((website) => {
                      const isSelected = formData.websiteId === website.id;
                      return (
                        <button
                          key={website.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, websiteId: isSelected ? '' : website.id });
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: `2px solid ${isSelected ? '#8b5cf6' : colors.border}`,
                            background: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <Globe style={{ width: '16px', height: '16px', color: isSelected ? '#8b5cf6' : colors.textMuted }} />
                          <span style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? '#8b5cf6' : colors.text }}>
                            {website.name}
                          </span>
                          {isSelected && (
                            <CheckCircle style={{ width: '16px', height: '16px', color: '#8b5cf6' }} />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* From Bank Selection */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>
                  {language === 'th' ? 'จากบัญชี' : 'From Account'} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{
                  padding: '12px',
                  borderRadius: '12px',
                  border: `2px solid ${formErrors.fromBankId ? '#ef4444' : colors.border}`,
                  background: colors.inputBg,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                }}>
                  {fromBankOptions.map((bank) => {
                    const isSelected = formData.fromBankId === bank.id;
                    const isCash = bank.id === 'cash';
                    return (
                      <button
                        key={bank.id}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, fromBankId: bank.id });
                          if (formErrors.fromBankId) setFormErrors({ ...formErrors, fromBankId: undefined });
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          borderRadius: '10px',
                          border: `2px solid ${isSelected ? '#ef4444' : colors.border}`,
                          background: isSelected ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: isSelected 
                            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
                            : isCash ? 'rgba(34, 197, 94, 0.15)' : colors.cardBg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {isCash ? (
                            <Banknote style={{ width: '18px', height: '18px', color: isSelected ? '#fff' : '#22c55e' }} />
                          ) : (
                            <Building2 style={{ width: '18px', height: '18px', color: isSelected ? '#fff' : colors.textMuted }} />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: isSelected ? '#ef4444' : colors.text, margin: 0 }}>
                            {bank.bankName}
                          </p>
                          {!isCash && (
                            <p style={{ fontSize: '12px', color: colors.textMuted, margin: '2px 0 0 0', fontFamily: 'monospace' }}>
                              {bank.accountNumber} • {bank.accountName}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <CheckCircle style={{ width: '20px', height: '20px', color: '#ef4444', flexShrink: 0 }} />
                        )}
                      </button>
                    );
                  })}
                </div>
                {formErrors.fromBankId && (
                  <p style={{ fontSize: '12px', color: '#ef4444', margin: '8px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle style={{ width: '14px', height: '14px' }} />
                    {formErrors.fromBankId}
                  </p>
                )}
              </div>

              {/* To Bank Selection */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>
                  {language === 'th' ? 'ไปยังบัญชี' : 'To Account'} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{
                  padding: '12px',
                  borderRadius: '12px',
                  border: `2px solid ${formErrors.toBankId ? '#ef4444' : colors.border}`,
                  background: colors.inputBg,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                }}>
                  {toBankOptions.map((bank) => {
                    const isSelected = formData.toBankId === bank.id;
                    const isCustomer = bank.id === 'customer';
                    // อนุญาตให้เลือก "โยกเข้าลูกค้า" ได้เสมอ ไม่ว่าจะเลือกเป็นต้นทางแล้วก็ตาม
                    const isDisabled = bank.id !== 'customer' && formData.fromBankId === bank.id;
                    return (
                      <button
                        key={bank.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          if (!isDisabled) {
                            setFormData({ ...formData, toBankId: bank.id });
                            if (formErrors.toBankId) setFormErrors({ ...formErrors, toBankId: undefined });
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          borderRadius: '10px',
                          border: `2px solid ${isSelected ? '#3b82f6' : colors.border}`,
                          background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          textAlign: 'left',
                          width: '100%',
                          transition: 'all 0.2s ease',
                          opacity: isDisabled ? 0.4 : 1,
                        }}
                      >
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: isSelected 
                            ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                            : isCustomer ? 'rgba(139, 92, 246, 0.15)' : colors.cardBg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {isCustomer ? (
                            <Banknote style={{ width: '18px', height: '18px', color: isSelected ? '#fff' : '#8b5cf6' }} />
                          ) : (
                            <Building2 style={{ width: '18px', height: '18px', color: isSelected ? '#fff' : colors.textMuted }} />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: isSelected ? '#3b82f6' : colors.text, margin: 0 }}>
                            {bank.bankName}
                          </p>
                          {!isCustomer && (
                            <p style={{ fontSize: '12px', color: colors.textMuted, margin: '2px 0 0 0', fontFamily: 'monospace' }}>
                              {bank.accountNumber} • {bank.accountName}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <CheckCircle style={{ width: '20px', height: '20px', color: '#3b82f6', flexShrink: 0 }} />
                        )}
                      </button>
                    );
                  })}
                </div>
                {formErrors.toBankId && (
                  <p style={{ fontSize: '12px', color: '#ef4444', margin: '8px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle style={{ width: '14px', height: '14px' }} />
                    {formErrors.toBankId}
                  </p>
                )}
              </div>

              {/* Amount */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>
                  {language === 'th' ? 'จำนวนเงิน (฿)' : 'Amount (฿)'} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Banknote style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '18px',
                    height: '18px',
                    color: '#3b82f6',
                    pointerEvents: 'none',
                  }} />
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => {
                      setFormData({ ...formData, amount: e.target.value });
                      if (formErrors.amount) setFormErrors({ ...formErrors, amount: undefined });
                    }}
                    placeholder="0.00"
                    min="0"
                    style={{
                      width: '100%',
                      height: '52px',
                      paddingLeft: '46px',
                      paddingRight: '16px',
                      borderRadius: '12px',
                      border: `2px solid ${formErrors.amount ? '#ef4444' : colors.border}`,
                      background: colors.inputBg,
                      color: '#3b82f6',
                      fontSize: '16px',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                </div>
                {formErrors.amount && (
                  <p style={{ fontSize: '12px', color: '#ef4444', margin: '8px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle style={{ width: '14px', height: '14px' }} />
                    {formErrors.amount}
                  </p>
                )}
              </div>

              {/* Note */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>
                  {language === 'th' ? 'หมายเหตุ' : 'Note'}
                </label>
                <div style={{ position: 'relative' }}>
                  <FileText style={{
                    position: 'absolute',
                    left: '16px',
                    top: '16px',
                    width: '18px',
                    height: '18px',
                    color: colors.textInput,
                    pointerEvents: 'none',
                  }} />
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder={language === 'th' ? 'ระบุหมายเหตุ (ถ้ามี)' : 'Enter note (optional)'}
                    rows={3}
                    style={{
                      width: '100%',
                      paddingLeft: '46px',
                      paddingRight: '16px',
                      paddingTop: '14px',
                      paddingBottom: '14px',
                      borderRadius: '12px',
                      border: `2px solid ${colors.border}`,
                      background: colors.inputBg,
                      color: colors.text,
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Status */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>
                  {language === 'th' ? 'สถานะ' : 'Status'}
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'pending' })}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '14px',
                      borderRadius: '12px',
                      border: `2px solid ${formData.status === 'pending' ? '#fbbf24' : colors.border}`,
                      background: formData.status === 'pending' ? 'rgba(251, 191, 36, 0.15)' : 'transparent',
                      color: formData.status === 'pending' ? '#fbbf24' : colors.textMuted,
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Clock style={{ width: '18px', height: '18px' }} />
                    {language === 'th' ? 'รอดำเนินการ' : 'Pending'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'completed' })}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '14px',
                      borderRadius: '12px',
                      border: `2px solid ${formData.status === 'completed' ? '#22c55e' : colors.border}`,
                      background: formData.status === 'completed' ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                      color: formData.status === 'completed' ? '#22c55e' : colors.textMuted,
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <CheckCircle style={{ width: '18px', height: '18px' }} />
                    {language === 'th' ? 'สำเร็จ' : 'Completed'}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 28px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              flexShrink: 0,
            }}>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                style={{
                  height: '48px',
                  padding: '0 24px',
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textMuted,
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.5 : 1,
                }}
              >
                {language === 'th' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                style={{
                  height: '48px',
                  padding: '0 28px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
                  opacity: isSubmitting ? 0.8 : 1,
                }}
              >
                {isSubmitting ? (
                  <>
                    <div style={{
                      width: '18px',
                      height: '18px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#ffffff',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                    {language === 'th' ? 'กำลังบันทึก...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save style={{ width: '18px', height: '18px' }} />
                    {language === 'th' ? 'บันทึก' : 'Save'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen && !!deletingItem}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingItem(null);
        }}
        onConfirm={handleDelete}
        title={language === 'th' ? 'ยืนยันการลบข้อมูล' : 'Confirm Deletion'}
        subtitle={language === 'th' ? 'คุณกำลังจะลบรายการโยกเงินนี้' : 'You are about to delete this transfer'}
        itemName={deletingItem ? formatDate(deletingItem.date) : ''}
        itemDetails={deletingItem ? [
          { label: language === 'th' ? 'จาก' : 'From', value: deletingItem.fromBankName, icon: Building2 },
          { label: language === 'th' ? 'ไป' : 'To', value: deletingItem.toBankName, icon: ArrowRight },
          { label: language === 'th' ? 'จำนวน' : 'Amount', value: `฿${formatCurrency(deletingItem.amount)}`, icon: Banknote },
        ] : []}
        warningMessage={language === 'th' ? 'การดำเนินการนี้ไม่สามารถยกเลิกได้' : 'This action cannot be undone'}
        confirmText={language === 'th' ? 'ยืนยันลบ' : 'Delete'}
        cancelText={language === 'th' ? 'ยกเลิก' : 'Cancel'}
        loading={isSubmitting}
      />
    </div>
  );
}
