'use client';

import { useState, useEffect, useCallback } from 'react';
import { Wallet, Plus, Search, Edit2, Trash2, ArrowLeft, Briefcase, DollarSign, TrendingUp, Save, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Modal, DeleteConfirmModal, ToastContainer, useToast, FormGroup, TextInput, NumberInput, FormButton, PreviewCard } from '@/components/ui';

interface SalaryBase {
  id: string;
  position: string;
  baseSalary: number;
  positionAllowance: number;
  createdAt: string;
}

export default function SalaryBasePage() {
  const [salaryData, setSalaryData] = useState<SalaryBase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SalaryBase | null>(null);
  const [deletingItem, setDeletingItem] = useState<SalaryBase | null>(null);
  const [formData, setFormData] = useState({
    position: '',
    baseSalary: 0,
    positionAllowance: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ position?: string; baseSalary?: string }>({});
  const { t, language } = useLanguage();
  const { isDark } = useTheme();
  const { toasts, removeToast, success: showSuccess, error: showError } = useToast();

  // Fetch salary data from API
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/salary-base');
      const result = await response.json();
      
      if (result.success) {
        setSalaryData(result.data);
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
    fetchData();
  }, [fetchData]);

  // Form validation
  const validateForm = () => {
    const errors: { position?: string; baseSalary?: string } = {};
    if (!formData.position.trim()) {
      errors.position = language === 'th' ? 'กรุณากรอกชื่อตำแหน่ง' : 'Position is required';
    }
    if (formData.baseSalary < 0) {
      errors.baseSalary = language === 'th' ? 'ฐานเงินเดือนต้องไม่ติดลบ' : 'Base salary must be positive';
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

  const filteredData = salaryData.filter(item => {
    if (searchTerm && !item.position.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Stats
  const totalPositions = salaryData.length;
  const avgSalary = salaryData.length > 0 
    ? salaryData.reduce((sum, item) => sum + item.baseSalary + item.positionAllowance, 0) / salaryData.length 
    : 0;
  const maxSalary = salaryData.length > 0 
    ? Math.max(...salaryData.map(item => item.baseSalary + item.positionAllowance)) 
    : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH').format(amount);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({ position: '', baseSalary: 0, positionAllowance: 0 });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (item: SalaryBase) => {
    setEditingItem(item);
    setFormData({
      position: item.position,
      baseSalary: item.baseSalary,
      positionAllowance: item.positionAllowance,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openDeleteModal = (item: SalaryBase) => {
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
        const response = await fetch(`/api/salary-base/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (result.success) {
          await fetchData();
          showSuccess(
            language === 'th' ? 'แก้ไขสำเร็จ!' : 'Updated Successfully!',
            language === 'th' ? `ตำแหน่ง "${formData.position}" ถูกแก้ไขเรียบร้อยแล้ว` : `Position "${formData.position}" has been updated`
          );
          setIsModalOpen(false);
        } else {
          showError(
            language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error',
            result.error || (language === 'th' ? 'ไม่สามารถแก้ไขข้อมูลได้' : 'Failed to update')
          );
        }
      } else {
        const response = await fetch('/api/salary-base', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (result.success) {
          await fetchData();
          showSuccess(
            language === 'th' ? 'เพิ่มสำเร็จ!' : 'Added Successfully!',
            language === 'th' ? `ตำแหน่ง "${formData.position}" ถูกเพิ่มเรียบร้อยแล้ว` : `Position "${formData.position}" has been added`
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
      const response = await fetch(`/api/salary-base/${deletingItem.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        const deletedName = deletingItem.position;
        await fetchData();
        setIsDeleteModalOpen(false);
        setDeletingItem(null);
        showSuccess(
          language === 'th' ? 'ลบสำเร็จ!' : 'Deleted Successfully!',
          language === 'th' ? `ตำแหน่ง "${deletedName}" ถูกลบเรียบร้อยแล้ว` : `Position "${deletedName}" has been deleted`
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
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: colors.text, margin: 0 }}>{t('salaryBase.title')}</h1>
            <p style={{ fontSize: '14px', color: colors.textMuted, margin: 0 }}>{t('salaryBase.subtitle')}</p>
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
            <span>{t('salaryBase.addNew')}</span>
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
              <Briefcase style={{ width: '20px', height: '20px', color: '#22c55e' }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>{t('salaryBase.totalPositions')}</p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: colors.text, margin: 0 }}>{totalPositions}</p>
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
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <DollarSign style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>{t('salaryBase.avgSalary')}</p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6', margin: 0 }}>฿{formatCurrency(Math.round(avgSalary))}</p>
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
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <TrendingUp style={{ width: '20px', height: '20px', color: '#f59e0b' }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>{t('salaryBase.maxSalary')}</p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b', margin: 0 }}>฿{formatCurrency(maxSalary)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
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
            placeholder={t('salaryBase.searchPlaceholder')}
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
                t('salaryBase.position'),
                t('salaryBase.baseSalary'),
                t('salaryBase.positionAllowance'),
                t('salaryBase.totalCompensation'),
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
                    {[1, 2, 3, 4, 5].map((j) => (
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
                <td colSpan={5} style={{ padding: '60px 16px', textAlign: 'center' }}>
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
                    <Wallet style={{ width: '40px', height: '40px', color: '#22c55e' }} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: colors.text, margin: '0 0 8px 0' }}>
                    {salaryData.length === 0
                      ? (language === 'th' ? 'ยังไม่มีข้อมูลฐานเงินเดือน' : 'No salary base yet')
                      : (language === 'th' ? 'ไม่พบข้อมูล' : 'No results found')
                    }
                  </h3>
                  <p style={{ fontSize: '14px', color: colors.textMuted, margin: 0 }}>
                    {salaryData.length === 0
                      ? (language === 'th' ? 'เริ่มต้นด้วยการเพิ่มตำแหน่งแรก' : 'Get started by adding your first position')
                      : (language === 'th' ? 'ลองค้นหาด้วยคำอื่น' : 'Try a different search term')
                    }
                  </p>
                  {salaryData.length === 0 && (
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
                      {t('salaryBase.addNew')}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                    }}>
                      <Briefcase style={{ width: '18px', height: '18px' }} />
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: colors.text }}>{item.position}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#3b82f6', fontFamily: 'monospace' }}>
                    ฿{formatCurrency(item.baseSalary)}
                  </span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#f59e0b', fontFamily: 'monospace' }}>
                    ฿{formatCurrency(item.positionAllowance)}
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
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: '#22c55e',
                    fontFamily: 'monospace',
                  }}>
                    ฿{formatCurrency(item.baseSalary + item.positionAllowance)}
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
        title={editingItem
          ? (language === 'th' ? 'แก้ไขตำแหน่ง' : 'Edit Position')
          : (language === 'th' ? 'เพิ่มตำแหน่งใหม่' : 'Add New Position')
        }
        subtitle={editingItem
          ? (language === 'th' ? 'แก้ไขข้อมูลตำแหน่งและฐานเงินเดือน' : 'Update position and salary information')
          : (language === 'th' ? 'กรอกข้อมูลตำแหน่งและฐานเงินเดือน' : 'Fill in position and salary details')
        }
        icon={editingItem ? Edit2 : Plus}
        iconColor="#22c55e"
        showSparkle={!editingItem}
        maxWidth="500px"
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
        {/* Position */}
        <FormGroup
          label={t('salaryBase.position')}
          required
          error={formErrors.position}
        >
          <TextInput
            value={formData.position}
            onChange={(e) => {
              setFormData({ ...formData, position: e.target.value });
              if (formErrors.position) setFormErrors({ ...formErrors, position: undefined });
            }}
            placeholder={language === 'th' ? 'เช่น ผู้จัดการ, หัวหน้าทีม, พนักงาน' : 'e.g. Manager, Team Lead, Staff'}
            icon={Briefcase}
            error={!!formErrors.position}
          />
        </FormGroup>

        {/* Base Salary */}
        <FormGroup
          label={`${t('salaryBase.baseSalary')} (฿)`}
          error={formErrors.baseSalary}
        >
          <NumberInput
            value={formData.baseSalary}
            onChange={(e) => {
              setFormData({ ...formData, baseSalary: Number(e.target.value) || 0 });
              if (formErrors.baseSalary) setFormErrors({ ...formErrors, baseSalary: undefined });
            }}
            placeholder="0"
            min={0}
            icon={DollarSign}
            error={!!formErrors.baseSalary}
          />
        </FormGroup>

        {/* Position Allowance */}
        <FormGroup label={`${t('salaryBase.positionAllowance')} (฿)`}>
          <NumberInput
            value={formData.positionAllowance}
            onChange={(e) => setFormData({ ...formData, positionAllowance: Number(e.target.value) || 0 })}
            placeholder="0"
            min={0}
            icon={TrendingUp}
          />
        </FormGroup>

        {/* Total Preview */}
        <PreviewCard
          label={t('salaryBase.totalCompensation')}
          value={`฿${formatCurrency(formData.baseSalary + formData.positionAllowance)}`}
          icon={Wallet}
          variant="positive"
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen && !!deletingItem}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingItem(null);
        }}
        onConfirm={handleDelete}
        title={language === 'th' ? 'ยืนยันการลบข้อมูล' : 'Confirm Deletion'}
        subtitle={language === 'th' ? 'คุณกำลังจะลบตำแหน่งนี้' : 'You are about to delete this position'}
        itemName={deletingItem?.position || ''}
        itemDetails={deletingItem ? [
          { label: language === 'th' ? 'ฐานเงินเดือน' : 'Base Salary', value: `฿${formatCurrency(deletingItem.baseSalary)}`, icon: DollarSign },
          { label: language === 'th' ? 'ค่าตำแหน่ง' : 'Allowance', value: `฿${formatCurrency(deletingItem.positionAllowance)}`, icon: TrendingUp },
          { label: language === 'th' ? 'รวมทั้งหมด' : 'Total', value: `฿${formatCurrency(deletingItem.baseSalary + deletingItem.positionAllowance)}`, icon: Wallet },
        ] : []}
        warningMessage={language === 'th' ? 'การดำเนินการนี้ไม่สามารถยกเลิกได้' : 'This action cannot be undone'}
        confirmText={language === 'th' ? 'ยืนยันลบ' : 'Delete'}
        cancelText={language === 'th' ? 'ยกเลิก' : 'Cancel'}
        loading={isSubmitting}
      />
    </div>
  );
}
