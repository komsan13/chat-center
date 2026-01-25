'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Shield, Search, Plus, Edit2, Trash2, 
  Users, Check, X, Settings, Save,
  UserPlus, Key, Database, BarChart3, MessageSquare,
  AlertTriangle, CheckCircle2, LayoutDashboard
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

interface Permissions {
  viewDashboard: boolean;
  manageUsers: boolean;
  managePermissions: boolean;
  viewReports: boolean;
  manageData: boolean;
  manageChat: boolean;
  manageSettings: boolean;
}

interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: Permissions;
  usersCount: number;
  createdAt: string;
}

interface UserInRole {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

const permissionList = [
  { key: 'viewDashboard', name: 'ดูแดชบอร์ด', description: 'เข้าถึงหน้าแดชบอร์ดหลัก', icon: LayoutDashboard },
  { key: 'manageUsers', name: 'จัดการผู้ใช้', description: 'เพิ่ม ลบ แก้ไขข้อมูลผู้ใช้', icon: Users },
  { key: 'managePermissions', name: 'จัดการสิทธิ์', description: 'กำหนดสิทธิ์การเข้าถึง', icon: Key },
  { key: 'viewReports', name: 'ดูรายงาน', description: 'เข้าถึงรายงานทั้งหมด', icon: BarChart3 },
  { key: 'manageData', name: 'จัดการข้อมูล', description: 'เพิ่ม ลบ แก้ไขข้อมูลหลัก', icon: Database },
  { key: 'manageChat', name: 'ตอบแชท', description: 'ตอบข้อความลูกค้า', icon: MessageSquare },
  { key: 'manageSettings', name: 'ตั้งค่าระบบ', description: 'แก้ไขการตั้งค่าระบบ', icon: Settings },
];

const roleColors = [
  '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'
];

export default function PermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [usersInRole, setUsersInRole] = useState<UserInRole[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#22c55e',
    permissions: {
      viewDashboard: true,
      manageUsers: false,
      managePermissions: false,
      viewReports: true,
      manageData: false,
      manageChat: false,
      manageSettings: false,
    } as Permissions
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<UserInRole[]>([]);
  const { t } = useLanguage();
  const { isDark } = useTheme();

  const colors = {
    bg: isDark ? '#1A1D21' : '#f0f2f5',
    cardBg: isDark ? '#23262B' : '#ffffff',
    inputBg: isDark ? '#1D1E24' : '#f8fafc',
    border: isDark ? '#2A313C' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#1e293b',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b',
    textFaded: isDark ? 'rgba(255, 255, 255, 0.4)' : '#94a3b8',
    hover: isDark ? '#2A313C' : '#f1f5f9',
  };

  const showToast = (type: Toast['type'], title: string, message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // Fetch roles
  const fetchRoles = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/roles');
      const result = await response.json();
      
      if (result.success) {
        setRoles(result.data);
        if (!selectedRoleId && result.data.length > 0) {
          setSelectedRoleId(result.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      showToast('error', 'Error', 'Failed to fetch roles');
    } finally {
      setIsLoading(false);
    }
  }, [selectedRoleId]);

  // Fetch users in role
  const fetchUsersInRole = useCallback(async (roleId: string) => {
    try {
      const response = await fetch(`/api/roles/${roleId}/users`);
      const result = await response.json();
      
      if (result.success) {
        setUsersInRole(result.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, []);

  const fetchAllUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const result = await response.json();
      
      if (result.success) {
        setAllUsers(result.data);
      }
    } catch (error) {
      console.error('Error fetching all users:', error);
    }
  };

  const handleAddUserToRole = async (userId: string) => {
    if (!selectedRoleId) return;
    
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          roleId: selectedRoleId
        }),
      });

      const result = await response.json();

      if (result.success) {
        fetchUsersInRole(selectedRoleId);
        setRoles(prev => prev.map(r => 
          r.id === selectedRoleId 
            ? { ...r, usersCount: r.usersCount + 1 }
            : r
        ));
        showToast('success', 'สำเร็จ', 'เพิ่มผู้ใช้ในบทบาทแล้ว');
        setIsAddUserModalOpen(false);
      } else {
        showToast('error', 'Error', result.error || 'Failed to add user');
      }
    } catch (error) {
      console.error('Error adding user to role:', error);
      showToast('error', 'Error', 'Failed to add user to role');
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    if (selectedRoleId) {
      fetchUsersInRole(selectedRoleId);
    }
  }, [selectedRoleId, fetchUsersInRole]);

  const selectedRole = roles.find(r => r.id === selectedRoleId);

  const handleOpenModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        description: role.description,
        color: role.color,
        permissions: { ...role.permissions }
      });
    } else {
      setEditingRole(null);
      setFormData({
        name: '',
        description: '',
        color: '#22c55e',
        permissions: {
          viewDashboard: true,
          manageUsers: false,
          managePermissions: false,
          viewReports: true,
          manageData: false,
          manageChat: false,
          manageSettings: false,
        }
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRole(null);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      showToast('error', 'Error', 'กรุณากรอกชื่อบทบาท');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = '/api/roles';
      const method = editingRole ? 'PUT' : 'POST';
      const body = editingRole 
        ? { id: editingRole.id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success) {
        showToast('success', 'สำเร็จ', editingRole ? 'แก้ไขบทบาทเรียบร้อย' : 'เพิ่มบทบาทเรียบร้อย');
        handleCloseModal();
        fetchRoles();
      } else {
        showToast('error', 'Error', result.error || 'Failed to save role');
      }
    } catch (error) {
      console.error('Error saving role:', error);
      showToast('error', 'Error', 'Failed to save role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePermission = async (permKey: string, value: boolean) => {
    if (!selectedRole) return;
    
    const newPermissions = { ...selectedRole.permissions, [permKey]: value };
    
    try {
      const response = await fetch('/api/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRole.id,
          permissions: newPermissions
        }),
      });

      const result = await response.json();

      if (result.success) {
        setRoles(prev => prev.map(r => 
          r.id === selectedRole.id 
            ? { ...r, permissions: newPermissions }
            : r
        ));
        showToast('success', 'สำเร็จ', 'บันทึกการเปลี่ยนแปลงแล้ว');
      }
    } catch (error) {
      console.error('Error updating permission:', error);
      showToast('error', 'Error', 'Failed to update permission');
    }
  };

  const handleRemoveUserFromRole = async (userId: string) => {
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          roleId: null
        }),
      });

      const result = await response.json();

      if (result.success) {
        setUsersInRole(prev => prev.filter(u => u.id !== userId));
        setRoles(prev => prev.map(r => 
          r.id === selectedRoleId 
            ? { ...r, usersCount: r.usersCount - 1 }
            : r
        ));
        showToast('success', 'สำเร็จ', 'ลบผู้ใช้ออกจากบทบาทแล้ว');
      } else {
        showToast('error', 'Error', result.error || 'Failed to remove user');
      }
    } catch (error) {
      console.error('Error removing user:', error);
      showToast('error', 'Error', 'Failed to remove user from role');
    }
  };

  const handleDelete = async () => {
    if (!deletingRole) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/roles?id=${deletingRole.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        showToast('success', 'สำเร็จ', 'ลบบทบาทเรียบร้อย');
        setIsDeleteModalOpen(false);
        setDeletingRole(null);
        if (selectedRoleId === deletingRole.id) {
          setSelectedRoleId(roles[0]?.id || null);
        }
        fetchRoles();
      } else {
        showToast('error', 'Error', result.error || 'Failed to delete role');
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      showToast('error', 'Error', 'Failed to delete role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRoles = roles.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: colors.text, margin: 0 }}>จัดการสิทธิ์</h1>
          <p style={{ fontSize: '14px', color: colors.textMuted, marginTop: '4px' }}>กำหนดบทบาทและสิทธิ์การเข้าถึงระบบ</p>
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
            boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)' 
          }}
        >
          <Plus style={{ width: '18px', height: '18px' }} />
          <span>เพิ่มบทบาทใหม่</span>
        </button>
      </div>

      <div style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 200px)' }}>
        {/* Left - Roles List */}
        <div style={{ width: '360px', background: colors.cardBg, borderRadius: '20px', border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Search */}
          <div style={{ padding: '20px', borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: colors.textMuted }} />
              <input
                type="text"
                placeholder="ค้นหาบทบาท..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '12px 14px 12px 46px', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: '12px', color: colors.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Roles */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {isLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: colors.textMuted }}>กำลังโหลด...</div>
            ) : filteredRoles.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: colors.textMuted }}>ไม่พบบทบาท</div>
            ) : (
              filteredRoles.map(role => (
                <div
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    background: selectedRoleId === role.id ? `${role.color}15` : 'transparent',
                    border: selectedRoleId === role.id ? `2px solid ${role.color}` : '2px solid transparent',
                    marginBottom: '8px',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: `${role.color}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Shield style={{ width: '22px', height: '22px', color: role.color }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: colors.text }}>{role.name}</h3>
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '10px', 
                          fontSize: '11px', 
                          fontWeight: 600, 
                          background: `${role.color}20`, 
                          color: role.color 
                        }}>
                          {role.usersCount} users
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: colors.textMuted }}>{role.description}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
                    {permissionList.filter(p => role.permissions[p.key as keyof Permissions]).slice(0, 3).map(p => (
                      <span key={p.key} style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 500,
                        background: colors.inputBg,
                        color: colors.textMuted,
                      }}>
                        {p.name}
                      </span>
                    ))}
                    {permissionList.filter(p => role.permissions[p.key as keyof Permissions]).length > 3 && (
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 500,
                        background: `${role.color}15`,
                        color: role.color,
                      }}>
                        +{permissionList.filter(p => role.permissions[p.key as keyof Permissions]).length - 3}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right - Permission Details */}
        <div style={{ flex: 1, background: colors.cardBg, borderRadius: '20px', border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedRole ? (
            <>
              {/* Header */}
              <div style={{ padding: '24px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: `${selectedRole.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Shield style={{ width: '28px', height: '28px', color: selectedRole.color }} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: colors.text }}>{selectedRole.name}</h2>
                      <span style={{ 
                        padding: '4px 12px', 
                        borderRadius: '20px', 
                        fontSize: '12px', 
                        fontWeight: 600, 
                        background: `${selectedRole.color}20`, 
                        color: selectedRole.color 
                      }}>
                        {selectedRole.usersCount} users
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', color: colors.textMuted }}>{selectedRole.description}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => handleOpenModal(selectedRole)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      padding: '10px 16px', 
                      borderRadius: '10px', 
                      border: 'none', 
                      background: `${selectedRole.color}20`, 
                      color: selectedRole.color, 
                      fontSize: '13px', 
                      fontWeight: 500, 
                      cursor: 'pointer' 
                    }}
                  >
                    <Edit2 style={{ width: '16px', height: '16px' }} />
                    แก้ไข
                  </button>
                </div>
              </div>

              {/* Permissions Grid */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>สิทธิ์การเข้าถึง</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  {permissionList.map(permission => {
                    const isEnabled = selectedRole.permissions[permission.key as keyof Permissions];
                    const Icon = permission.icon;
                    return (
                      <div key={permission.key} style={{
                        padding: '20px',
                        borderRadius: '16px',
                        background: isEnabled ? 'rgba(34, 197, 94, 0.08)' : colors.inputBg,
                        border: `1px solid ${isEnabled ? 'rgba(34, 197, 94, 0.3)' : colors.border}`,
                        transition: 'all 0.2s',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                            <div style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '12px',
                              background: isEnabled ? 'rgba(34, 197, 94, 0.15)' : colors.hover,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              <Icon style={{ width: '22px', height: '22px', color: isEnabled ? '#22c55e' : colors.textMuted }} />
                            </div>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: colors.text }}>{permission.name}</h4>
                              <p style={{ margin: '4px 0 0', fontSize: '13px', color: colors.textMuted }}>{permission.description}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleUpdatePermission(permission.key, !isEnabled)}
                            style={{
                              width: '48px',
                              height: '28px',
                              borderRadius: '14px',
                              border: 'none',
                              background: isEnabled ? '#22c55e' : colors.border,
                              cursor: 'pointer',
                              position: 'relative',
                              transition: 'all 0.2s',
                            }}
                          >
                            <div style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              background: '#fff',
                              position: 'absolute',
                              top: '3px',
                              left: isEnabled ? '23px' : '3px',
                              transition: 'all 0.2s',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            }} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Users in this role */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '32px 0 16px' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>ผู้ใช้ในบทบาทนี้ ({usersInRole.length})</h3>
                  <button
                    onClick={() => {
                      fetchAllUsers();
                      setIsAddUserModalOpen(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '10px',
                      border: 'none',
                      background: `${selectedRole.color}20`,
                      color: selectedRole.color,
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Plus style={{ width: '16px', height: '16px' }} />
                    เพิ่มผู้ใช้
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {usersInRole.length === 0 ? (
                    <p style={{ fontSize: '14px', color: colors.textFaded }}>ยังไม่มีผู้ใช้ในบทบาทนี้</p>
                  ) : (
                    usersInRole.map(user => (
                      <div key={user.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: colors.inputBg,
                        border: `1px solid ${colors.border}`,
                      }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${selectedRole.color}, ${selectedRole.color}cc)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '13px',
                          fontWeight: 600,
                        }}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: colors.text }}>{user.name}</span>
                        <button
                          onClick={() => handleRemoveUserFromRole(user.id)}
                          style={{
                            padding: '4px',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: colors.textMuted,
                            marginLeft: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#ef444420';
                            e.currentTarget.style.color = '#ef4444';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = colors.textMuted;
                          }}
                        >
                          <X style={{ width: '14px', height: '14px' }} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>


            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
              <Shield style={{ width: '64px', height: '64px', color: colors.textFaded }} />
              <p style={{ fontSize: '16px', color: colors.textMuted }}>เลือกบทบาทเพื่อดูรายละเอียด</p>
            </div>
          )}
        </div>
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
            maxWidth: '550px',
            margin: '24px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: `${formData.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Shield style={{ width: '24px', height: '24px', color: formData.color }} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: colors.text, margin: 0 }}>
                    {editingRole ? 'แก้ไขบทบาท' : 'เพิ่มบทบาทใหม่'}
                  </h2>
                  <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>
                    {editingRole ? 'แก้ไขข้อมูลบทบาท' : 'กำหนดบทบาทและสิทธิ์'}
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
                  ชื่อบทบาท <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น Admin, Operator, Viewer"
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: `1px solid ${colors.border}`,
                    background: colors.inputBg,
                    color: colors.text,
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>
                  คำอธิบาย
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="อธิบายบทบาทนี้..."
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: `1px solid ${colors.border}`,
                    background: colors.inputBg,
                    color: colors.text,
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Color */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>
                  สี
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {roleColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: color,
                        border: formData.color === color ? '3px solid #fff' : 'none',
                        cursor: 'pointer',
                        boxShadow: formData.color === color ? `0 0 0 2px ${color}` : 'none',
                        transition: 'all 0.2s',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Permissions */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '12px' }}>
                  สิทธิ์การเข้าถึง
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {permissionList.map(perm => (
                    <div
                      key={perm.key}
                      onClick={() => setFormData({
                        ...formData,
                        permissions: {
                          ...formData.permissions,
                          [perm.key]: !formData.permissions[perm.key as keyof Permissions]
                        }
                      })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: formData.permissions[perm.key as keyof Permissions] ? 'rgba(34, 197, 94, 0.1)' : colors.inputBg,
                        border: `1px solid ${formData.permissions[perm.key as keyof Permissions] ? 'rgba(34, 197, 94, 0.3)' : colors.border}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <perm.icon style={{ 
                          width: '18px', 
                          height: '18px', 
                          color: formData.permissions[perm.key as keyof Permissions] ? '#22c55e' : colors.textMuted 
                        }} />
                        <span style={{ 
                          fontSize: '14px', 
                          fontWeight: 500, 
                          color: formData.permissions[perm.key as keyof Permissions] ? colors.text : colors.textMuted 
                        }}>
                          {perm.name}
                        </span>
                      </div>
                      <div style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        background: formData.permissions[perm.key as keyof Permissions] ? '#22c55e' : colors.border,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {formData.permissions[perm.key as keyof Permissions] && (
                          <Check style={{ width: '14px', height: '14px', color: '#fff' }} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
      {isDeleteModalOpen && deletingRole && (
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
              คุณต้องการลบบทบาท <span style={{ fontWeight: 600, color: colors.text }}>{deletingRole.name}</span> ใช่หรือไม่?
              {deletingRole.usersCount > 0 && (
                <span style={{ display: 'block', marginTop: '8px', color: '#ef4444' }}>
                  ⚠️ มีผู้ใช้ {deletingRole.usersCount} คนในบทบาทนี้
                </span>
              )}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletingRole(null);
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

      {/* Add User Modal */}
      {isAddUserModalOpen && selectedRole && (
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
            maxWidth: '450px',
            margin: '24px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: `${selectedRole.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <UserPlus style={{ width: '22px', height: '22px', color: selectedRole.color }} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: colors.text, margin: 0 }}>
                    เพิ่มผู้ใช้ในบทบาท
                  </h2>
                  <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>
                    {selectedRole.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
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

            {/* Users List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {allUsers.filter(u => !usersInRole.some(ur => ur.id === u.id)).length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: colors.textMuted }}>
                  <Users style={{ width: '48px', height: '48px', marginBottom: '12px', opacity: 0.5 }} />
                  <p>ไม่มีผู้ใช้ที่สามารถเพิ่มได้</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {allUsers.filter(u => !usersInRole.some(ur => ur.id === u.id)).map(user => (
                    <div
                      key={user.id}
                      onClick={() => handleAddUserToRole(user.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '14px',
                        borderRadius: '12px',
                        background: colors.inputBg,
                        border: `1px solid ${colors.border}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `${selectedRole.color}15`;
                        e.currentTarget.style.borderColor = selectedRole.color;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = colors.inputBg;
                        e.currentTarget.style.borderColor = colors.border;
                      }}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${selectedRole.color}, ${selectedRole.color}cc)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '15px',
                        fontWeight: 600,
                      }}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: colors.text }}>{user.name}</div>
                        <div style={{ fontSize: '12px', color: colors.textMuted }}>{user.email}</div>
                      </div>
                      <Plus style={{ width: '20px', height: '20px', color: selectedRole.color }} />
                    </div>
                  ))}
                </div>
              )}
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
