'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Users, Plus, Search, Edit2, Trash2, CheckCircle, XCircle, 
  X, Save, AlertTriangle, CheckCircle2, Eye, EyeOff, Shield,
  Mail, User, Key, Crown, UserCheck, UserX, Briefcase
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

interface UserData {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: string;
  employeeId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Employee {
  id: string;
  fullName: string;
  position: string;
  status: string;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

const roleOptions = [
  { value: 'admin', label: 'Admin', color: '#ef4444', icon: Crown },
  { value: 'user', label: 'User', color: '#22c55e', icon: UserCheck },
];

const avatarColors = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#14b8a6'];

export default function UsersPage() {
  const [usersData, setUsersData] = useState<UserData[]>([]);
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserData | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'user',
    employeeId: ''
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string; name?: string }>({});
  const { t, language } = useLanguage();
  const { isDark } = useTheme();

  // Fetch users from API
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/users');
      const result = await response.json();
      
      if (result.success) {
        setUsersData(result.data);
      } else {
        showToast('error', 'Error', result.error || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast('error', 'Error', 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch employees for dropdown
  const fetchEmployees = useCallback(async () => {
    try {
      const response = await fetch('/api/employees');
      const result = await response.json();
      
      if (result.success) {
        setEmployeesList(result.data.filter((e: Employee) => e.status === 'active'));
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchEmployees();
  }, [fetchUsers, fetchEmployees]);

  const colors = {
    bg: isDark ? '#1A1D21' : '#f0f2f5',
    cardBg: isDark ? '#23262B' : '#ffffff',
    inputBg: isDark ? '#1D1E24' : '#f8fafc',
    border: isDark ? '#2A313C' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#1e293b',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b',
    textFaded: isDark ? 'rgba(255, 255, 255, 0.4)' : '#94a3b8',
    hover: isDark ? '#2A313C' : '#f1f5f9',
    success: '#22c55e',
    error: '#ef4444',
  };

  const showToast = (type: Toast['type'], title: string, message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return avatarColors[Math.abs(hash) % avatarColors.length];
  };

  const getRoleColor = (role: string) => {
    const roleConfig = roleOptions.find(r => r.value === role);
    return roleConfig?.color || '#64748b';
  };

  const getRoleLabel = (role: string) => {
    const roleConfig = roleOptions.find(r => r.value === role);
    return roleConfig?.label || role;
  };

  const getEmployeeName = (employeeId: string | null) => {
    if (!employeeId) return null;
    const employee = employeesList.find(e => e.id === employeeId);
    return employee?.fullName || null;
  };

  const filteredUsers = usersData.filter(user => {
    const matchSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = selectedRole === 'all' || user.role === selectedRole;
    return matchSearch && matchRole;
  });

  const handleOpenModal = (user?: UserData) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        password: '',
        name: user.name,
        role: user.role,
        employeeId: user.employeeId || ''
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        password: '',
        name: '',
        role: 'user',
        employeeId: ''
      });
    }
    setFormErrors({});
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({ email: '', password: '', name: '', role: 'user', employeeId: '' });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: { email?: string; password?: string; name?: string } = {};
    
    if (!formData.name.trim()) {
      errors.name = 'กรุณากรอกชื่อผู้ใช้';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'กรุณากรอกอีเมล';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    }
    
    if (!editingUser && !formData.password) {
      errors.password = 'กรุณากรอกรหัสผ่าน';
    } else if (formData.password && formData.password.length < 6) {
      errors.password = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      const url = '/api/users';
      const method = editingUser ? 'PUT' : 'POST';
      const body = editingUser 
        ? { id: editingUser.id, ...formData }
        : formData;

      // Remove password from body if empty (for edit)
      if (editingUser && !formData.password) {
        delete (body as Record<string, unknown>).password;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success) {
        showToast('success', 'สำเร็จ', editingUser ? 'แก้ไขผู้ใช้เรียบร้อย' : 'เพิ่มผู้ใช้เรียบร้อย');
        handleCloseModal();
        fetchUsers();
      } else {
        showToast('error', 'Error', result.error || 'Failed to save user');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      showToast('error', 'Error', 'Failed to save user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users?id=${deletingUser.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        showToast('success', 'สำเร็จ', 'ลบผู้ใช้เรียบร้อย');
        setIsDeleteModalOpen(false);
        setDeletingUser(null);
        fetchUsers();
      } else {
        showToast('error', 'Error', result.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast('error', 'Error', 'Failed to delete user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Notifications */}
      <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px 20px',
              borderRadius: '12px',
              background: colors.cardBg,
              border: `1px solid ${colors.border}`,
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
              animation: 'slideIn 0.3s ease',
            }}
          >
            {toast.type === 'success' && <CheckCircle2 style={{ width: '20px', height: '20px', color: '#22c55e' }} />}
            {toast.type === 'error' && <AlertTriangle style={{ width: '20px', height: '20px', color: '#ef4444' }} />}
            <div>
              <div style={{ fontWeight: 600, color: colors.text, fontSize: '14px' }}>{toast.title}</div>
              <div style={{ fontSize: '13px', color: colors.textMuted }}>{toast.message}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: colors.text, margin: 0 }}>จัดการผู้ใช้</h1>
          <p style={{ fontSize: '14px', color: colors.textMuted, marginTop: '4px' }}>จัดการข้อมูลผู้ใช้งานระบบ</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '12px',
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
          <span>เพิ่มผู้ใช้ใหม่</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: colors.textMuted }} />
          <input
            type="text"
            placeholder="ค้นหาผู้ใช้..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 16px 14px 48px',
              borderRadius: '12px',
              border: `1px solid ${colors.border}`,
              background: colors.cardBg,
              color: colors.text,
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>
        
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          style={{
            padding: '14px 20px',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            background: colors.cardBg,
            color: colors.text,
            fontSize: '14px',
            cursor: 'pointer',
            outline: 'none',
            minWidth: '150px',
          }}
        >
          <option value="all">ทุกบทบาท</option>
          {roleOptions.map(role => (
            <option key={role.value} value={role.value}>{role.label}</option>
          ))}
        </select>
      </div>

      {/* Users Table */}
      <div style={{
        background: colors.cardBg,
        borderRadius: '20px',
        border: `1px solid ${colors.border}`,
        overflow: 'hidden',
      }}>
        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: colors.textMuted }}>
            กำลังโหลด...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Users style={{ width: '48px', height: '48px', color: colors.textFaded, margin: '0 auto 16px' }} />
            <p style={{ color: colors.textMuted }}>ไม่พบข้อมูลผู้ใช้</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: colors.inputBg }}>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, borderBottom: `1px solid ${colors.border}` }}>{t('users.user')}</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, borderBottom: `1px solid ${colors.border}` }}>{t('users.email')}</th>
                <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: colors.textMuted, borderBottom: `1px solid ${colors.border}` }}>{t('users.role')}</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, borderBottom: `1px solid ${colors.border}` }}>{t('users.employee')}</th>
                <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: colors.textMuted, borderBottom: `1px solid ${colors.border}` }}>{t('users.createdAt')}</th>
                <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: colors.textMuted, borderBottom: `1px solid ${colors.border}` }}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, index) => (
                <tr 
                  key={user.id}
                  style={{ 
                    borderBottom: index < filteredUsers.length - 1 ? `1px solid ${colors.border}` : 'none',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = colors.hover}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: `linear-gradient(135deg, ${getAvatarColor(user.name)} 0%, ${getAvatarColor(user.name)}dd 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '14px',
                      }}>
                        {getInitials(user.name)}
                      </div>
                      <span style={{ fontWeight: 600, color: colors.text }}>{user.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', color: colors.textMuted, fontSize: '14px' }}>{user.email}</td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: `${getRoleColor(user.role)}20`,
                      color: getRoleColor(user.role),
                    }}>
                      {user.role === 'admin' ? <Crown style={{ width: '12px', height: '12px' }} /> : <UserCheck style={{ width: '12px', height: '12px' }} />}
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    {user.role === 'user' && user.employeeId ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Briefcase style={{ width: '14px', height: '14px', color: colors.textMuted }} />
                        <span style={{ fontSize: '14px', color: colors.text }}>
                          {getEmployeeName(user.employeeId) || '-'}
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '13px', color: colors.textFaded }}>
                        {user.role === 'admin' ? '-' : t('users.notLinked')}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center', color: colors.textMuted, fontSize: '14px' }}>
                    {new Date(user.createdAt).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button
                        onClick={() => handleOpenModal(user)}
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          border: `1px solid ${colors.border}`,
                          background: 'transparent',
                          cursor: 'pointer',
                          color: colors.textMuted,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#3b82f620';
                          e.currentTarget.style.borderColor = '#3b82f6';
                          e.currentTarget.style.color = '#3b82f6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.borderColor = colors.border;
                          e.currentTarget.style.color = colors.textMuted;
                        }}
                      >
                        <Edit2 style={{ width: '16px', height: '16px' }} />
                      </button>
                      <button
                        onClick={() => {
                          setDeletingUser(user);
                          setIsDeleteModalOpen(true);
                        }}
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          border: `1px solid ${colors.border}`,
                          background: 'transparent',
                          cursor: 'pointer',
                          color: colors.textMuted,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#ef444420';
                          e.currentTarget.style.borderColor = '#ef4444';
                          e.currentTarget.style.color = '#ef4444';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.borderColor = colors.border;
                          e.currentTarget.style.color = colors.textMuted;
                        }}
                      >
                        <Trash2 style={{ width: '16px', height: '16px' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
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
          zIndex: 1000,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: colors.cardBg,
            borderRadius: '24px',
            padding: '32px',
            width: '100%',
            maxWidth: '500px',
            margin: '24px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Users style={{ width: '24px', height: '24px', color: '#ffffff' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: colors.text, margin: 0 }}>
                    {editingUser ? t('users.editUser') : t('users.addNew')}
                  </h2>
                  <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>
                    {editingUser ? t('users.subtitle') : t('users.enterUserInfo')}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.hover,
                  cursor: 'pointer',
                  color: colors.textMuted,
                }}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            {/* Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Name */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>
                  {t('users.name')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <User style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: colors.textMuted }} />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('users.name')}
                    style={{
                      width: '100%',
                      padding: '14px 14px 14px 44px',
                      borderRadius: '12px',
                      border: `1px solid ${formErrors.name ? '#ef4444' : colors.border}`,
                      background: colors.inputBg,
                      color: colors.text,
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                {formErrors.name && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{formErrors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>
                  {t('users.email')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: colors.textMuted }} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                    style={{
                      width: '100%',
                      padding: '14px 14px 14px 44px',
                      borderRadius: '12px',
                      border: `1px solid ${formErrors.email ? '#ef4444' : colors.border}`,
                      background: colors.inputBg,
                      color: colors.text,
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                {formErrors.email && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{formErrors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>
                  {t('users.password')} {!editingUser && <span style={{ color: '#ef4444' }}>*</span>}
                  {editingUser && <span style={{ fontSize: '11px', fontWeight: 400, color: colors.textMuted }}> ({t('users.leaveBlankPassword')})</span>}
                </label>
                <div style={{ position: 'relative' }}>
                  <Key style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: colors.textMuted }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? '••••••••' : t('users.password')}
                    style={{
                      width: '100%',
                      padding: '14px 44px 14px 44px',
                      borderRadius: '12px',
                      border: `1px solid ${formErrors.password ? '#ef4444' : colors.border}`,
                      background: colors.inputBg,
                      color: colors.text,
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: colors.textMuted,
                      padding: 0,
                    }}
                  >
                    {showPassword ? <EyeOff style={{ width: '18px', height: '18px' }} /> : <Eye style={{ width: '18px', height: '18px' }} />}
                  </button>
                </div>
                {formErrors.password && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{formErrors.password}</p>}
              </div>

              {/* Role */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>
                  บทบาท
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {roleOptions.map(role => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, role: role.value, employeeId: role.value === 'admin' ? '' : formData.employeeId })}
                      style={{
                        flex: 1,
                        padding: '14px',
                        borderRadius: '12px',
                        border: `2px solid ${formData.role === role.value ? role.color : colors.border}`,
                        background: formData.role === role.value ? `${role.color}15` : 'transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      <role.icon style={{ width: '18px', height: '18px', color: formData.role === role.value ? role.color : colors.textMuted }} />
                      <span style={{ fontWeight: 600, color: formData.role === role.value ? role.color : colors.textMuted }}>{role.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Employee Selection (only for User role) */}
              {formData.role === 'user' && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>
                    เชื่อมโยงพนักงาน <span style={{ fontSize: '11px', fontWeight: 400, color: colors.textMuted }}>(สำหรับดูข้อมูลส่วนตัว)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Briefcase style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: colors.textMuted }} />
                    <select
                      value={formData.employeeId}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '14px 14px 14px 44px',
                        borderRadius: '12px',
                        border: `1px solid ${colors.border}`,
                        background: colors.inputBg,
                        color: colors.text,
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        cursor: 'pointer',
                        appearance: 'none',
                      }}
                    >
                      <option value="">-- ไม่เลือก --</option>
                      {employeesList.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.fullName} ({emp.position})
                        </option>
                      ))}
                    </select>
                  </div>
                  <p style={{ fontSize: '12px', color: colors.textMuted, marginTop: '6px' }}>
                    เมื่อเชื่อมโยงแล้ว ผู้ใช้จะสามารถดูข้อมูลเงินเดือนและข้อมูลส่วนตัวได้
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
              <button
                onClick={handleCloseModal}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.text,
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                }}
              >
                <Save style={{ width: '18px', height: '18px' }} />
                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingUser && (
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
          zIndex: 1000,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: colors.cardBg,
            borderRadius: '24px',
            padding: '32px',
            width: '100%',
            maxWidth: '400px',
            margin: '24px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
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
              <AlertTriangle style={{ width: '32px', height: '32px', color: '#ef4444' }} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: colors.text, margin: '0 0 8px' }}>
              ยืนยันการลบ
            </h3>
            <p style={{ fontSize: '14px', color: colors.textMuted, margin: '0 0 24px' }}>
              คุณต้องการลบผู้ใช้ <span style={{ fontWeight: 600, color: colors.text }}>{deletingUser.name}</span> ใช่หรือไม่?
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletingUser(null);
                }}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.text,
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                }}
              >
                <Trash2 style={{ width: '18px', height: '18px' }} />
                {isSubmitting ? 'กำลังลบ...' : 'ลบ'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
