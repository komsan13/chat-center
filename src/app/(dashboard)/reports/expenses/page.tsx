'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Plus, Search, Edit2, Trash2, ArrowLeft, Filter, X, Save, AlertTriangle, RefreshCw, Building2, Globe, Receipt, Wallet, User, CreditCard, Banknote, Sparkles, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { DeleteConfirmModal, ToastContainer, useToast } from '@/components/ui';

interface Expense {
  id: string;
  date: string;
  websiteId: string;
  websiteName: string;
  category: string;
  description: string;
  amount: number;
  requester: string;
  paymentType: string;
  bankId: string;
  bankName: string;
  accountNumber: string;
  bankType: string | null;
  accountName: string;
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

interface Employee {
  id: string;
  name: string;
  nickname: string;
}

const categories = [
  { value: 'system', labelTh: 'ค่าระบบ', labelEn: 'System' },
  { value: 'graphic', labelTh: 'กราฟิก', labelEn: 'Graphic' },
  { value: 'marketing', labelTh: 'การตลาด', labelEn: 'Marketing' },
  { value: 'salary', labelTh: 'เงินเดือน', labelEn: 'Salary' },
  { value: 'other', labelTh: 'อื่นๆ', labelEn: 'Other' },
];

const paymentTypes = [
  { value: 'cash', labelTh: 'เงินสด', labelEn: 'Cash' },
  { value: 'bank', labelTh: 'ธนาคาร', labelEn: 'Bank' },
];

const statuses = [
  { value: 'paid', labelTh: 'ชำระแล้ว', labelEn: 'Paid' },
  { value: 'unpaid', labelTh: 'ยังไม่ชำระ', labelEn: 'Unpaid' },
];

export default function ExpensesPage() {
  const [expenseData, setExpenseData] = useState<Expense[]>([]);
  const [banksList, setBanksList] = useState<Bank[]>([]);
  const [websitesList, setWebsitesList] = useState<Website[]>([]);
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Expense | null>(null);
  const [deletingItem, setDeletingItem] = useState<Expense | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    websiteId: '',
    category: '',
    description: '',
    amount: '',
    requester: '',
    paymentType: 'cash',
    bankId: '',
    status: 'unpaid',
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
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      
      const response = await fetch(`/api/expenses?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        setExpenseData(result.data);
      } else {
        showError('Error', result.error || 'Failed to load data');
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      showError('Error', 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedCategory, selectedStatus, showError]);

  // Fetch banks and websites
  const fetchBanksAndWebsites = useCallback(async () => {
    try {
      const [banksRes, websitesRes, employeesRes] = await Promise.all([
        fetch('/api/banks'),
        fetch('/api/websites'),
        fetch('/api/employees')
      ]);
      
      const [banksData, websitesData, employeesData] = await Promise.all([
        banksRes.json(),
        websitesRes.json(),
        employeesRes.json()
      ]);
      
      if (banksData.success) setBanksList(banksData.data);
      if (websitesData.success) setWebsitesList(websitesData.data);
      if (employeesData.success) setEmployeesList(employeesData.data);
    } catch (error) {
      console.error('Error fetching banks/websites/employees:', error);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchBanksAndWebsites();
  }, [fetchData, fetchBanksAndWebsites]);

  // Format number
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('th-TH').format(num);
  };

  // Get category label
  const getCategoryLabel = (value: string) => {
    const cat = categories.find(c => c.value === value);
    return cat ? (language === 'th' ? cat.labelTh : cat.labelEn) : value;
  };

  // Get payment type label
  const getPaymentTypeLabel = (value: string) => {
    const pt = paymentTypes.find(p => p.value === value);
    return pt ? (language === 'th' ? pt.labelTh : pt.labelEn) : value;
  };

  // Get status label
  const getStatusLabel = (value: string) => {
    const st = statuses.find(s => s.value === value);
    return st ? (language === 'th' ? st.labelTh : st.labelEn) : value;
  };

  // Filter data
  const filteredData = expenseData.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.description?.toLowerCase().includes(searchLower) ||
      item.requester?.toLowerCase().includes(searchLower) ||
      item.websiteName?.toLowerCase().includes(searchLower) ||
      getCategoryLabel(item.category).toLowerCase().includes(searchLower)
    );
  });

  // Calculate total
  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);

  // Open add modal
  const openAddModal = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      websiteId: '',
      category: '',
      description: '',
      amount: '',
      requester: '',
      paymentType: 'cash',
      bankId: '',
      status: 'unpaid',
    });
    setIsAddModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (item: Expense) => {
    setEditingItem(item);
    setFormData({
      date: item.date,
      websiteId: item.websiteId || '',
      category: item.category,
      description: item.description || '',
      amount: item.amount.toString(),
      requester: item.requester || '',
      paymentType: item.paymentType || 'cash',
      bankId: item.bankId || '',
      status: item.status || 'unpaid',
    });
    setIsEditModalOpen(true);
  };

  // Open delete modal
  const openDeleteModal = (item: Expense) => {
    setDeletingItem(item);
    setIsDeleteModalOpen(true);
  };

  // Handle save (add)
  const handleAdd = async () => {
    if (!formData.date || !formData.category || !formData.amount) {
      showError(
        language === 'th' ? 'ข้อมูลไม่ครบ' : 'Missing Data',
        language === 'th' ? 'กรุณากรอกวันที่ หมวดหมู่ และจำนวนเงิน' : 'Please fill date, category and amount'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const website = websitesList.find(w => w.id === formData.websiteId);
      const bank = banksList.find(b => b.id === formData.bankId);
      
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formData.date,
          websiteId: formData.websiteId || null,
          websiteName: website?.name || '',
          category: formData.category,
          description: formData.description,
          amount: parseFloat(formData.amount) || 0,
          requester: formData.requester,
          paymentType: formData.paymentType,
          bankId: formData.paymentType === 'bank' ? formData.bankId : null,
          bankName: formData.paymentType === 'bank' ? bank?.bankName || '' : '',
          accountNumber: formData.paymentType === 'bank' ? bank?.accountNumber || '' : '',
          status: formData.status,
        }),
      });

      const result = await response.json();
      if (result.success) {
        showSuccess(
          language === 'th' ? 'สำเร็จ' : 'Success',
          language === 'th' ? 'เพิ่มค่าใช้จ่ายสำเร็จ' : 'Expense added successfully'
        );
        setIsAddModalOpen(false);
        fetchData();
      } else {
        showError(
          language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error',
          result.error
        );
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      showError(
        language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error',
        language === 'th' ? 'ไม่สามารถเพิ่มข้อมูลได้' : 'Failed to add expense'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update (edit)
  const handleUpdate = async () => {
    if (!editingItem) return;
    
    if (!formData.date || !formData.category || !formData.amount) {
      showError(
        language === 'th' ? 'ข้อมูลไม่ครบ' : 'Missing Data',
        language === 'th' ? 'กรุณากรอกวันที่ หมวดหมู่ และจำนวนเงิน' : 'Please fill date, category and amount'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const website = websitesList.find(w => w.id === formData.websiteId);
      const bank = banksList.find(b => b.id === formData.bankId);
      
      const response = await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          date: formData.date,
          websiteId: formData.websiteId || null,
          websiteName: website?.name || '',
          category: formData.category,
          description: formData.description,
          amount: parseFloat(formData.amount) || 0,
          requester: formData.requester,
          paymentType: formData.paymentType,
          bankId: formData.paymentType === 'bank' ? formData.bankId : null,
          bankName: formData.paymentType === 'bank' ? bank?.bankName || '' : '',
          accountNumber: formData.paymentType === 'bank' ? bank?.accountNumber || '' : '',
          status: formData.status,
        }),
      });

      const result = await response.json();
      if (result.success) {
        showSuccess(
          language === 'th' ? 'สำเร็จ' : 'Success',
          language === 'th' ? 'แก้ไขค่าใช้จ่ายสำเร็จ' : 'Expense updated successfully'
        );
        setIsEditModalOpen(false);
        setEditingItem(null);
        fetchData();
      } else {
        showError(
          language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error',
          result.error
        );
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      showError(
        language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error',
        language === 'th' ? 'ไม่สามารถแก้ไขข้อมูลได้' : 'Failed to update expense'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deletingItem) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/expenses?id=${deletingItem.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        showSuccess(
          language === 'th' ? 'สำเร็จ' : 'Success',
          language === 'th' ? 'ลบค่าใช้จ่ายสำเร็จ' : 'Expense deleted successfully'
        );
        setIsDeleteModalOpen(false);
        setDeletingItem(null);
        fetchData();
      } else {
        showError(
          language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error',
          result.error
        );
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      showError(
        language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error',
        language === 'th' ? 'ไม่สามารถลบข้อมูลได้' : 'Failed to delete expense'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Theme colors
  const colors = {
    background: isDark ? '#1D1E24' : '#f8fafc',
    card: isDark ? '#23262B' : '#ffffff',
    cardHover: isDark ? '#2A2D35' : '#f1f5f9',
    border: isDark ? '#2A313C' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#1e293b',
    textMuted: isDark ? '#9CA3AF' : '#64748b',
    primary: '#22c55e',
    primaryHover: '#16a34a',
    danger: '#ef4444',
    dangerHover: '#dc2626',
    warning: '#f59e0b',
    success: '#22c55e',
  };

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
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
              background: colors.card,
              border: `1px solid ${colors.border}`,
              color: colors.textMuted,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: colors.text, margin: 0 }}>
              {language === 'th' ? 'ค่าใช้จ่าย' : 'Expenses'}
            </h1>
            <p style={{ fontSize: '14px', color: colors.textMuted, margin: 0 }}>
              {language === 'th' ? 'จัดการข้อมูลค่าใช้จ่ายทั้งหมด' : 'Manage all expense records'}
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
              background: colors.card,
              color: colors.textMuted,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={language === 'th' ? 'รีเฟรชข้อมูล' : 'Refresh data'}
          >
            <RefreshCw size={18} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
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
            <Plus size={18} />
            <span>{language === 'th' ? 'เพิ่มค่าใช้จ่าย' : 'Add Expense'}</span>
          </button>
        </div>
      </div>

      {/* Filters and Actions */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '24px',
        padding: '16px',
        background: colors.card,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={language === 'th' ? 'ค้นหา...' : 'Search...'}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: colors.background,
              color: colors.text,
              fontSize: '14px',
            }}
          />
        </div>

        {/* Date Filter */}
        <div style={{ position: 'relative', minWidth: '150px' }}>
          <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }} />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: colors.background,
              color: colors.text,
              fontSize: '14px',
            }}
          />
        </div>

        {/* Category Filter */}
        <div style={{ position: 'relative', minWidth: '150px' }}>
          <Filter size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }} />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: colors.background,
              color: colors.text,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            <option value="all">{language === 'th' ? 'หมวดหมู่ทั้งหมด' : 'All Categories'}</option>
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>
                {language === 'th' ? cat.labelTh : cat.labelEn}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ position: 'relative', minWidth: '150px' }}>
          <Filter size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }} />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: colors.background,
              color: colors.text,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            <option value="all">{language === 'th' ? 'สถานะทั้งหมด' : 'All Status'}</option>
            {statuses.map(st => (
              <option key={st.value} value={st.value}>
                {language === 'th' ? st.labelTh : st.labelEn}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Card */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div style={{
          padding: '20px',
          background: colors.card,
          borderRadius: '12px',
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: `${colors.primary}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Receipt size={24} color={colors.primary} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: colors.textMuted }}>
                {language === 'th' ? 'จำนวนรายการ' : 'Total Items'}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: colors.text }}>
                {filteredData.length}
              </div>
            </div>
          </div>
        </div>

        <div style={{
          padding: '20px',
          background: colors.card,
          borderRadius: '12px',
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#ef444420',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Wallet size={24} color="#ef4444" />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: colors.textMuted }}>
                {language === 'th' ? 'ค่าใช้จ่ายรวม' : 'Total Expenses'}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>
                ฿{formatNumber(totalAmount)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div style={{
        background: colors.card,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: isDark ? '#1D1E24' : '#f8fafc' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>
                  {language === 'th' ? 'วันที่' : 'Date'}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>
                  {language === 'th' ? 'เว็บ' : 'Website'}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>
                  {language === 'th' ? 'หมวดหมู่' : 'Category'}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>
                  {language === 'th' ? 'รายละเอียด' : 'Description'}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>
                  {language === 'th' ? 'จำนวนเงิน' : 'Amount'}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>
                  {language === 'th' ? 'ผู้เบิก' : 'Requester'}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>
                  {language === 'th' ? 'ประเภท' : 'Type'}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>
                  {language === 'th' ? 'ธนาคาร/เงินสด' : 'Bank/Cash'}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>
                  {language === 'th' ? 'สถานะ' : 'Status'}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>
                  {language === 'th' ? 'จัดการ' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: colors.textMuted }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                    {language === 'th' ? 'กำลังโหลด...' : 'Loading...'}
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: colors.textMuted }}>
                    <Receipt size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                    <div>{language === 'th' ? 'ไม่มีข้อมูล' : 'No data found'}</div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr
                    key={item.id}
                    style={{
                      background: index % 2 === 0 ? 'transparent' : isDark ? '#1D1E24' : '#f8fafc',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = colors.cardHover}
                    onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? 'transparent' : isDark ? '#1D1E24' : '#f8fafc'}
                  >
                    <td style={{ padding: '14px 16px', color: colors.text, fontSize: '14px', borderBottom: `1px solid ${colors.border}` }}>
                      {item.date}
                    </td>
                    <td style={{ padding: '14px 16px', color: colors.text, fontSize: '14px', borderBottom: `1px solid ${colors.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Globe size={16} color={colors.textMuted} />
                        {item.websiteName || '-'}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', borderBottom: `1px solid ${colors.border}` }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        background: item.category === 'system' ? '#3b82f620' :
                                   item.category === 'graphic' ? '#8b5cf620' :
                                   item.category === 'marketing' ? '#f59e0b20' :
                                   item.category === 'salary' ? '#22c55e20' : '#6b728020',
                        color: item.category === 'system' ? '#3b82f6' :
                               item.category === 'graphic' ? '#8b5cf6' :
                               item.category === 'marketing' ? '#f59e0b' :
                               item.category === 'salary' ? '#22c55e' : '#6b7280',
                      }}>
                        {getCategoryLabel(item.category)}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: colors.text, fontSize: '14px', borderBottom: `1px solid ${colors.border}`, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.description || '-'}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#ef4444', fontSize: '14px', fontWeight: 600, borderBottom: `1px solid ${colors.border}`, textAlign: 'right' }}>
                      ฿{formatNumber(item.amount)}
                    </td>
                    <td style={{ padding: '14px 16px', color: colors.text, fontSize: '14px', borderBottom: `1px solid ${colors.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={16} color={colors.textMuted} />
                        {item.requester || '-'}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', borderBottom: `1px solid ${colors.border}` }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        background: item.paymentType === 'cash' ? '#22c55e20' : '#3b82f620',
                        color: item.paymentType === 'cash' ? '#22c55e' : '#3b82f6',
                      }}>
                        {getPaymentTypeLabel(item.paymentType)}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: colors.text, fontSize: '14px', borderBottom: `1px solid ${colors.border}` }}>
                      {item.paymentType === 'cash' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Banknote size={16} color={colors.textMuted} />
                          {language === 'th' ? 'เงินสด' : 'Cash'}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Building2 size={16} color={colors.textMuted} />
                          {item.bankType === 'payment' 
                            ? (item.accountName || item.bankName || '-')
                            : (item.bankName ? `${item.bankName} (${item.accountNumber})` : '-')
                          }
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', borderBottom: `1px solid ${colors.border}`, textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 500,
                        background: item.status === 'paid' ? '#22c55e20' : '#f59e0b20',
                        color: item.status === 'paid' ? '#22c55e' : '#f59e0b',
                      }}>
                        {getStatusLabel(item.status)}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: `1px solid ${colors.border}`, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => openEditModal(item)}
                          style={{
                            padding: '8px',
                            borderRadius: '6px',
                            border: `1px solid ${colors.border}`,
                            background: 'transparent',
                            color: colors.primary,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          title={language === 'th' ? 'แก้ไข' : 'Edit'}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => openDeleteModal(item)}
                          style={{
                            padding: '8px',
                            borderRadius: '6px',
                            border: `1px solid ${colors.border}`,
                            background: 'transparent',
                            color: colors.danger,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          title={language === 'th' ? 'ลบ' : 'Delete'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '20px',
        }}>
          <div style={{
            background: colors.card,
            borderRadius: '16px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            border: `1px solid ${colors.border}`,
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: colors.text, margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Receipt size={24} color={colors.primary} />
                {isAddModalOpen
                  ? (language === 'th' ? 'เพิ่มค่าใช้จ่าย' : 'Add Expense')
                  : (language === 'th' ? 'แก้ไขค่าใช้จ่าย' : 'Edit Expense')}
              </h2>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                  setEditingItem(null);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: colors.textMuted,
                  cursor: 'pointer',
                  padding: '8px',
                }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Date */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: colors.text }}>
                  {language === 'th' ? 'วันที่' : 'Date'} <span style={{ color: colors.danger }}>*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    background: colors.background,
                    color: colors.text,
                    fontSize: '14px',
                  }}
                />
              </div>

              {/* Website */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: colors.text }}>
                  {language === 'th' ? 'เว็บไซต์' : 'Website'}
                </label>
                <div style={{
                  padding: '12px',
                  borderRadius: '12px',
                  border: `2px solid ${colors.border}`,
                  background: colors.background,
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
                            border: `2px solid ${isSelected ? '#22c55e' : colors.border}`,
                            background: isSelected ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <Globe size={16} style={{ color: isSelected ? '#22c55e' : colors.textMuted }} />
                          <span style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? '#22c55e' : colors.text }}>
                            {website.name}
                          </span>
                          {isSelected && (
                            <CheckCircle2 size={16} style={{ color: '#22c55e' }} />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Category */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: colors.text }}>
                  {language === 'th' ? 'หมวดหมู่' : 'Category'} <span style={{ color: colors.danger }}>*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    background: colors.background,
                    color: colors.text,
                    fontSize: '14px',
                  }}
                >
                  <option value="">{language === 'th' ? '-- เลือกหมวดหมู่ --' : '-- Select Category --'}</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {language === 'th' ? cat.labelTh : cat.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: colors.text }}>
                  {language === 'th' ? 'รายละเอียด' : 'Description'}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    background: colors.background,
                    color: colors.text,
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                  placeholder={language === 'th' ? 'รายละเอียดค่าใช้จ่าย...' : 'Expense details...'}
                />
              </div>

              {/* Amount */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: colors.text }}>
                  {language === 'th' ? 'จำนวนเงิน' : 'Amount'} <span style={{ color: colors.danger }}>*</span>
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    background: colors.background,
                    color: colors.text,
                    fontSize: '14px',
                  }}
                  placeholder="0.00"
                />
              </div>

              {/* Requester */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: colors.text }}>
                  {language === 'th' ? 'ผู้เบิก' : 'Requester'}
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: colors.textMuted,
                    pointerEvents: 'none',
                  }} />
                  <input
                    type="text"
                    value={formData.requester}
                    onChange={(e) => setFormData({ ...formData, requester: e.target.value })}
                    placeholder={language === 'th' ? 'ระบุชื่อผู้เบิก...' : 'Enter requester name...'}
                    style={{
                      width: '100%',
                      height: '48px',
                      paddingLeft: '44px',
                      paddingRight: '14px',
                      borderRadius: '12px',
                      border: `2px solid ${colors.border}`,
                      background: colors.background,
                      color: colors.text,
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Payment Type */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: colors.text }}>
                  {language === 'th' ? 'ประเภทการชำระ' : 'Payment Type'}
                </label>
                <select
                  value={formData.paymentType}
                  onChange={(e) => setFormData({ ...formData, paymentType: e.target.value, bankId: '' })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    background: colors.background,
                    color: colors.text,
                    fontSize: '14px',
                  }}
                >
                  {paymentTypes.map(pt => (
                    <option key={pt.value} value={pt.value}>
                      {language === 'th' ? pt.labelTh : pt.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bank (only if payment type is bank) */}
              {formData.paymentType === 'bank' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: colors.text }}>
                    {language === 'th' ? 'ธนาคาร' : 'Bank'}
                  </label>
                  <select
                    value={formData.bankId}
                    onChange={(e) => setFormData({ ...formData, bankId: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: colors.background,
                      color: colors.text,
                      fontSize: '14px',
                    }}
                  >
                    <option value="">{language === 'th' ? '-- เลือกธนาคาร --' : '-- Select Bank --'}</option>
                    {banksList.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.type === 'payment' 
                          ? `${language === 'th' ? 'ชำระเงิน' : 'Payment'} - ${b.accountName}`
                          : `${b.bankName} - ${b.accountNumber}`
                        }
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: colors.text }}>
                  {language === 'th' ? 'สถานะ' : 'Status'}
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'unpaid' })}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '14px',
                      borderRadius: '12px',
                      border: `2px solid ${formData.status === 'unpaid' ? '#f59e0b' : colors.border}`,
                      background: formData.status === 'unpaid' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                      color: formData.status === 'unpaid' ? '#f59e0b' : colors.textMuted,
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <AlertTriangle size={18} />
                    {language === 'th' ? 'ยังไม่ชำระ' : 'Unpaid'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'paid' })}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '14px',
                      borderRadius: '12px',
                      border: `2px solid ${formData.status === 'paid' ? '#22c55e' : colors.border}`,
                      background: formData.status === 'paid' ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                      color: formData.status === 'paid' ? '#22c55e' : colors.textMuted,
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <CheckCircle2 size={18} />
                    {language === 'th' ? 'ชำระแล้ว' : 'Paid'}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: `1px solid ${colors.border}`,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                  setEditingItem(null);
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.text,
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {language === 'th' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                onClick={isAddModalOpen ? handleAdd : handleUpdate}
                disabled={isSubmitting}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryHover} 100%)`,
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    {language === 'th' ? 'กำลังบันทึก...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save size={16} />
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
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingItem(null);
        }}
        onConfirm={handleDelete}
        title={language === 'th' ? 'ยืนยันการลบค่าใช้จ่าย' : 'Confirm Delete Expense'}
        itemName={deletingItem?.description || (deletingItem ? getCategoryLabel(deletingItem.category) : '')}
        itemDetails={deletingItem ? [
          { label: language === 'th' ? 'วันที่' : 'Date', value: deletingItem.date },
          { label: language === 'th' ? 'หมวดหมู่' : 'Category', value: getCategoryLabel(deletingItem.category) },
          { label: language === 'th' ? 'จำนวนเงิน' : 'Amount', value: `฿${formatNumber(deletingItem.amount)}` }
        ] : []}
        loading={isSubmitting}
      />

      {/* Animation styles */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
