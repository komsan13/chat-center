'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, Plus, Search, Edit2, Trash2, Filter, X, Save, AlertTriangle, CheckCircle2, XOctagon, Info, RefreshCw, Building2, Globe, User, FileText, Printer, Download, TrendingUp, Shield, Copy } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import html2canvas from 'html2canvas';

interface Salary {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNickname: string;
  month: string;
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
  createdAt: string;
  bankName?: string;
  accountNumber?: string;
}

interface Website {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  fullName: string;
  nickname: string;
  position: string;
  baseSalary: number;
  websites: string[];
  bankName?: string;
  accountNumber?: string;
}

interface SalaryBase {
  id: string;
  position: string;
  baseSalary: number;
  positionAllowance: number;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

const statusOptions = [
  { value: 'unpaid', labelTh: 'ยังไม่จ่าย', labelEn: 'Unpaid' },
  { value: 'paid', labelTh: 'จ่ายแล้ว', labelEn: 'Paid' },
];

export default function SalariesPage() {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  const [filterStatus, setFilterStatus] = useState('');
  const [filterWebsite, setFilterWebsite] = useState('all');
  const [websites, setWebsites] = useState<Website[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaryBases, setSalaryBases] = useState<SalaryBase[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState<Salary | null>(null);
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [slipData, setSlipData] = useState<Salary | null>(null);
  const slipRef = useRef<HTMLDivElement>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    employeeNickname: '',
    month: new Date().toISOString().slice(0, 7),
    websiteId: '',
    websiteName: '',
    position: '',
    baseSalary: 0,
    positionAllowance: 0,
    commission: 0,
    diligenceAllowance: 0,
    shiftAllowance: 0,
    overtime: 0,
    bonus: 0,
    status: 'unpaid',
    bankName: '',
    accountNumber: '',
  });

  const colors = {
    background: theme === 'dark' ? '#1D1E24' : '#F5F7FA',
    card: theme === 'dark' ? '#23262B' : '#FFFFFF',
    text: theme === 'dark' ? '#FFFFFF' : '#1D1E24',
    textMuted: theme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
    border: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    primary: '#22c55e',
    danger: '#ef4444',
    warning: '#f59e0b',
  };

  // Toast functions
  const addToast = (type: Toast['type'], title: string, message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Fetch data
  const fetchSalaries = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterMonth) params.append('month', filterMonth);
      if (filterStatus) params.append('status', filterStatus);
      if (filterWebsite && filterWebsite !== 'all') params.append('websiteId', filterWebsite);
      
