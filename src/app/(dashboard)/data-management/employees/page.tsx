'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserCog, Plus, Search, Edit2, Trash2, CheckCircle, XCircle, Globe, ArrowLeft, Filter, Users, Save, RefreshCw, Check, Briefcase, CreditCard, User } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Modal, DeleteConfirmModal, ToastContainer, useToast, FormGroup, TextInput, SelectInput, ButtonSelect, ChipSelect, FormButton } from '@/components/ui';

interface Employee {
  id: string;
  fullName: string;
  position: string;
  websites: string[];
  bankName: string;
  accountNumber: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface Website {
  id: string;
  name: string;
  url: string;
  status: string;
}

interface SalaryBase {
  id: string;
  position: string;
  baseSalary: number;
  positionAllowance: number;
}

const avatarColors = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#14b8a6'];

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

export default function EmployeesPage() {
  const [employeesData, setEmployeesData] = useState<Employee[]>([]);
  const [websitesList, setWebsitesList] = useState<Website[]>([]);
  const [positionsList, setPositionsList] = useState<SalaryBase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedWebsite, setSelectedWebsite] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    position: '',
    websites: [] as string[],
    bankName: '',
    accountNumber: '',
    status: 'active' as 'active' | 'inactive'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ fullName?: string; position?: string; websites?: string; bankName?: string; accountNumber?: string }>({});
  const { t, language } = useLanguage();
  const { isDark } = useTheme();
  const { toasts, removeToast, success: showSuccess, error: showError } = useToast();

  // Fetch employees from API
  const fetchEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/employees');
      const result = await response.json();
      
      if (result.success) {
        setEmployeesData(result.data);
      } else {
        showError('Error', result.error || 'Failed to load data');
      }
    } catch {
      showError('Error', 'Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  // Fetch websites for selection
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

  // Fetch positions from salary base
  const fetchPositions = useCallback(async () => {
    try {
      const response = await fetch('/api/salary-base');
      const result = await response.json();
      if (result.success) {
        setPositionsList(result.data);
      }
    } catch {
      console.error('Failed to fetch positions');
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchWebsites();
    fetchPositions();
  }, [fetchEmployees, fetchWebsites, fetchPositions]);

  // Form validation
  const validateForm = () => {
    const errors: { fullName?: string; position?: string; websites?: string; bankName?: string; accountNumber?: string } = {};
    if (!formData.fullName.trim()) {
      errors.fullName = language === 'th' ? 'กรุณากรอกชื่อ-นามสกุล' : 'Full name is required';
    }
    if (!formData.position) {
      errors.position = language === 'th' ? 'กรุณาเลือกตำแหน่ง' : 'Please select a position';
    }
    if (!formData.websites || formData.websites.length === 0) {
      errors.websites = language === 'th' ? 'กรุณาเลือกเว็บไซต์อย่างน้อย 1 รายการ' : 'Please select at least one website';
    }
    if (!formData.bankName) {
      errors.bankName = language === 'th' ? 'กรุณาเลือกธนาคาร' : 'Please select a bank';
    }
    if (!formData.accountNumber.trim()) {
      errors.accountNumber = language === 'th' ? 'กรุณากรอกเลขบัญชี' : 'Account number is required';
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

  // Get websites from database only
  const allWebsites = websitesList.map(w => w.name);

  const filteredData = employeesData.filter(item => {
    if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
    if (selectedWebsite !== 'all' && !item.websites.includes(selectedWebsite)) return false;
    if (searchTerm && !item.fullName.toLowerCase().includes(searchTerm.toLowerCase()) && !item.id.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2);
  };

  const toggleWebsite = (website: string) => {
    setFormData(prev => ({
      ...prev,
      websites: prev.websites.includes(website)
        ? prev.websites.filter(w => w !== website)
        : [...prev.websites, website]
    }));
    if (formErrors.websites) {
      setFormErrors(prev => ({ ...prev, websites: undefined }));
    }
  };

  const openAddModal = () => {
    setEditingEmployee(null);
    setFormData({ fullName: '', position: '', websites: [], bankName: '', accountNumber: '', status: 'active' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      fullName: employee.fullName,
      position: employee.position || '',
      websites: employee.websites,
      bankName: employee.bankName,
      accountNumber: employee.accountNumber,
      status: employee.status
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openDeleteModal = (employee: Employee) => {
    setDeletingEmployee(employee);
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
      if (editingEmployee) {
        const response = await fetch(`/api/employees/${editingEmployee.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (result.success) {
          await fetchEmployees();
          showSuccess(
            language === 'th' ? 'แก้ไขสำเร็จ!' : 'Updated Successfully!',
            language === 'th' ? `พนักงาน "${formData.fullName}" ถูกแก้ไขเรียบร้อยแล้ว` : `Employee "${formData.fullName}" has been updated`
          );
          setIsModalOpen(false);
        } else {
          showError(
            language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error',
            result.error || (language === 'th' ? 'ไม่สามารถแก้ไขข้อมูลได้' : 'Failed to update')
          );
        }
      } else {
        const response = await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (result.success) {
          await fetchEmployees();
          showSuccess(
            language === 'th' ? 'เพิ่มสำเร็จ!' : 'Added Successfully!',
            language === 'th' ? `พนักงาน "${formData.fullName}" ถูกเพิ่มเรียบร้อยแล้ว` : `Employee "${formData.fullName}" has been added`
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
    if (!deletingEmployee) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/employees/${deletingEmployee.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        const deletedName = deletingEmployee.fullName;
        await fetchEmployees();
        setIsDeleteModalOpen(false);
        setDeletingEmployee(null);
        showSuccess(
          language === 'th' ? 'ลบสำเร็จ!' : 'Deleted Successfully!',
          language === 'th' ? `พนักงาน "${deletedName}" ถูกลบเรียบร้อยแล้ว` : `Employee "${deletedName}" has been deleted`
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
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: colors.text, margin: 0 }}>{t('employees.title')}</h1>
            <p style={{ fontSize: '14px', color: colors.textMuted, margin: 0 }}>{t('employees.subtitle')}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={fetchEmployees}
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
            <span>{t('employees.addNew')}</span>
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
              <Users style={{ width: '20px', height: '20px', color: '#22c55e' }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>{t('employees.total')}</p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: colors.text, margin: 0 }}>{employeesData.length}</p>
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
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CheckCircle style={{ width: '20px', height: '20px', color: '#10b981' }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>{t('employees.active')}</p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: '#10b981', margin: 0 }}>{employeesData.filter(e => e.status === 'active').length}</p>
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
              background: 'rgba(156, 163, 175, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <XCircle style={{ width: '20px', height: '20px', color: '#9ca3af' }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>{t('employees.inactive')}</p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: '#9ca3af', margin: 0 }}>{employeesData.filter(e => e.status === 'inactive').length}</p>
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
            placeholder={t('employees.searchPlaceholder')}
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
            <option value="all">{t('employees.allWebsites')}</option>
            {allWebsites.map(w => (
              <option key={w} value={w}>{w}</option>
            ))}
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
            <option value="all">{t('employees.allStatus')}</option>
            <option value="active">{t('employees.active')}</option>
            <option value="inactive">{t('employees.inactive')}</option>
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
                t('employees.fullName'),
                t('employees.position'),
                t('employees.websites'),
                t('employees.bank'),
                t('employees.accountNumber'),
                t('employees.status'),
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
                    {[1, 2, 3, 4, 5, 6, 7].map((j) => (
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
                    <Users style={{ width: '40px', height: '40px', color: '#22c55e' }} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: colors.text, margin: '0 0 8px 0' }}>
                    {employeesData.length === 0
                      ? (language === 'th' ? 'ยังไม่มีพนักงาน' : 'No employees yet')
                      : (language === 'th' ? 'ไม่พบข้อมูล' : 'No results found')
                    }
                  </h3>
                  <p style={{ fontSize: '14px', color: colors.textMuted, margin: 0 }}>
                    {employeesData.length === 0
                      ? (language === 'th' ? 'เริ่มต้นด้วยการเพิ่มพนักงานคนแรก' : 'Get started by adding your first employee')
                      : (language === 'th' ? 'ลองค้นหาด้วยคำอื่น' : 'Try a different search term')
                    }
                  </p>
                  {employeesData.length === 0 && (
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
                      {language === 'th' ? 'เพิ่มพนักงาน' : 'Add Employee'}
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
                      background: avatarColors[index % avatarColors.length],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 700,
                    }}>
                      {getInitials(item.fullName)}
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: colors.text }}>{item.fullName}</span>
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
                    background: 'rgba(139, 92, 246, 0.1)',
                    color: '#8b5cf6',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                  }}>
                    <Briefcase style={{ width: '14px', height: '14px' }} />
                    {item.position || '-'}
                  </span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {item.websites.map((website) => (
                      <span
                        key={website}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 500,
                          background: 'rgba(34, 197, 94, 0.1)',
                          color: '#22c55e',
                          border: '1px solid rgba(34, 197, 94, 0.2)',
                        }}
                      >
                        <Globe style={{ width: '12px', height: '12px' }} />
                        {website}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontSize: '13px', color: colors.text }}>{item.bankName}</span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontSize: '13px', color: '#22c55e', fontFamily: 'monospace', fontWeight: 600 }}>{item.accountNumber}</span>
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
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEmployee 
          ? (language === 'th' ? 'แก้ไขพนักงาน' : 'Edit Employee')
          : (language === 'th' ? 'เพิ่มพนักงานใหม่' : 'Add New Employee')
        }
        subtitle={editingEmployee
          ? (language === 'th' ? 'แก้ไขข้อมูลพนักงาน' : 'Update employee information')
          : (language === 'th' ? 'กรอกข้อมูลเพื่อเพิ่มพนักงานใหม่' : 'Fill in details for new employee')
        }
        icon={editingEmployee ? Edit2 : Plus}
        iconColor="#22c55e"
        showSparkle={!editingEmployee}
        maxWidth="600px"
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
        {/* Full Name */}
        <FormGroup 
          label={language === 'th' ? 'ชื่อ-นามสกุล' : 'Full Name'} 
          required
          error={formErrors.fullName}
        >
          <TextInput
            value={formData.fullName}
            onChange={(e) => {
              setFormData({ ...formData, fullName: e.target.value });
              if (formErrors.fullName) setFormErrors({ ...formErrors, fullName: undefined });
            }}
            placeholder={language === 'th' ? 'กรอกชื่อ-นามสกุล' : 'Enter full name'}
            icon={User}
            error={!!formErrors.fullName}
          />
        </FormGroup>

        {/* Position Selection */}
        <FormGroup 
          label={language === 'th' ? 'ตำแหน่ง' : 'Position'} 
          required
          error={formErrors.position}
        >
          <SelectInput
            value={formData.position}
            onChange={(e) => {
              setFormData({ ...formData, position: e.target.value });
              if (formErrors.position) setFormErrors({ ...formErrors, position: undefined });
            }}
            options={[
              { value: '', label: language === 'th' ? '-- เลือกตำแหน่ง --' : '-- Select Position --' },
              ...positionsList.map(pos => ({ 
                value: pos.position, 
                label: `${pos.position} (฿${new Intl.NumberFormat('th-TH').format(pos.baseSalary + pos.positionAllowance)})` 
              }))
            ]}
            icon={Briefcase}
            error={!!formErrors.position}
          />
        </FormGroup>

        {/* Websites Multi-Select */}
        <FormGroup 
          label={language === 'th' ? 'เว็บไซต์ที่รับผิดชอบ' : 'Assigned Websites'} 
          required
          hint={language === 'th' ? 'เลือกได้หลายรายการ' : 'Multi-select'}
          error={formErrors.websites}
        >
          <ChipSelect
            value={formData.websites}
            onChange={(value) => {
              setFormData({ ...formData, websites: value });
              if (formErrors.websites) setFormErrors({ ...formErrors, websites: undefined });
            }}
            options={allWebsites.map(w => ({ value: w, label: w, icon: Globe }))}
            placeholder={language === 'th' ? 'ไม่มีเว็บไซต์ในระบบ กรุณาเพิ่มเว็บไซต์ก่อน' : 'No websites available. Please add websites first.'}
            error={!!formErrors.websites}
          />
          {formData.websites.length > 0 && (
            <p style={{ fontSize: '12px', color: '#22c55e', margin: '8px 0 0 0' }}>
              {language === 'th' ? `เลือกแล้ว ${formData.websites.length} เว็บไซต์` : `${formData.websites.length} website(s) selected`}
            </p>
          )}
        </FormGroup>

        {/* Bank Selection */}
        <FormGroup 
          label={language === 'th' ? 'ธนาคาร' : 'Bank'} 
          required
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
            error={!!formErrors.bankName}
          />
        </FormGroup>

        {/* Account Number */}
        <FormGroup 
          label={language === 'th' ? 'เลขบัญชี' : 'Account Number'} 
          required
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
        isOpen={isDeleteModalOpen && !!deletingEmployee}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingEmployee(null);
        }}
        onConfirm={handleDelete}
        title={language === 'th' ? 'ยืนยันการลบข้อมูล' : 'Confirm Deletion'}
        subtitle={language === 'th' ? 'คุณกำลังจะลบพนักงานคนนี้' : 'You are about to delete this employee'}
        itemName={deletingEmployee?.fullName || ''}
        itemDetails={deletingEmployee ? [
          { label: language === 'th' ? 'ตำแหน่ง' : 'Position', value: deletingEmployee.position || '-', icon: Briefcase },
          { label: language === 'th' ? 'เว็บไซต์' : 'Websites', value: deletingEmployee.websites.join(', '), icon: Globe },
        ] : []}
        warningMessage={language === 'th' ? 'การดำเนินการนี้ไม่สามารถยกเลิกได้' : 'This action cannot be undone'}
        confirmText={language === 'th' ? 'ยืนยันลบ' : 'Delete'}
        cancelText={language === 'th' ? 'ยกเลิก' : 'Cancel'}
        loading={isSubmitting}
      />
    </div>
  );
}
