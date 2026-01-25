'use client';

import { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, Search, Edit2, Trash2, CheckCircle, XCircle, ArrowDownCircle, ArrowUpCircle, CreditCard, ArrowLeft, Filter, Save, RefreshCw, PauseCircle, User } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Modal, DeleteConfirmModal, ToastContainer, useToast, FormGroup, TextInput, SelectInput, ButtonSelect, FormButton } from '@/components/ui';

interface Bank {
  id: string;
  type: 'deposit' | 'withdrawal' | 'payment' | 'hold';
  bankName: string;
  accountName: string;
  accountNumber: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

const typeConfig = {
  deposit: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', icon: ArrowDownCircle, label: 'ฝาก', labelEn: 'Deposit' },
  withdrawal: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', icon: ArrowUpCircle, label: 'ถอน', labelEn: 'Withdrawal' },
  payment: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', icon: CreditCard, label: 'ชำระเงิน', labelEn: 'Payment' },
  hold: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', icon: PauseCircle, label: 'พักเงิน', labelEn: 'Hold' },
};

const bankOptions = [
  { value: 'กสิกรไทย', color: '#138f2d' },
  { value: 'กรุงเทพ', color: '#1e4598' },
  { value: 'ไทยพาณิชย์', color: '#4e2e7f' },
  { value: 'กรุงไทย', color: '#1ba5e0' },
  { value: 'กรุงศรีอยุธยา', color: '#fec43b' },
  { value: 'ทหารไทยธนชาต', color: '#1279be' },
  { value: 'ออมสิน', color: '#eb198d' },
  { value: 'ธ.ก.ส.', color: '#4b9b1d' },
  { value: 'ซีไอเอ็มบี ไทย', color: '#7e1f20' },
  { value: 'ยูโอบี', color: '#0b3979' },
  { value: 'แลนด์ แอนด์ เฮ้าส์', color: '#6d6e71' },
  { value: 'เกียรตินาคินภัทร', color: '#199078' },
  { value: 'ทิสโก้', color: '#12549f' },
  { value: 'ไอซีบีซี (ไทย)', color: '#c50f1c' },
  { value: 'ไทยเครดิต', color: '#0066b3' },
  { value: 'ธนาคารอิสลาม', color: '#0f6d38' },
  { value: 'ทรูมันนี่ วอลเล็ท', color: '#ec1c24' },
  { value: 'พร้อมเพย์', color: '#003b71' },
];

const bankColors: Record<string, string> = {
  'กสิกรไทย': '#138f2d',
  'กรุงเทพ': '#1e4598',
  'ไทยพาณิชย์': '#4e2e7f',
  'กรุงไทย': '#1ba5e0',
  'กรุงศรีอยุธยา': '#fec43b',
  'ทหารไทยธนชาต': '#1279be',
  'ออมสิน': '#eb198d',
  'ธ.ก.ส.': '#4b9b1d',
  'ซีไอเอ็มบี ไทย': '#7e1f20',
  'ยูโอบี': '#0b3979',
  'แลนด์ แอนด์ เฮ้าส์': '#6d6e71',
  'เกียรตินาคินภัทร': '#199078',
  'ทิสโก้': '#12549f',
  'ไอซีบีซี (ไทย)': '#c50f1c',
  'ไทยเครดิต': '#0066b3',
  'ธนาคารอิสลาม': '#0f6d38',
  'ทรูมันนี่ วอลเล็ท': '#ec1c24',
  'พร้อมเพย์': '#003b71',
  // Legacy names for backward compatibility
  'กรุงศรี': '#fec43b',
};

export default function BanksPage() {
  const [banksData, setBanksData] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [deletingBank, setDeletingBank] = useState<Bank | null>(null);
  const [formData, setFormData] = useState({
    type: 'deposit' as 'deposit' | 'withdrawal' | 'payment' | 'hold',
    bankName: '',
    accountName: '',
    accountNumber: '',
    status: 'active' as 'active' | 'inactive'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ bankName?: string; accountName?: string; accountNumber?: string }>({});
  const { t, language } = useLanguage();
  const { isDark } = useTheme();
  const { toasts, removeToast, success: showSuccess, error: showError } = useToast();

  // Fetch banks from API
  const fetchBanks = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/banks');
      const result = await response.json();
      
      if (result.success) {
        setBanksData(result.data);
      } else {
        showError('Error', result.error || 'Failed to load data');
      }
    } catch {
      showError('Error', 'Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchBanks();
  }, [fetchBanks]);

  // Form validation
  const validateForm = () => {
    const errors: { bankName?: string; accountName?: string; accountNumber?: string } = {};
    // ถ้าเป็น payment ไม่ต้องเลือกธนาคารก็ได้
    if (!formData.bankName && formData.type !== 'payment') {
      errors.bankName = language === 'th' ? 'กรุณาเลือกธนาคาร' : 'Please select a bank';
    }
    if (!formData.accountName.trim()) {
      errors.accountName = language === 'th' ? 'กรุณากรอกชื่อบัญชี' : 'Account name is required';
    }
    // ถ้าเป็น payment ไม่ต้องกรอกเลขบัญชีก็ได้
    if (!formData.accountNumber.trim() && formData.type !== 'payment') {
      errors.accountNumber = language === 'th' ? 'กรุณากรอกเลขบัญชี' : 'Account number is required';
    } else if (formData.accountNumber.trim() && !/^[\d-]+$/.test(formData.accountNumber)) {
      errors.accountNumber = language === 'th' ? 'เลขบัญชีไม่ถูกต้อง' : 'Invalid account number format';
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

  const filteredData = banksData.filter(item => {
    if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
    if (selectedType !== 'all' && item.type !== selectedType) return false;
    if (searchTerm && !item.accountName.toLowerCase().includes(searchTerm.toLowerCase()) && !item.id.toLowerCase().includes(searchTerm.toLowerCase()) && !item.accountNumber.includes(searchTerm)) return false;
    return true;
  });

  const openAddModal = () => {
    setEditingBank(null);
    setFormData({ type: 'deposit' as 'deposit' | 'withdrawal' | 'payment' | 'hold', bankName: '', accountName: '', accountNumber: '', status: 'active' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (bank: Bank) => {
    setEditingBank(bank);
    setFormData({
      type: bank.type,
      bankName: bank.bankName,
      accountName: bank.accountName,
      accountNumber: bank.accountNumber,
      status: bank.status
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openDeleteModal = (bank: Bank) => {
    setDeletingBank(bank);
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

    // ถ้าเป็น payment และไม่ได้เลือกธนาคาร ให้ใส่ค่า "payment" แทน
    const dataToSave = {
      ...formData,
      bankName: formData.type === 'payment' && !formData.bankName ? 'payment' : formData.bankName,
    };

    try {
      if (editingBank) {
        const response = await fetch(`/api/banks/${editingBank.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSave),
        });

        const result = await response.json();

        if (result.success) {
          await fetchBanks();
          showSuccess(
            language === 'th' ? 'แก้ไขสำเร็จ!' : 'Updated Successfully!',
            language === 'th' ? `บัญชี "${formData.accountName}" ถูกแก้ไขเรียบร้อยแล้ว` : `Account "${formData.accountName}" has been updated`
          );
          setIsModalOpen(false);
        } else {
          showError(
            language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error',
            result.error || (language === 'th' ? 'ไม่สามารถแก้ไขข้อมูลได้' : 'Failed to update')
          );
        }
      } else {
        const response = await fetch('/api/banks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSave),
        });

        const result = await response.json();

        if (result.success) {
          await fetchBanks();
          showSuccess(
            language === 'th' ? 'เพิ่มสำเร็จ!' : 'Added Successfully!',
            language === 'th' ? `บัญชี "${formData.accountName}" ถูกเพิ่มเรียบร้อยแล้ว` : `Account "${formData.accountName}" has been added`
          );
          setIsModalOpen(false);
        } else {
          if (result.error?.includes('already exists')) {
            setFormErrors({ accountNumber: language === 'th' ? 'เลขบัญชีนี้มีอยู่ในระบบแล้ว' : 'This account number already exists' });
          }
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
    if (!deletingBank) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/banks/${deletingBank.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        const deletedName = deletingBank.accountName;
        await fetchBanks();
        setIsDeleteModalOpen(false);
        setDeletingBank(null);
        showSuccess(
          language === 'th' ? 'ลบสำเร็จ!' : 'Deleted Successfully!',
          language === 'th' ? `บัญชี "${deletedName}" ถูกลบเรียบร้อยแล้ว` : `Account "${deletedName}" has been deleted`
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
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: colors.text, margin: 0 }}>{t('banks.title')}</h1>
            <p style={{ fontSize: '14px', color: colors.textMuted, margin: 0 }}>{t('banks.subtitle')}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={fetchBanks}
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
            <span>{t('banks.addNew')}</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
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
              <Building2 style={{ width: '20px', height: '20px', color: '#22c55e' }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>{t('employees.total')}</p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: colors.text, margin: 0 }}>{banksData.length}</p>
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
              background: typeConfig.deposit.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ArrowDownCircle style={{ width: '20px', height: '20px', color: typeConfig.deposit.color }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>{t('banks.deposit')}</p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: typeConfig.deposit.color, margin: 0 }}>
                {banksData.filter(b => b.type === 'deposit').length}
              </p>
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
              background: typeConfig.withdrawal.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ArrowUpCircle style={{ width: '20px', height: '20px', color: typeConfig.withdrawal.color }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>{t('banks.withdrawal')}</p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: typeConfig.withdrawal.color, margin: 0 }}>
                {banksData.filter(b => b.type === 'withdrawal').length}
              </p>
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
              background: typeConfig.payment.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CreditCard style={{ width: '20px', height: '20px', color: typeConfig.payment.color }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>{t('banks.payment')}</p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: typeConfig.payment.color, margin: 0 }}>
                {banksData.filter(b => b.type === 'payment').length}
              </p>
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
              background: typeConfig.hold.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <PauseCircle style={{ width: '20px', height: '20px', color: typeConfig.hold.color }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>{t('banks.hold')}</p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: typeConfig.hold.color, margin: 0 }}>
                {banksData.filter(b => b.type === 'hold').length}
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
            placeholder={t('banks.searchPlaceholder')}
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
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
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
            <option value="all">{t('banks.allTypes')}</option>
            <option value="deposit">{t('banks.deposit')}</option>
            <option value="withdrawal">{t('banks.withdrawal')}</option>
            <option value="payment">{t('banks.payment')}</option>
            <option value="hold">{t('banks.hold')}</option>
          </select>
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
            <option value="all">{t('banks.allStatus')}</option>
            <option value="active">{t('banks.active')}</option>
            <option value="inactive">{t('banks.inactive')}</option>
          </select>
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
                t('banks.type'),
                t('banks.bank'),
                t('banks.accountName'),
                t('banks.accountNumber'),
                t('banks.status'),
                t('common.actions')
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
                    {[1, 2, 3, 4, 5, 6].map((j) => (
                      <td key={j} style={{ padding: '14px 16px' }}>
                        <div style={{ width: j === 3 ? '150px' : '80px', height: '20px', borderRadius: '4px', background: colors.inputBg, animation: 'pulse 1.5s infinite' }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )}

            {/* Empty State */}
            {!isLoading && filteredData.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '60px 16px', textAlign: 'center' }}>
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
                    <Building2 style={{ width: '40px', height: '40px', color: '#22c55e' }} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: colors.text, margin: '0 0 8px 0' }}>
                    {banksData.length === 0
                      ? (language === 'th' ? 'ยังไม่มีบัญชีธนาคาร' : 'No bank accounts yet')
                      : (language === 'th' ? 'ไม่พบข้อมูล' : 'No results found')
                    }
                  </h3>
                  <p style={{ fontSize: '14px', color: colors.textMuted, margin: 0 }}>
                    {banksData.length === 0
                      ? (language === 'th' ? 'เริ่มต้นด้วยการเพิ่มบัญชีธนาคารแรกของคุณ' : 'Get started by adding your first bank account')
                      : (language === 'th' ? 'ลองค้นหาด้วยคำอื่น' : 'Try a different search term')
                    }
                  </p>
                  {banksData.length === 0 && (
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
                      {language === 'th' ? 'เพิ่มบัญชีธนาคาร' : 'Add Bank Account'}
                    </button>
                  )}
                </td>
              </tr>
            )}

            {/* Data Rows */}
            {!isLoading && filteredData.map((item, index) => {
              const typeInfo = typeConfig[item.type];
              const TypeIcon = typeInfo.icon;
              // ถ้าเป็น payment และไม่มี bankName หรือเป็น payment/ชำระเงิน ให้แสดงตามภาษา
              const isPaymentBank = !item.bankName || item.bankName === 'payment' || item.bankName === 'ชำระเงิน';
              const displayBankName = item.type === 'payment' && isPaymentBank 
                ? (language === 'th' ? 'ชำระเงิน' : 'Payment')
                : (item.bankName || '-');
              const bankColor = bankColors[item.bankName] || (item.type === 'payment' ? '#3b82f6' : '#6b7280');
              return (
                <tr key={item.id} style={{
                  borderBottom: index < filteredData.length - 1 ? `1px solid ${colors.border}` : 'none',
                }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: typeInfo.bg,
                    }}>
                      <TypeIcon style={{ width: '16px', height: '16px', color: typeInfo.color }} />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: typeInfo.color }}>
                        {language === 'th' ? typeInfo.label : typeInfo.labelEn}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: `linear-gradient(135deg, ${bankColor} 0%, ${bankColor}dd 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}>
                        {displayBankName.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: colors.text }}>{displayBankName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '14px', color: colors.text }}>{item.accountName}</span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#22c55e', fontFamily: 'monospace' }}>
                      {item.accountNumber}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: item.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(156, 163, 175, 0.15)',
                      color: item.status === 'active' ? '#10b981' : '#9ca3af',
                    }}>
                      {item.status === 'active' ? (
                        <CheckCircle style={{ width: '14px', height: '14px' }} />
                      ) : (
                        <XCircle style={{ width: '14px', height: '14px' }} />
                      )}
                      {item.status === 'active' ? (language === 'th' ? 'ใช้งาน' : 'Active') : (language === 'th' ? 'ไม่ใช้งาน' : 'Inactive')}
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

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBank 
          ? (language === 'th' ? 'แก้ไขบัญชีธนาคาร' : 'Edit Bank Account')
          : (language === 'th' ? 'เพิ่มบัญชีธนาคารใหม่' : 'Add New Bank Account')
        }
        subtitle={editingBank
          ? (language === 'th' ? 'แก้ไขข้อมูลบัญชีธนาคาร' : 'Update bank account information')
          : (language === 'th' ? 'กรอกข้อมูลเพื่อเพิ่มบัญชีธนาคารใหม่' : 'Fill in details for new bank account')
        }
        icon={editingBank ? Edit2 : Plus}
        iconColor="#22c55e"
        showSparkle={!editingBank}
        maxWidth="520px"
        footer={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', width: '100%' }}>
            <FormButton
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              {language === 'th' ? 'ยกเลิก' : 'Cancel'}
            </FormButton>
            <FormButton
              variant="primary"
              onClick={handleSave}
              loading={isSubmitting}
              icon={Save}
            >
              {language === 'th' ? 'บันทึก' : 'Save'}
            </FormButton>
          </div>
        }
      >
        {/* Type Selection */}
        <FormGroup 
          label={language === 'th' ? 'ประเภท' : 'Type'} 
          required
        >
          <ButtonSelect
            value={formData.type}
            onChange={(value) => setFormData({ ...formData, type: value as 'deposit' | 'withdrawal' | 'payment' | 'hold' })}
            options={[
              { value: 'deposit', label: language === 'th' ? typeConfig.deposit.label : typeConfig.deposit.labelEn, icon: ArrowDownCircle, color: typeConfig.deposit.color },
              { value: 'withdrawal', label: language === 'th' ? typeConfig.withdrawal.label : typeConfig.withdrawal.labelEn, icon: ArrowUpCircle, color: typeConfig.withdrawal.color },
              { value: 'payment', label: language === 'th' ? typeConfig.payment.label : typeConfig.payment.labelEn, icon: CreditCard, color: typeConfig.payment.color },
              { value: 'hold', label: language === 'th' ? typeConfig.hold.label : typeConfig.hold.labelEn, icon: PauseCircle, color: typeConfig.hold.color },
            ]}
            columns={2}
          />
        </FormGroup>

        {/* Bank Selection */}
        <FormGroup 
          label={language === 'th' ? 'ธนาคาร' : 'Bank'} 
          required={formData.type !== 'payment'}
          error={formErrors.bankName}
        >
          <SelectInput
            value={formData.bankName}
            onChange={(e) => {
              setFormData({ ...formData, bankName: e.target.value });
              if (formErrors.bankName) setFormErrors({ ...formErrors, bankName: undefined });
            }}
            options={[
              { value: '', label: language === 'th' ? '-- เลือกธนาคาร --' : '-- Select Bank --' },
              ...bankOptions.map(bank => ({ value: bank.value, label: bank.value }))
            ]}
            icon={Building2}
            error={!!formErrors.bankName}
          />
        </FormGroup>

        {/* Account Name */}
        <FormGroup 
          label={language === 'th' ? 'ชื่อบัญชี' : 'Account Name'} 
          required
          error={formErrors.accountName}
        >
          <TextInput
            value={formData.accountName}
            onChange={(e) => {
              setFormData({ ...formData, accountName: e.target.value });
              if (formErrors.accountName) setFormErrors({ ...formErrors, accountName: undefined });
            }}
            placeholder={language === 'th' ? 'กรอกชื่อบัญชี' : 'Enter account name'}
            icon={User}
            error={!!formErrors.accountName}
          />
        </FormGroup>

        {/* Account Number */}
        <FormGroup 
          label={language === 'th' ? 'เลขบัญชี' : 'Account Number'} 
          required={formData.type !== 'payment'}
          error={formErrors.accountNumber}
        >
          <TextInput
            value={formData.accountNumber}
            onChange={(e) => {
              setFormData({ ...formData, accountNumber: e.target.value });
              if (formErrors.accountNumber) setFormErrors({ ...formErrors, accountNumber: undefined });
            }}
            placeholder="xxx-x-xxxxx-x"
            icon={CreditCard}
            error={!!formErrors.accountNumber}
            style={{ fontFamily: 'monospace' }}
          />
        </FormGroup>

        {/* Status */}
        <FormGroup label={language === 'th' ? 'สถานะ' : 'Status'}>
          <ButtonSelect
            value={formData.status}
            onChange={(value) => setFormData({ ...formData, status: value as 'active' | 'inactive' })}
            options={[
              { value: 'active', label: language === 'th' ? 'ใช้งาน' : 'Active', icon: CheckCircle, color: '#22c55e' },
              { value: 'inactive', label: language === 'th' ? 'ไม่ใช้งาน' : 'Inactive', icon: XCircle, color: '#9ca3af' },
            ]}
          />
        </FormGroup>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen && !!deletingBank}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingBank(null);
        }}
        onConfirm={handleDelete}
        title={language === 'th' ? 'ยืนยันการลบข้อมูล' : 'Confirm Deletion'}
        subtitle={language === 'th' ? 'คุณกำลังจะลบบัญชีธนาคารนี้' : 'You are about to delete this bank account'}
        itemName={deletingBank?.bankName || ''}
        itemDetails={deletingBank ? [
          { label: language === 'th' ? 'ชื่อบัญชี' : 'Account Name', value: deletingBank.accountName },
          { label: language === 'th' ? 'เลขบัญชี' : 'Account Number', value: deletingBank.accountNumber, icon: CreditCard },
        ] : []}
        warningMessage={language === 'th' ? 'การดำเนินการนี้ไม่สามารถยกเลิกได้' : 'This action cannot be undone'}
        confirmText={language === 'th' ? 'ยืนยันลบ' : 'Delete'}
        cancelText={language === 'th' ? 'ยกเลิก' : 'Cancel'}
        loading={isSubmitting}
      />
    </div>
  );
}