      const response = await fetch(`/api/salaries?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        setSalaries(result.data || []);
      } else {
        addToast('error', language === 'th' ? 'ข้อผิดพลาด' : 'Error', 'Failed to fetch salaries');
      }
    } catch (error) {
      console.error('Error:', error);
      addToast('error', language === 'th' ? 'ข้อผิดพลาด' : 'Error', 'Failed to fetch salaries');
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterStatus, filterWebsite, language]);

  const fetchWebsites = async () => {
    try {
      const response = await fetch('/api/websites');
      const result = await response.json();
      if (result.success) {
        setWebsites(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching websites:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      const result = await response.json();
      if (result.success) {
        // Parse websites JSON string to array
        const parsedEmployees = (result.data || []).map((emp: Employee & { websites: string | string[] }) => ({
          ...emp,
          websites: typeof emp.websites === 'string' ? JSON.parse(emp.websites || '[]') : (emp.websites || [])
        }));
        setEmployees(parsedEmployees);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchSalaryBases = async () => {
    try {
      const response = await fetch('/api/salary-base');
      const result = await response.json();
      if (result.success) {
        setSalaryBases(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching salary bases:', error);
    }
  };

  useEffect(() => {
    fetchSalaries();
    fetchWebsites();
    fetchEmployees();
    fetchSalaryBases();
  }, [fetchSalaries]);

  // Format number
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('th-TH').format(num);
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    const option = statusOptions.find(s => s.value === status);
    return option ? (language === 'th' ? option.labelTh : option.labelEn) : status;
  };

  // Calculate total salary
  const calculateTotal = () => {
    return (formData.baseSalary || 0) + 
           (formData.positionAllowance || 0) + 
           (formData.commission || 0) + 
           (formData.diligenceAllowance || 0) + 
           (formData.shiftAllowance || 0) + 
           (formData.overtime || 0) + 
           (formData.bonus || 0);
  };

  // Modal functions
  const openAddModal = () => {
    setFormData({
      employeeId: '',
      employeeName: '',
      employeeNickname: '',
      month: filterMonth || new Date().toISOString().slice(0, 7),
      websiteId: '',
      websiteName: '',
      position: '',
      baseSalary: 0,
      positionAllowance: 0,
      commission: 0,
      diligenceAllowance: 0,
      shiftAllowance: 0,
      overtime: 0,
      bonus: 0,
      status: 'unpaid',
    });
    setModalMode('add');
    setShowModal(true);
  };

  const openEditModal = (salary: Salary) => {
    setSelectedSalary(salary);
    setFormData({
      employeeId: salary.employeeId,
      employeeName: salary.employeeName,
      employeeNickname: salary.employeeNickname,
      month: salary.month,
      websiteId: salary.websiteId,
      websiteName: salary.websiteName,
      position: salary.position,
      baseSalary: salary.baseSalary,
      positionAllowance: salary.positionAllowance,
      commission: salary.commission,
      diligenceAllowance: salary.diligenceAllowance,
      shiftAllowance: salary.shiftAllowance,
      overtime: salary.overtime,
      bonus: salary.bonus,
      status: salary.status,
    });
    setModalMode('edit');
    setShowModal(true);
  };

  const openDeleteModal = (salary: Salary) => {
    setSelectedSalary(salary);
    setShowDeleteModal(true);
  };

  const openSlipModal = (salary: Salary) => {
    setSlipData(salary);
    setShowSlipModal(true);
  };

  // Handle employee selection
  const handleEmployeeSelect = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (employee) {
      // Get website names from employee's websites (stored as names, not IDs)
      const empWebsites = employee.websites || [];
      // websites อาจเก็บเป็นชื่อหรือ ID ต้อง handle ทั้ง 2 กรณี
      const websiteNames = empWebsites.map(webNameOrId => {
        // ลองหาจาก ID ก่อน
        const webById = websites.find(w => w.id === webNameOrId);
        if (webById) return webById.name;
        // ถ้าไม่เจอ ลองหาจากชื่อ
        const webByName = websites.find(w => w.name === webNameOrId);
        if (webByName) return webByName.name;
        // ถ้าไม่เจอเลย return ค่าเดิม
        return webNameOrId;
      }).filter(Boolean).join(', ');
      
      // Get salary info from SalaryBase by position
      const salaryBase = salaryBases.find(sb => sb.position === employee.position);
      
      setFormData(prev => ({
        ...prev,
        employeeId: employee.id,
        employeeName: employee.fullName,
        employeeNickname: employee.nickname || '',
        position: employee.position || '',
        baseSalary: salaryBase?.baseSalary || 0,
        positionAllowance: salaryBase?.positionAllowance || 0,
        websiteId: empWebsites.join(','),
        websiteName: websiteNames,
        bankName: employee.bankName || '',
        accountNumber: employee.accountNumber || '',
      }));
    }
  };

  // Handle website selection
  const handleWebsiteSelect = (websiteId: string) => {
    const website = websites.find(w => w.id === websiteId);
    if (website) {
      setFormData(prev => ({
        ...prev,
        websiteId: website.id,
        websiteName: website.name,
      }));
    }
  };

  // Save salary
  const handleSave = async () => {
    try {
      const method = modalMode === 'add' ? 'POST' : 'PUT';
      const body = modalMode === 'edit' ? { ...formData, id: selectedSalary?.id } : formData;
      
      const response = await fetch('/api/salaries', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      const result = await response.json();
      
      if (result.success) {
        addToast('success', 
          language === 'th' ? 'สำเร็จ' : 'Success',
          modalMode === 'add' 
            ? (language === 'th' ? 'เพิ่มข้อมูลเงินเดือนสำเร็จ' : 'Salary record created')
            : (language === 'th' ? 'อัพเดทข้อมูลเงินเดือนสำเร็จ' : 'Salary record updated')
        );
        setShowModal(false);
        fetchSalaries();
      } else {
        addToast('error', language === 'th' ? 'ข้อผิดพลาด' : 'Error', result.error);
      }
    } catch (error) {
      console.error('Error:', error);
      addToast('error', language === 'th' ? 'ข้อผิดพลาด' : 'Error', 'Failed to save salary record');
    }
  };

  // Delete salary
  const handleDelete = async () => {
    if (!selectedSalary) return;
    
    try {
      const response = await fetch(`/api/salaries?id=${selectedSalary.id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        addToast('success', 
          language === 'th' ? 'สำเร็จ' : 'Success',
          language === 'th' ? 'ลบข้อมูลเงินเดือนสำเร็จ' : 'Salary record deleted'
        );
        setShowDeleteModal(false);
        setSelectedSalary(null);
        fetchSalaries();
      } else {
        addToast('error', language === 'th' ? 'ข้อผิดพลาด' : 'Error', result.error);
      }
    } catch (error) {
      console.error('Error:', error);
      addToast('error', language === 'th' ? 'ข้อผิดพลาด' : 'Error', 'Failed to delete salary record');
    }
  };

  // Download salary slip as JPG
  const handleDownloadSlip = async () => {
    if (slipRef.current) {
      try {
        const canvas = await html2canvas(slipRef.current, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
        });
        
        const link = document.createElement('a');
        link.download = `salary-slip-${slipData?.employeeName}-${slipData?.month}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
        
        addToast('success', 
          language === 'th' ? 'สำเร็จ' : 'Success',
          language === 'th' ? 'ดาวน์โหลดสลิปเงินเดือนสำเร็จ' : 'Salary slip downloaded successfully'
        );
      } catch (error) {
        console.error('Error downloading slip:', error);
        addToast('error', 
          language === 'th' ? 'ข้อผิดพลาด' : 'Error',
          language === 'th' ? 'ไม่สามารถดาวน์โหลดสลิปได้' : 'Failed to download slip'
        );
      }
    }
  };

  // Copy salary info to clipboard
  const handleCopySlip = async () => {
    if (slipData) {
      // ดึงข้อมูลธนาคารจาก employee
      const employee = employees.find(e => e.id === slipData.employeeId);
      const bankName = employee?.bankName || slipData.bankName || '-';
      const accountNumber = employee?.accountNumber || slipData.accountNumber || '-';
      
      const copyText = `ชื่อ: ${slipData.employeeName}
ชื่อบัญชี: ${bankName}
เลขบัญชี: ${accountNumber}
ยอดรวมสุทธิ: ฿${formatNumber(slipData.totalSalary || 0)}`;

      try {
        await navigator.clipboard.writeText(copyText);
        addToast('success', 
          language === 'th' ? 'คัดลอกแล้ว' : 'Copied',
          language === 'th' ? 'คัดลอกข้อมูลไปยังคลิปบอร์ดแล้ว' : 'Copied to clipboard'
        );
      } catch (error) {
        console.error('Error copying:', error);
        addToast('error', 
          language === 'th' ? 'ข้อผิดพลาด' : 'Error',
          language === 'th' ? 'ไม่สามารถคัดลอกได้' : 'Failed to copy'
        );
      }
    }
  };

  // Filter salaries
  const filteredSalaries = salaries.filter(salary => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (!salary.employeeName?.toLowerCase().includes(search) &&
          !salary.employeeNickname?.toLowerCase().includes(search) &&
          !salary.employeeId?.toLowerCase().includes(search)) {
        return false;
      }
    }
    return true;
  });

  // Calculate totals
  const totalBaseSalary = filteredSalaries.reduce((sum, s) => sum + (s.baseSalary || 0), 0);
  const totalAllSalary = filteredSalaries.reduce((sum, s) => sum + (s.totalSalary || 0), 0);

  // Format month display
  const formatMonth = (month: string) => {
    if (!month) return '-';
    const [year, m] = month.split('-');
    const monthNames = language === 'th' 
      ? ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(m) - 1]} ${year}`;
  };

  return (
    <div style={{ padding: '24px', background: colors.background, minHeight: '100vh' }}>
      {/* Toast Notifications */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              padding: '16px 20px',
              borderRadius: '12px',
              background: toast.type === 'success' ? '#22c55e' : toast.type === 'error' ? '#ef4444' : toast.type === 'warning' ? '#f59e0b' : '#3b82f6',
              color: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              minWidth: '300px',
              animation: 'slideIn 0.3s ease',
            }}
          >
            {toast.type === 'success' && <CheckCircle2 size={20} />}
            {toast.type === 'error' && <XOctagon size={20} />}
            {toast.type === 'warning' && <AlertTriangle size={20} />}
            {toast.type === 'info' && <Info size={20} />}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>{toast.title}</div>
              <div style={{ fontSize: '13px', opacity: 0.9 }}>{toast.message}</div>
            </div>
            <button onClick={() => removeToast(toast.id)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: colors.text, margin: 0 }}>
            {language === 'th' ? 'เงินเดือนพนักงาน' : 'Employee Salaries'}
          </h1>
          <p style={{ color: colors.textMuted, marginTop: '4px' }}>
            {language === 'th' ? 'จัดการข้อมูลเงินเดือนและออกสลิปเงินเดือน' : 'Manage salary records and generate payslips'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={fetchSalaries}
            style={{
              padding: '12px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: colors.card,
              color: colors.text,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={language === 'th' ? 'รีเฟรช' : 'Refresh'}
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={openAddModal}
            style={{
              padding: '12px 20px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
              fontSize: '14px',
              boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
            }}
          >
            <Plus size={20} />
            {language === 'th' ? 'เพิ่มเงินเดือน' : 'Add Salary'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: colors.card, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
          <div style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '8px' }}>
            {language === 'th' ? 'จำนวนพนักงาน' : 'Employees'}
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: colors.text }}>
            {filteredSalaries.length}
          </div>
        </div>
        <div style={{ background: colors.card, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
          <div style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '8px' }}>
            {language === 'th' ? 'ฐานเงินเดือนรวม' : 'Total Base Salary'}
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#3b82f6' }}>
            ฿{formatNumber(totalBaseSalary)}
          </div>
        </div>
        <div style={{ background: colors.card, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
          <div style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '8px' }}>
            {language === 'th' ? 'เงินเดือนรวมทั้งหมด' : 'Total All Salary'}
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: colors.primary }}>
            ฿{formatNumber(totalAllSalary)}
          </div>
        </div>
        <div style={{ background: colors.card, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
          <div style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '8px' }}>
            {language === 'th' ? 'จ่ายแล้ว / ยังไม่จ่าย' : 'Paid / Unpaid'}
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: colors.text }}>
            <span style={{ color: colors.primary }}>{filteredSalaries.filter(s => s.status === 'paid').length}</span>
            {' / '}
            <span style={{ color: colors.warning }}>{filteredSalaries.filter(s => s.status === 'unpaid').length}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: colors.card, borderRadius: '12px', padding: '20px', marginBottom: '24px', border: `1px solid ${colors.border}` }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }} />
            <input
              type="text"
              placeholder={language === 'th' ? 'ค้นหาพนักงาน...' : 'Search employee...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 40px',
                borderRadius: '8px',
                border: `1px solid ${colors.border}`,
                background: colors.background,
                color: colors.text,
                fontSize: '14px',
              }}
            />
          </div>
          
          {/* Month Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color={colors.textMuted} />
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: `1px solid ${colors.border}`,
                background: colors.background,
                color: colors.text,
                fontSize: '14px',
              }}
            />
          </div>

          {/* Website Filter */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              onClick={() => setFilterWebsite('all')}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                background: filterWebsite === 'all' ? '#22c55e' : colors.background,
                color: filterWebsite === 'all' ? 'white' : colors.text,
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'all 0.2s',
              }}
            >
              {language === 'th' ? 'ทั้งหมด' : 'All'}
            </button>
            {websites.map(website => (
              <button
                key={website.id}
                onClick={() => setFilterWebsite(website.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  background: filterWebsite === website.id ? '#22c55e' : colors.background,
                  color: filterWebsite === website.id ? 'white' : colors.text,
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Globe size={14} />
                {website.name}
              </button>
            ))}
          </div>
          
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: colors.background,
              color: colors.text,
              fontSize: '14px',
            }}
          >
            <option value="">{language === 'th' ? 'สถานะทั้งหมด' : 'All Status'}</option>
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {language === 'th' ? option.labelTh : option.labelEn}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: colors.card, borderRadius: '12px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, borderBottom: `1px solid ${colors.border}` }}>
                  {language === 'th' ? 'รหัส/ชื่อพนักงาน' : 'ID/Employee'}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, borderBottom: `1px solid ${colors.border}` }}>
                  {language === 'th' ? 'เว็บ' : 'Website'}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, borderBottom: `1px solid ${colors.border}` }}>
                  {language === 'th' ? 'ตำแหน่ง' : 'Position'}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: colors.textMuted, borderBottom: `1px solid ${colors.border}` }}>
                  {language === 'th' ? 'ฐานเงินเดือน' : 'Base'}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: colors.textMuted, borderBottom: `1px solid ${colors.border}` }}>
                  {language === 'th' ? 'ค่าตำแหน่ง' : 'Position'}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: colors.textMuted, borderBottom: `1px solid ${colors.border}` }}>
                  {language === 'th' ? 'คอม' : 'Comm.'}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: colors.textMuted, borderBottom: `1px solid ${colors.border}` }}>
                  {language === 'th' ? 'เบี้ยขยัน' : 'Diligence'}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: colors.textMuted, borderBottom: `1px solid ${colors.border}` }}>
                  {language === 'th' ? 'ค่ากะ' : 'Shift'}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: colors.textMuted, borderBottom: `1px solid ${colors.border}` }}>
                  OT
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: colors.textMuted, borderBottom: `1px solid ${colors.border}` }}>
                  {language === 'th' ? 'โบนัส' : 'Bonus'}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: colors.textMuted, borderBottom: `1px solid ${colors.border}` }}>
                  {language === 'th' ? 'รวม' : 'Total'}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: colors.textMuted, borderBottom: `1px solid ${colors.border}` }}>
                  {language === 'th' ? 'สถานะ' : 'Status'}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: colors.textMuted, borderBottom: `1px solid ${colors.border}` }}>
                  {language === 'th' ? 'จัดการ' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={13} style={{ padding: '40px', textAlign: 'center', color: colors.textMuted }}>
                    {language === 'th' ? 'กำลังโหลด...' : 'Loading...'}
                  </td>
                </tr>
              ) : filteredSalaries.length === 0 ? (
                <tr>
                  <td colSpan={13} style={{ padding: '40px', textAlign: 'center', color: colors.textMuted }}>
                    {language === 'th' ? 'ไม่พบข้อมูล' : 'No data found'}
                  </td>
                </tr>
              ) : (
                filteredSalaries.map(item => (
                  <tr key={item.id} style={{ transition: 'background 0.2s' }}>
                    <td style={{ padding: '14px 16px', borderBottom: `1px solid ${colors.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '14px' }}>
                          {item.employeeName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: colors.text, fontSize: '14px' }}>
                            {item.employeeName || '-'}
                            {item.employeeNickname && <span style={{ color: colors.textMuted, fontWeight: 400 }}> ({item.employeeNickname})</span>}
                          </div>
                          <div style={{ fontSize: '12px', color: colors.textMuted }}>{item.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: colors.text, fontSize: '14px', borderBottom: `1px solid ${colors.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Globe size={14} color={colors.textMuted} />
                        {item.websiteName || item.websiteId || '-'}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: colors.text, fontSize: '14px', borderBottom: `1px solid ${colors.border}` }}>
                      {item.position || '-'}
                    </td>
                    <td style={{ padding: '14px 16px', color: colors.text, fontSize: '14px', textAlign: 'right', borderBottom: `1px solid ${colors.border}` }}>
                      ฿{formatNumber(item.baseSalary || 0)}
                    </td>
                    <td style={{ padding: '14px 16px', color: item.positionAllowance > 0 ? '#3b82f6' : colors.textMuted, fontSize: '14px', textAlign: 'right', borderBottom: `1px solid ${colors.border}` }}>
                      {item.positionAllowance > 0 ? `฿${formatNumber(item.positionAllowance)}` : '-'}
                    </td>
                    <td style={{ padding: '14px 16px', color: item.commission > 0 ? '#8b5cf6' : colors.textMuted, fontSize: '14px', textAlign: 'right', borderBottom: `1px solid ${colors.border}` }}>
                      {item.commission > 0 ? `฿${formatNumber(item.commission)}` : '-'}
                    </td>
                    <td style={{ padding: '14px 16px', color: item.diligenceAllowance > 0 ? colors.primary : colors.textMuted, fontSize: '14px', textAlign: 'right', borderBottom: `1px solid ${colors.border}` }}>
                      {item.diligenceAllowance > 0 ? `฿${formatNumber(item.diligenceAllowance)}` : '-'}
                    </td>
                    <td style={{ padding: '14px 16px', color: item.shiftAllowance > 0 ? '#f59e0b' : colors.textMuted, fontSize: '14px', textAlign: 'right', borderBottom: `1px solid ${colors.border}` }}>
                      {item.shiftAllowance > 0 ? `฿${formatNumber(item.shiftAllowance)}` : '-'}
                    </td>
                    <td style={{ padding: '14px 16px', color: item.overtime > 0 ? '#ef4444' : colors.textMuted, fontSize: '14px', textAlign: 'right', borderBottom: `1px solid ${colors.border}` }}>
                      {item.overtime > 0 ? `฿${formatNumber(item.overtime)}` : '-'}
                    </td>
                    <td style={{ padding: '14px 16px', color: item.bonus > 0 ? '#ec4899' : colors.textMuted, fontSize: '14px', textAlign: 'right', borderBottom: `1px solid ${colors.border}` }}>
                      {item.bonus > 0 ? `฿${formatNumber(item.bonus)}` : '-'}
                    </td>
                    <td style={{ padding: '14px 16px', color: colors.primary, fontSize: '14px', fontWeight: 700, textAlign: 'right', borderBottom: `1px solid ${colors.border}` }}>
                      ฿{formatNumber(item.totalSalary || 0)}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', borderBottom: `1px solid ${colors.border}` }}>
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
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          onClick={() => openSlipModal(item)}
                          style={{
                            padding: '8px',
                            borderRadius: '6px',
                            border: `1px solid ${colors.border}`,
                            background: 'transparent',
                            color: '#8b5cf6',
                            cursor: 'pointer',
                          }}
                          title={language === 'th' ? 'ออกสลิป' : 'Print Slip'}
                        >
                          <FileText size={16} />
                        </button>
                        <button
                          onClick={() => openEditModal(item)}
                          style={{
                            padding: '8px',
                            borderRadius: '6px',
                            border: `1px solid ${colors.border}`,
                            background: 'transparent',
                            color: colors.primary,
                            cursor: 'pointer',
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
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }}>
          <div style={{
            background: colors.card,
            borderRadius: '16px',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflow: 'auto',
            border: `1px solid ${colors.border}`,
          }}>
            <div style={{ padding: '24px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, color: colors.text, fontSize: '20px', fontWeight: 700 }}>
                {modalMode === 'add' 
                  ? (language === 'th' ? 'เพิ่มเงินเดือน' : 'Add Salary')
                  : (language === 'th' ? 'แก้ไขเงินเดือน' : 'Edit Salary')
                }
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', padding: '4px' }}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                {/* Employee */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: colors.text }}>
                    {language === 'th' ? 'พนักงาน *' : 'Employee *'}
                  </label>
                  <select
                    value={formData.employeeId}
                    onChange={(e) => handleEmployeeSelect(e.target.value)}
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
                    <option value="">{language === 'th' ? '-- เลือกพนักงาน --' : '-- Select Employee --'}</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} {emp.nickname ? `(${emp.nickname})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Month */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: colors.text }}>
                    {language === 'th' ? 'ประจำเดือน *' : 'Month *'}
                  </label>
                  <input
                    type="month"
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
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

                {/* Website - แสดงตามข้อมูลพนักงาน (อ่านอย่างเดียว) */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: colors.text }}>
                    {language === 'th' ? 'เว็บที่รับผิดชอบ' : 'Assigned Websites'}
                    <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 400, marginLeft: '8px' }}>
                      ({language === 'th' ? 'ตามข้อมูลพนักงาน' : 'From employee data'})
                    </span>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '40px', alignItems: 'center' }}>
                    {formData.employeeId ? (
                      (() => {
                        const employee = employees.find(e => e.id === formData.employeeId);
                        const empWebsites = employee?.websites || [];
                        return empWebsites.length > 0 ? (
                          empWebsites.map((webNameOrId, index) => {
                            // ลองหาจาก ID หรือ Name
                            const website = websites.find(w => w.id === webNameOrId || w.name === webNameOrId);
                            const displayName = website?.name || webNameOrId;
                            return (
                              <div
                                key={index}
                                style={{
                                  padding: '8px 16px',
                                  borderRadius: '20px',
                                  background: '#22c55e',
                                  color: 'white',
                                  fontSize: '13px',
                                  fontWeight: 500,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                              >
                                <Globe size={14} />
                                {displayName}
                              </div>
                            );
                          })
                        ) : (
                          <span style={{ color: colors.textMuted, fontSize: '14px' }}>
                            {language === 'th' ? 'ไม่มีเว็บที่ผูก' : 'No assigned websites'}
                          </span>
                        );
                      })()
                    ) : (
                      <span style={{ color: colors.textMuted, fontSize: '14px' }}>
                        {language === 'th' ? 'กรุณาเลือกพนักงานก่อน' : 'Please select an employee first'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Position - ตามข้อมูลพนักงาน (อ่านอย่างเดียว) */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: colors.text }}>
                    {language === 'th' ? 'ตำแหน่ง' : 'Position'}
                    <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 400, marginLeft: '8px' }}>
                      ({language === 'th' ? 'ตามข้อมูลพนักงาน' : 'From employee data'})
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: theme === 'dark' ? '#1a1a1a' : '#f5f5f5',
                      color: colors.textMuted,
                      fontSize: '14px',
                      cursor: 'not-allowed',
                    }}
                    placeholder={language === 'th' ? 'เลือกพนักงานก่อน' : 'Select employee first'}
                  />
                </div>

                {/* Base Salary - ตามฐานเงินเดือน (อ่านอย่างเดียว) */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: colors.text }}>
                    {language === 'th' ? 'ฐานเงินเดือน' : 'Base Salary'}
                    <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 400, marginLeft: '8px' }}>
                      ({language === 'th' ? 'ตามตำแหน่ง' : 'From position'})
                    </span>
                  </label>
                  <div style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    background: theme === 'dark' ? '#1a1a1a' : '#f5f5f5',
                    color: formData.baseSalary > 0 ? '#3b82f6' : colors.textMuted,
                    fontSize: '14px',
                    fontWeight: formData.baseSalary > 0 ? 600 : 400,
                  }}>
                    {formData.baseSalary > 0 ? `฿${formatNumber(formData.baseSalary)}` : (language === 'th' ? 'เลือกพนักงานก่อน' : 'Select employee first')}
                  </div>
                </div>

                {/* Position Allowance - ตามฐานเงินเดือน (อ่านอย่างเดียว) */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: colors.text }}>
                    {language === 'th' ? 'ค่าตำแหน่ง' : 'Position Allowance'}
                    <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 400, marginLeft: '8px' }}>
                      ({language === 'th' ? 'ตามตำแหน่ง' : 'From position'})
                    </span>
                  </label>
                  <div style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    background: theme === 'dark' ? '#1a1a1a' : '#f5f5f5',
                    color: formData.positionAllowance > 0 ? '#8b5cf6' : colors.textMuted,
                    fontSize: '14px',
                    fontWeight: formData.positionAllowance > 0 ? 600 : 400,
                  }}>
                    {formData.positionAllowance > 0 ? `฿${formatNumber(formData.positionAllowance)}` : (language === 'th' ? '-' : '-')}
                  </div>
                </div>

                {/* Commission */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: colors.text }}>
                    {language === 'th' ? 'ค่าคอม' : 'Commission'}
                  </label>
                  <input
                    type="number"
                    value={formData.commission}
                    onChange={(e) => setFormData({ ...formData, commission: parseFloat(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: colors.background,
                      color: colors.text,
                      fontSize: '14px',
                    }}
                    placeholder="0"
                  />
                </div>

                {/* Diligence Allowance */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: colors.text }}>
                    {language === 'th' ? 'เบี้ยขยัน' : 'Diligence Allowance'}
                  </label>
                  <input
                    type="number"
                    value={formData.diligenceAllowance}
                    onChange={(e) => setFormData({ ...formData, diligenceAllowance: parseFloat(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: colors.background,
                      color: colors.text,
                      fontSize: '14px',
                    }}
                    placeholder="0"
                  />
                </div>

                {/* Shift Allowance */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: colors.text }}>
                    {language === 'th' ? 'ค่ากะ' : 'Shift Allowance'}
                  </label>
                  <input
                    type="number"
                    value={formData.shiftAllowance}
                    onChange={(e) => setFormData({ ...formData, shiftAllowance: parseFloat(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: colors.background,
                      color: colors.text,
                      fontSize: '14px',
                    }}
                    placeholder="0"
                  />
                </div>

                {/* Overtime */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: colors.text }}>
                    OT
                  </label>
                  <input
                    type="number"
                    value={formData.overtime}
                    onChange={(e) => setFormData({ ...formData, overtime: parseFloat(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: colors.background,
                      color: colors.text,
                      fontSize: '14px',
                    }}
                    placeholder="0"
                  />
                </div>

                {/* Bonus */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: colors.text }}>
                    {language === 'th' ? 'โบนัส' : 'Bonus'}
                  </label>
                  <input
                    type="number"
                    value={formData.bonus}
                    onChange={(e) => setFormData({ ...formData, bonus: parseFloat(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: colors.background,
                      color: colors.text,
                      fontSize: '14px',
                    }}
                    placeholder="0"
                  />
                </div>

                {/* Status */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: colors.text }}>
                    {language === 'th' ? 'สถานะ' : 'Status'}
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {statusOptions.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, status: option.value })}
                        style={{
                          flex: 1,
                          padding: '12px',
                          borderRadius: '8px',
                          border: formData.status === option.value ? 'none' : `1px solid ${colors.border}`,
                          background: formData.status === option.value 
                            ? (option.value === 'paid' ? '#22c55e' : '#f59e0b')
                            : 'transparent',
                          color: formData.status === option.value ? 'white' : colors.text,
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 500,
                          transition: 'all 0.2s',
                        }}
                      >
                        {language === 'th' ? option.labelTh : option.labelEn}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Total */}
              <div style={{ 
                marginTop: '24px', 
                padding: '20px', 
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', 
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ color: 'white', fontSize: '18px', fontWeight: 600 }}>
                  {language === 'th' ? 'เงินเดือนรวม' : 'Total Salary'}
                </span>
                <span style={{ color: 'white', fontSize: '28px', fontWeight: 700 }}>
                  ฿{formatNumber(calculateTotal())}
                </span>
              </div>
            </div>
            
            <div style={{ padding: '24px', borderTop: `1px solid ${colors.border}`, display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.text,
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                {language === 'th' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                onClick={handleSave}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Save size={18} />
                {language === 'th' ? 'บันทึก' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedSalary && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: colors.card,
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center',
            border: `1px solid ${colors.border}`,
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#ef444420',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <AlertTriangle size={32} color="#ef4444" />
            </div>
            <h3 style={{ margin: '0 0 12px', color: colors.text, fontSize: '20px', fontWeight: 700 }}>
              {language === 'th' ? 'ยืนยันการลบ' : 'Confirm Delete'}
            </h3>
            <p style={{ margin: '0 0 24px', color: colors.textMuted, fontSize: '14px' }}>
              {language === 'th' 
                ? `คุณต้องการลบข้อมูลเงินเดือนของ "${selectedSalary.employeeName}" หรือไม่?`
                : `Do you want to delete salary record for "${selectedSalary.employeeName}"?`}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.text,
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                {language === 'th' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                onClick={handleDelete}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#ef4444',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Trash2 size={18} />
                {language === 'th' ? 'ลบ' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Salary Slip Modal */}
      {showSlipModal && slipData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}>
            {/* Modal Header */}
            <div style={{ 
              padding: '20px 24px', 
              background: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
              borderRadius: '24px 24px 0 0',
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  background: 'rgba(255,255,255,0.2)', 
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FileText size={22} color="white" />
                </div>
                <h2 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: 700 }}>
                  {language === 'th' ? 'สลิปเงินเดือน' : 'Salary Slip'}
                </h2>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={handleCopySlip}
                  style={{ 
                    padding: '10px 18px', 
                    borderRadius: '12px', 
                    border: 'none', 
                    background: 'rgba(255,255,255,0.2)', 
                    color: 'white', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    fontSize: '14px',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                  }}
                >
                  <Copy size={18} />
                  {language === 'th' ? 'คัดลอก' : 'Copy'}
                </button>
                <button 
                  onClick={handleDownloadSlip}
                  style={{ 
                    padding: '10px 18px', 
                    borderRadius: '12px', 
                    border: 'none', 
                    background: 'white', 
                    color: '#059669', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    fontSize: '14px',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    transition: 'all 0.2s',
                  }}
                >
                  <Download size={18} />
                  {language === 'th' ? 'ดาวน์โหลด' : 'Download'}
                </button>
                <button 
                  onClick={() => setShowSlipModal(false)} 
                  style={{ 
                    background: 'rgba(255,255,255,0.2)', 
                    border: 'none', 
                    color: 'white', 
                    cursor: 'pointer', 
                    padding: '10px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={22} />
                </button>
              </div>
            </div>
            
            {/* Slip Content */}
            <div ref={slipRef} style={{ padding: '24px' }}>
              <div className="slip-container" style={{ 
                background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              }}>
                {/* Employee Info Section */}
                <div style={{ padding: '24px' }}>
                  <div className="slip-info" style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '16px', 
                    marginBottom: '24px',
                    background: '#f8fafc',
                    padding: '20px',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                  }}>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                        {language === 'th' ? 'ชื่อพนักงาน' : 'Employee Name'}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>{slipData.employeeName}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                        {language === 'th' ? 'รหัสพนักงาน' : 'Employee ID'}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#475569', fontFamily: 'monospace' }}>{slipData.employeeId}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                        {language === 'th' ? 'ตำแหน่ง' : 'Position'}
                      </div>
                      <div style={{ 
                        display: 'inline-flex',
                        padding: '4px 12px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}>
                        {slipData.position || '-'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                        {language === 'th' ? 'ประจำเดือน' : 'Period'}
                      </div>
                      <div style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        background: '#fef3c7',
                        borderRadius: '6px',
                        color: '#b45309',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}>
                        <Calendar size={14} />
                        {formatMonth(slipData.month)}
                      </div>
                    </div>
                  </div>

                  {/* Earnings Section - Professional Table Style */}
                  <div style={{ marginBottom: '20px' }}>
                    {/* Table Header */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: '#1e293b',
                      borderRadius: '8px 8px 0 0',
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'white', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {language === 'th' ? 'รายการ' : 'Description'}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'white', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {language === 'th' ? 'จำนวน (บาท)' : 'Amount (THB)'}
                      </span>
                    </div>

                    {/* Earnings Items - Clean Professional Style */}
                    <div style={{ border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                      {/* Base Salary - Always show */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '14px 16px',
                        background: '#ffffff',
                        borderBottom: '1px solid #f1f5f9',
                      }}>
                        <span style={{ fontSize: '14px', color: '#334155', fontWeight: 500 }}>
                          {language === 'th' ? 'เงินเดือนพื้นฐาน' : 'Base Salary'}
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                          ฿{formatNumber(slipData.baseSalary || 0)}
                        </span>
                      </div>

                      {slipData.positionAllowance > 0 && (
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: '14px 16px',
                          background: '#f8fafc',
                          borderBottom: '1px solid #f1f5f9',
                        }}>
                          <span style={{ fontSize: '14px', color: '#334155', fontWeight: 500 }}>
                            {language === 'th' ? 'ค่าตำแหน่ง' : 'Position Allowance'}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                            ฿{formatNumber(slipData.positionAllowance)}
                          </span>
                        </div>
                      )}

                      {slipData.commission > 0 && (
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: '14px 16px',
                          background: '#ffffff',
                          borderBottom: '1px solid #f1f5f9',
                        }}>
                          <span style={{ fontSize: '14px', color: '#334155', fontWeight: 500 }}>
                            {language === 'th' ? 'ค่าคอมมิชชั่น' : 'Commission'}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                            ฿{formatNumber(slipData.commission)}
                          </span>
                        </div>
                      )}

                      {slipData.diligenceAllowance > 0 && (
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: '14px 16px',
                          background: '#f8fafc',
                          borderBottom: '1px solid #f1f5f9',
                        }}>
                          <span style={{ fontSize: '14px', color: '#334155', fontWeight: 500 }}>
                            {language === 'th' ? 'เบี้ยขยัน' : 'Diligence Allowance'}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                            ฿{formatNumber(slipData.diligenceAllowance)}
                          </span>
                        </div>
                      )}

                      {slipData.shiftAllowance > 0 && (
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: '14px 16px',
                          background: '#ffffff',
                          borderBottom: '1px solid #f1f5f9',
                        }}>
                          <span style={{ fontSize: '14px', color: '#334155', fontWeight: 500 }}>
                            {language === 'th' ? 'ค่ากะ' : 'Shift Allowance'}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                            ฿{formatNumber(slipData.shiftAllowance)}
                          </span>
                        </div>
                      )}

                      {slipData.overtime > 0 && (
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: '14px 16px',
                          background: '#f8fafc',
                          borderBottom: '1px solid #f1f5f9',
                        }}>
                          <span style={{ fontSize: '14px', color: '#334155', fontWeight: 500 }}>
                            {language === 'th' ? 'ค่าล่วงเวลา (OT)' : 'Overtime'}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                            ฿{formatNumber(slipData.overtime)}
                          </span>
                        </div>
                      )}

                      {slipData.bonus > 0 && (
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: '14px 16px',
                          background: '#ffffff',
                        }}>
                          <span style={{ fontSize: '14px', color: '#334155', fontWeight: 500 }}>
                            {language === 'th' ? 'โบนัส' : 'Bonus'}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                            ฿{formatNumber(slipData.bonus)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Net Salary Total */}
                  <div className="slip-total" style={{ 
                    background: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
                    padding: '20px 24px',
                    borderRadius: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {/* Decorative circles */}
                    <div style={{ 
                      position: 'absolute', 
                      top: '-20px', 
                      right: '-20px', 
                      width: '80px', 
                      height: '80px', 
                      borderRadius: '50%', 
                      background: 'rgba(255,255,255,0.1)' 
                    }} />
                    <div style={{ 
                      position: 'absolute', 
                      bottom: '-30px', 
                      left: '20%', 
                      width: '60px', 
                      height: '60px', 
                      borderRadius: '50%', 
                      background: 'rgba(255,255,255,0.08)' 
                    }} />
                    
                    <div>
                      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                        {language === 'th' ? 'เงินเดือนสุทธิ' : 'Net Salary'}
                      </div>
                      <div style={{ color: 'white', fontSize: '11px', opacity: 0.7 }}>
                        {language === 'th' ? 'รวมทุกรายการ' : 'Total Earnings'}
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: '28px', 
                      fontWeight: 800, 
                      color: 'white',
                      textShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    }}>
                      ฿{formatNumber(slipData.totalSalary || 0)}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="slip-footer" style={{ 
                    textAlign: 'center', 
                    marginTop: '24px',
                    paddingTop: '20px',
                    borderTop: '1px dashed #cbd5e1',
                  }}>
                    <div style={{ color: '#64748b', fontSize: '12px' }}>
                      {language === 'th' ? 'วันที่ออกเอกสาร: ' : 'Issue Date: '}
                      {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
