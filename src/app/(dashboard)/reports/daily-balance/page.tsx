'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Plus, Search, Edit2, Trash2, ArrowLeft, Filter, Save, RefreshCw, Building2, Globe, Banknote, PiggyBank, Wallet, X, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Modal, DeleteConfirmModal, ToastContainer, useToast, FormGroup, TextInput, NumberInput, SelectInput, FormButton, PreviewCard } from '@/components/ui';

interface DailyBalance {
  id: string;
  date: string;
  websiteId: string;
  websiteName: string;
  bankId: string;
  bankName: string;
  accountNumber: string;
  openingBalance: number;
  closingBalance: number;
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

interface FormItem {
  tempId: string;
  websiteId: string;
  bankId: string;
  openingBalance: string;
  closingBalance: string;
}

export default function DailyBalancePage() {
  const [balanceData, setBalanceData] = useState<DailyBalance[]>([]);
  const [banksList, setBanksList] = useState<Bank[]>([]);
  const [websitesList, setWebsitesList] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedBankFilter, setSelectedBankFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DailyBalance | null>(null);
  const [deletingItem, setDeletingItem] = useState<DailyBalance | null>(null);
  
  // Form for adding multiple items
  const [addDate, setAddDate] = useState(new Date().toISOString().split('T')[0]);
  const [addItems, setAddItems] = useState<FormItem[]>([
    { tempId: '1', websiteId: '', bankId: '', openingBalance: '', closingBalance: '' }
  ]);
  
  // Form for editing single item
  const [editFormData, setEditFormData] = useState({
    date: '',
    websiteId: '',
    bankId: '',
    openingBalance: '',
    closingBalance: '',
  });
  
  const { toasts, removeToast, success: showSuccess, error: showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { language } = useLanguage();
  const { isDark } = useTheme();

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedDate) params.append('date', selectedDate);
      if (selectedBankFilter !== 'all') params.append('bankId', selectedBankFilter);
      
      const response = await fetch(`/api/daily-balance?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        setBalanceData(result.data);
      } else {
        showError('Error', result.error || 'Failed to load data');
      }
    } catch {
      showError('Error', 'Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedBankFilter, showError]);

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

  const filteredData = balanceData.filter(item => {
    if (searchTerm && 
      !item.bankName.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !(item.websiteName && item.websiteName.toLowerCase().includes(searchTerm.toLowerCase()))
    ) return false;
    return true;
  });

  // Stats
  const totalOpeningBalance = balanceData.reduce((sum, item) => sum + item.openingBalance, 0);
  const totalClosingBalance = balanceData.reduce((sum, item) => sum + item.closingBalance, 0);
  const difference = totalClosingBalance - totalOpeningBalance;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Add modal functions
  const openAddModal = () => {
    setAddDate(new Date().toISOString().split('T')[0]);
    setAddItems([{ tempId: '1', websiteId: '', bankId: '', openingBalance: '', closingBalance: '' }]);
    setIsAddModalOpen(true);
  };

  const addNewItem = () => {
    setAddItems(prev => [
      ...prev,
      { tempId: Date.now().toString(), websiteId: '', bankId: '', openingBalance: '', closingBalance: '' }
    ]);
  };

  const removeAddItem = (tempId: string) => {
    if (addItems.length > 1) {
      setAddItems(prev => prev.filter(item => item.tempId !== tempId));
    }
  };

  const updateAddItem = (tempId: string, field: keyof FormItem, value: string) => {
    setAddItems(prev => prev.map(item => 
      item.tempId === tempId ? { ...item, [field]: value } : item
    ));
  };

  const handleAddSave = async () => {
    // Validate
    const validItems = addItems.filter(item => item.bankId);
    if (validItems.length === 0) {
      showError(
        language === 'th' ? 'ข้อมูลไม่ถูกต้อง' : 'Invalid Data',
        language === 'th' ? 'กรุณาเลือกธนาคารอย่างน้อย 1 รายการ' : 'Please select at least 1 bank'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = validItems.map(item => {
        const bank = banksList.find(b => b.id === item.bankId);
        const website = websitesList.find(w => w.id === item.websiteId);
        return {
          date: addDate,
          websiteId: item.websiteId || null,
          websiteName: website?.name || '',
          bankId: item.bankId,
          bankName: bank?.bankName || '',
          accountNumber: bank?.accountNumber || '',
          openingBalance: parseFloat(item.openingBalance) || 0,
          closingBalance: parseFloat(item.closingBalance) || 0,
        };
      });

      const response = await fetch('/api/daily-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        await fetchData();
        setIsAddModalOpen(false);
        showSuccess(
          language === 'th' ? 'เพิ่มสำเร็จ!' : 'Added Successfully!',
          result.message || (language === 'th' ? 'เพิ่มข้อมูลยอดคงเหลือรายวันแล้ว' : 'Daily balance added')
        );
      } else {
        const errorMsg = result.errors?.map((e: { bankName: string; error: string }) => `${e.bankName}: ${e.error}`).join(', ') || result.error;
        showError(
          language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error',
          errorMsg || (language === 'th' ? 'ไม่สามารถเพิ่มข้อมูลได้' : 'Failed to add')
        );
      }
    } catch {
      showError(
        language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error Occurred',
        language === 'th' ? 'ไม่สามารถบันทึกข้อมูลได้' : 'Failed to save data'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit modal functions
  const openEditModal = (item: DailyBalance) => {
    setEditingItem(item);
    setEditFormData({
      date: item.date,
      websiteId: item.websiteId || '',
      bankId: item.bankId,
      openingBalance: item.openingBalance.toString(),
      closingBalance: item.closingBalance.toString(),
    });
    setIsEditModalOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingItem) return;

    if (!editFormData.bankId) {
      showError(
        language === 'th' ? 'ข้อมูลไม่ถูกต้อง' : 'Invalid Data',
        language === 'th' ? 'กรุณาเลือกธนาคาร' : 'Please select a bank'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const bank = banksList.find(b => b.id === editFormData.bankId);
      const website = websitesList.find(w => w.id === editFormData.websiteId);

      const payload = {
        date: editFormData.date,
        websiteId: editFormData.websiteId || null,
        websiteName: website?.name || '',
        bankId: editFormData.bankId,
        bankName: bank?.bankName || '',
        accountNumber: bank?.accountNumber || '',
        openingBalance: parseFloat(editFormData.openingBalance) || 0,
        closingBalance: parseFloat(editFormData.closingBalance) || 0,
      };

      const response = await fetch(`/api/daily-balance/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        await fetchData();
        setIsEditModalOpen(false);
        setEditingItem(null);
        showSuccess(
          language === 'th' ? 'แก้ไขสำเร็จ!' : 'Updated Successfully!',
          language === 'th' ? 'แก้ไขข้อมูลยอดคงเหลือรายวันแล้ว' : 'Daily balance updated'
        );
      } else {
        showError(
          language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error',
          result.error || (language === 'th' ? 'ไม่สามารถแก้ไขข้อมูลได้' : 'Failed to update')
        );
      }
    } catch {
      showError(
        language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error Occurred',
        language === 'th' ? 'ไม่สามารถบันทึกข้อมูลได้' : 'Failed to save data'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete functions
  const openDeleteModal = (item: DailyBalance) => {
    setDeletingItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/daily-balance/${deletingItem.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        await fetchData();
        setIsDeleteModalOpen(false);
        setDeletingItem(null);
        showSuccess(
          language === 'th' ? 'ลบสำเร็จ!' : 'Deleted Successfully!',
          language === 'th' ? 'ลบข้อมูลยอดคงเหลือรายวันแล้ว' : 'Daily balance deleted'
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
        language === 'th' ? 'ไม่สามารถลบข้อมูลได้' : 'Failed to delete data'
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
              {language === 'th' ? 'ยอดคงเหลือรายวัน' : 'Daily Balance'}
            </h1>
            <p style={{ fontSize: '14px', color: colors.textMuted, margin: 0 }}>
              {language === 'th' ? 'จัดการยอดคงเหลือรายวันของแต่ละธนาคาร' : 'Manage daily balance for each bank'}
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
            <span>{language === 'th' ? 'เพิ่มยอดคงเหลือ' : 'Add Balance'}</span>
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
              background: 'rgba(139, 92, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Wallet style={{ width: '20px', height: '20px', color: '#8b5cf6' }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>{language === 'th' ? 'ยอดยกมารวม' : 'Total Opening'}</p>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#8b5cf6', margin: 0 }}>฿{formatCurrency(totalOpeningBalance)}</p>
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
              <PiggyBank style={{ width: '20px', height: '20px', color: '#22c55e' }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>{language === 'th' ? 'ยอดคงเหลือรวม' : 'Total Closing'}</p>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#22c55e', margin: 0 }}>฿{formatCurrency(totalClosingBalance)}</p>
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
              background: difference >= 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Banknote style={{ width: '20px', height: '20px', color: difference >= 0 ? '#22c55e' : '#ef4444' }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>{language === 'th' ? 'ผลต่าง' : 'Difference'}</p>
              <p style={{ fontSize: '20px', fontWeight: 700, color: difference >= 0 ? '#22c55e' : '#ef4444', margin: 0 }}>
                {difference >= 0 ? '+' : ''}฿{formatCurrency(difference)}
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
            placeholder={language === 'th' ? 'ค้นหาธนาคาร, เว็บไซต์...' : 'Search bank, website...'}
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
            value={selectedBankFilter}
            onChange={(e) => setSelectedBankFilter(e.target.value)}
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
            <option value="all">{language === 'th' ? 'ทุกธนาคาร' : 'All Banks'}</option>
            {banksList.map(bank => (
              <option key={bank.id} value={bank.id}>{bank.bankName}</option>
            ))}
          </select>
          {(selectedDate || selectedBankFilter !== 'all') && (
            <button
              onClick={() => {
                setSelectedDate('');
                setSelectedBankFilter('all');
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
                language === 'th' ? 'ธนาคาร' : 'Bank',
                language === 'th' ? 'ยอดยกมา' : 'Opening',
                language === 'th' ? 'ยอดคงเหลือ' : 'Closing',
                language === 'th' ? 'ผลต่าง' : 'Difference',
                language === 'th' ? 'จัดการ' : 'Actions'
              ].map((header, idx) => (
                <th key={header} style={{
                  padding: '14px 16px',
                  textAlign: idx >= 3 && idx <= 5 ? 'right' : 'left',
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
                    <PiggyBank style={{ width: '40px', height: '40px', color: '#22c55e' }} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: colors.text, margin: '0 0 8px 0' }}>
                    {balanceData.length === 0
                      ? (language === 'th' ? 'ยังไม่มีข้อมูลยอดคงเหลือ' : 'No balance data yet')
                      : (language === 'th' ? 'ไม่พบข้อมูล' : 'No results found')
                    }
                  </h3>
                  <p style={{ fontSize: '14px', color: colors.textMuted, margin: 0 }}>
                    {balanceData.length === 0
                      ? (language === 'th' ? 'เริ่มต้นด้วยการเพิ่มยอดคงเหลือรายการแรก' : 'Get started by adding your first balance')
                      : (language === 'th' ? 'ลองค้นหาด้วยคำอื่น' : 'Try a different search term')
                    }
                  </p>
                  {balanceData.length === 0 && (
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
                      {language === 'th' ? 'เพิ่มยอดคงเหลือ' : 'Add Balance'}
                    </button>
                  )}
                </td>
              </tr>
            )}

            {/* Data Rows */}
            {!isLoading && filteredData.map((item, index) => {
              const diff = item.closingBalance - item.openingBalance;
              return (
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
                      <Building2 style={{ width: '16px', height: '16px', color: '#3b82f6' }} />
                      <div>
                        {(() => {
                          // ถ้าเป็น payment ให้แสดงตามภาษา
                          const bank = banksList.find(b => b.id === item.bankId);
                          const isPayment = bank?.type === 'payment' || item.bankName === 'payment' || item.bankName === 'ชำระเงิน';
                          const displayBankName = isPayment ? (language === 'th' ? 'ชำระเงิน' : 'Payment') : item.bankName;
                          const displayText = isPayment ? bank?.accountName : item.accountNumber;
                          return (
                            <>
                              <p style={{ fontSize: '14px', fontWeight: 500, color: colors.text, margin: 0 }}>{displayBankName}</p>
                              {displayText && (
                                <p style={{ fontSize: '11px', color: colors.textMuted, margin: '2px 0 0 0', fontFamily: isPayment ? 'inherit' : 'monospace' }}>{displayText}</p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#8b5cf6', fontFamily: 'monospace' }}>
                      ฿{formatCurrency(item.openingBalance)}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#22c55e', fontFamily: 'monospace' }}>
                      ฿{formatCurrency(item.closingBalance)}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: diff >= 0 ? '#22c55e' : '#ef4444',
                      fontFamily: 'monospace'
                    }}>
                      {diff >= 0 ? '+' : ''}฿{formatCurrency(diff)}
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
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Modal - Multiple Items */}
      {isAddModalOpen && (
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
            maxWidth: '700px',
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
                ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, transparent 100%)'
                : 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, transparent 100%)',
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
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 20px rgba(34, 197, 94, 0.3)',
                }}>
                  <PiggyBank style={{ width: '24px', height: '24px', color: '#fff' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: colors.text, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {language === 'th' ? 'เพิ่มยอดคงเหลือรายวัน' : 'Add Daily Balance'}
                    <Sparkles style={{ width: '18px', height: '18px', color: '#22c55e' }} />
                  </h2>
                  <p style={{ fontSize: '14px', color: colors.textMuted, margin: '4px 0 0 0' }}>
                    {language === 'th' ? 'สามารถเพิ่มได้หลายรายการพร้อมกัน' : 'Can add multiple items at once'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
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
              {/* Date Selection */}
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
                    color: '#22c55e',
                    pointerEvents: 'none',
                  }} />
                  <input
                    type="date"
                    value={addDate}
                    onChange={(e) => setAddDate(e.target.value)}
                    style={{
                      width: '100%',
                      height: '52px',
                      paddingLeft: '46px',
                      paddingRight: '16px',
                      borderRadius: '12px',
                      border: `2px solid ${colors.border}`,
                      background: colors.inputBg,
                      color: colors.text,
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Items */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>
                    {language === 'th' ? 'รายการยอดคงเหลือ' : 'Balance Items'} ({addItems.length})
                  </label>
                  <button
                    onClick={addNewItem}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: 'transparent',
                      color: '#22c55e',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Plus style={{ width: '16px', height: '16px' }} />
                    {language === 'th' ? 'เพิ่มรายการ' : 'Add Item'}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {addItems.map((item, idx) => (
                    <div key={item.tempId} style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: `1px solid ${colors.border}`,
                      background: colors.inputBg,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: colors.textMuted }}>
                          #{idx + 1}
                        </span>
                        {addItems.length > 1 && (
                          <button
                            onClick={() => removeAddItem(item.tempId)}
                            style={{
                              width: '28px',
                              height: '28px',
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
                            <X style={{ width: '14px', height: '14px' }} />
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {/* Website */}
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: colors.textMuted, marginBottom: '6px' }}>
                            {language === 'th' ? 'เว็บไซต์' : 'Website'}
                          </label>
                          <select
                            value={item.websiteId}
                            onChange={(e) => updateAddItem(item.tempId, 'websiteId', e.target.value)}
                            style={{
                              width: '100%',
                              height: '42px',
                              padding: '0 12px',
                              borderRadius: '8px',
                              border: `1px solid ${colors.border}`,
                              background: colors.cardBg,
                              color: colors.text,
                              fontSize: '13px',
                              cursor: 'pointer',
                              outline: 'none',
                            }}
                          >
                            <option value="">{language === 'th' ? '-- เลือกเว็บไซต์ --' : '-- Select Website --'}</option>
                            {websitesList.map(w => (
                              <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Bank */}
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: colors.textMuted, marginBottom: '6px' }}>
                            {language === 'th' ? 'ธนาคาร' : 'Bank'} <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <select
                            value={item.bankId}
                            onChange={(e) => updateAddItem(item.tempId, 'bankId', e.target.value)}
                            style={{
                              width: '100%',
                              height: '42px',
                              padding: '0 12px',
                              borderRadius: '8px',
                              border: `1px solid ${item.bankId ? colors.border : '#ef4444'}`,
                              background: colors.cardBg,
                              color: colors.text,
                              fontSize: '13px',
                              cursor: 'pointer',
                              outline: 'none',
                            }}
                          >
                            <option value="">{language === 'th' ? '-- เลือกธนาคาร --' : '-- Select Bank --'}</option>
                            {banksList.map(b => (
                              <option key={b.id} value={b.id}>
                                {b.bankName} ({b.type === 'payment' ? b.accountName : b.accountNumber})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Opening Balance */}
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: colors.textMuted, marginBottom: '6px' }}>
                            {language === 'th' ? 'ยอดยกมา' : 'Opening Balance'}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.openingBalance}
                            onChange={(e) => updateAddItem(item.tempId, 'openingBalance', e.target.value)}
                            placeholder="0.00"
                            style={{
                              width: '100%',
                              height: '42px',
                              padding: '0 12px',
                              borderRadius: '8px',
                              border: `1px solid ${colors.border}`,
                              background: colors.cardBg,
                              color: '#8b5cf6',
                              fontSize: '14px',
                              fontFamily: 'monospace',
                              fontWeight: 600,
                              outline: 'none',
                            }}
                          />
                        </div>

                        {/* Closing Balance */}
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: colors.textMuted, marginBottom: '6px' }}>
                            {language === 'th' ? 'ยอดคงเหลือ' : 'Closing Balance'}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.closingBalance}
                            onChange={(e) => updateAddItem(item.tempId, 'closingBalance', e.target.value)}
                            placeholder="0.00"
                            style={{
                              width: '100%',
                              height: '42px',
                              padding: '0 12px',
                              borderRadius: '8px',
                              border: `1px solid ${colors.border}`,
                              background: colors.cardBg,
                              color: '#22c55e',
                              fontSize: '14px',
                              fontFamily: 'monospace',
                              fontWeight: 600,
                              outline: 'none',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
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
                onClick={() => setIsAddModalOpen(false)}
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
                onClick={handleAddSave}
                disabled={isSubmitting}
                style={{
                  height: '48px',
                  padding: '0 28px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)',
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
                    {language === 'th' ? `บันทึก (${addItems.filter(i => i.bankId).length} รายการ)` : `Save (${addItems.filter(i => i.bankId).length} items)`}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal - Single Item */}
      {isEditModalOpen && editingItem && (
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
                  <Edit2 style={{ width: '24px', height: '24px', color: '#fff' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: colors.text, margin: 0 }}>
                    {language === 'th' ? 'แก้ไขยอดคงเหลือ' : 'Edit Balance'}
                  </h2>
                  <p style={{ fontSize: '14px', color: colors.textMuted, margin: '4px 0 0 0' }}>
                    ID: {editingItem.id.substring(0, 8)}...
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
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
                    color: '#3b82f6',
                    pointerEvents: 'none',
                  }} />
                  <input
                    type="date"
                    value={editFormData.date}
                    onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                    style={{
                      width: '100%',
                      height: '52px',
                      paddingLeft: '46px',
                      paddingRight: '16px',
                      borderRadius: '12px',
                      border: `2px solid ${colors.border}`,
                      background: colors.inputBg,
                      color: colors.text,
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Website */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>
                  {language === 'th' ? 'เว็บไซต์' : 'Website'}
                </label>
                <select
                  value={editFormData.websiteId}
                  onChange={(e) => setEditFormData({ ...editFormData, websiteId: e.target.value })}
                  style={{
                    width: '100%',
                    height: '52px',
                    padding: '0 16px',
                    borderRadius: '12px',
                    border: `2px solid ${colors.border}`,
                    background: colors.inputBg,
                    color: colors.text,
                    fontSize: '14px',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="">{language === 'th' ? '-- เลือกเว็บไซต์ --' : '-- Select Website --'}</option>
                  {websitesList.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              {/* Bank */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>
                  {language === 'th' ? 'ธนาคาร' : 'Bank'} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={editFormData.bankId}
                  onChange={(e) => setEditFormData({ ...editFormData, bankId: e.target.value })}
                  style={{
                    width: '100%',
                    height: '52px',
                    padding: '0 16px',
                    borderRadius: '12px',
                    border: `2px solid ${colors.border}`,
                    background: colors.inputBg,
                    color: colors.text,
                    fontSize: '14px',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="">{language === 'th' ? '-- เลือกธนาคาร --' : '-- Select Bank --'}</option>
                  {banksList.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} ({b.type === 'payment' ? b.accountName : b.accountNumber})
                    </option>
                  ))}
                </select>
              </div>

              {/* Opening Balance */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>
                  {language === 'th' ? 'ยอดยกมา (฿)' : 'Opening Balance (฿)'}
                </label>
                <div style={{ position: 'relative' }}>
                  <Wallet style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '18px',
                    height: '18px',
                    color: '#8b5cf6',
                    pointerEvents: 'none',
                  }} />
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.openingBalance}
                    onChange={(e) => setEditFormData({ ...editFormData, openingBalance: e.target.value })}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      height: '52px',
                      paddingLeft: '46px',
                      paddingRight: '16px',
                      borderRadius: '12px',
                      border: `2px solid ${colors.border}`,
                      background: colors.inputBg,
                      color: '#8b5cf6',
                      fontSize: '16px',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Closing Balance */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>
                  {language === 'th' ? 'ยอดคงเหลือ (฿)' : 'Closing Balance (฿)'}
                </label>
                <div style={{ position: 'relative' }}>
                  <PiggyBank style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '18px',
                    height: '18px',
                    color: '#22c55e',
                    pointerEvents: 'none',
                  }} />
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.closingBalance}
                    onChange={(e) => setEditFormData({ ...editFormData, closingBalance: e.target.value })}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      height: '52px',
                      paddingLeft: '46px',
                      paddingRight: '16px',
                      borderRadius: '12px',
                      border: `2px solid ${colors.border}`,
                      background: colors.inputBg,
                      color: '#22c55e',
                      fontSize: '16px',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
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
                onClick={() => setIsEditModalOpen(false)}
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
                onClick={handleEditSave}
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
        subtitle={language === 'th' ? 'คุณกำลังจะลบยอดคงเหลือรายการนี้' : 'You are about to delete this balance'}
        itemName={deletingItem ? `${formatDate(deletingItem.date)} - ${deletingItem.bankName}` : ''}
        itemDetails={deletingItem ? [
          { label: language === 'th' ? 'เว็บไซต์' : 'Website', value: deletingItem.websiteName, icon: Globe },
          { label: language === 'th' ? 'ยอดคงเหลือ' : 'Balance', value: `฿${formatCurrency(deletingItem.closingBalance)}`, icon: Wallet },
        ] : []}
        warningMessage={language === 'th' ? 'การดำเนินการนี้ไม่สามารถยกเลิกได้' : 'This action cannot be undone'}
        confirmText={language === 'th' ? 'ยืนยันลบ' : 'Delete'}
        cancelText={language === 'th' ? 'ยกเลิก' : 'Cancel'}
        loading={isSubmitting}
      />
    </div>
  );
}
