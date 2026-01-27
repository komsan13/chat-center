'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Key, Search, Plus, Edit2, Trash2, 
  Eye, EyeOff, Copy, CheckCircle, XCircle, RefreshCw,
  MessageSquare, Globe, AlertTriangle, Save
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Modal, DeleteConfirmModal, ToastContainer, useToast, FormGroup, TextInput, SelectInput, FormButton } from '@/components/ui';

interface LineToken {
  id: string;
  name: string;
  channelId: string;
  channelSecret: string;
  accessToken: string;
  websiteId: string | null;
  websiteName: string | null;
  status: 'active' | 'inactive' | 'expired';
  lastUsed: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Website {
  id: string;
  name: string;
}

export default function LineTokensPage() {
  const [tokens, setTokens] = useState<LineToken[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [websiteFilter, setWebsiteFilter] = useState('all');
  const [showToken, setShowToken] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingToken, setEditingToken] = useState<LineToken | null>(null);
  const [deletingToken, setDeletingToken] = useState<LineToken | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    channelId: '',
    channelSecret: '',
    accessToken: '',
    websiteId: '',
    status: 'active'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const { toasts, removeToast, success: showSuccess, error: showError } = useToast();
  const { language } = useLanguage();
  const { isDark } = useTheme();

  const colors = {
    cardBg: isDark ? '#23262B' : '#ffffff',
    inputBg: isDark ? '#1D1E24' : '#f8fafc',
    border: isDark ? '#2A313C' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#1e293b',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b',
    textFaded: isDark ? 'rgba(255, 255, 255, 0.4)' : '#94a3b8',
    hover: isDark ? '#2A313C' : '#f1f5f9',
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [tokensRes, websitesRes] = await Promise.all([
        fetch('/api/line-tokens'),
        fetch('/api/websites')
      ]);
      
      const tokensData = await tokensRes.json();
      const websitesData = await websitesRes.json();
      
      if (tokensData.success) setTokens(tokensData.data);
      if (websitesData.success) setWebsites(websitesData.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      showError('Error', 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Form validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = language === 'th' ? 'กรุณากรอกชื่อ' : 'Name is required';
    if (!formData.channelId.trim()) errors.channelId = language === 'th' ? 'กรุณากรอก Channel ID' : 'Channel ID is required';
    if (!editingToken && !formData.channelSecret.trim()) errors.channelSecret = language === 'th' ? 'กรุณากรอก Channel Secret' : 'Channel Secret is required';
    if (!editingToken && !formData.accessToken.trim()) errors.accessToken = language === 'th' ? 'กรุณากรอก Access Token' : 'Access Token is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Open modal
  const openAddModal = () => {
    setEditingToken(null);
    setFormData({ name: '', channelId: '', channelSecret: '', accessToken: '', websiteId: '', status: 'active' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (token: LineToken) => {
    setEditingToken(token);
    setFormData({
      name: token.name,
      channelId: token.channelId,
      channelSecret: '',
      accessToken: '',
      websiteId: token.websiteId || '',
      status: token.status
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openDeleteModal = (token: LineToken) => {
    setDeletingToken(token);
    setIsDeleteModalOpen(true);
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const selectedWebsite = websites.find(w => w.id === formData.websiteId);
      const payload = {
        ...formData,
        websiteName: selectedWebsite?.name || null,
        ...(editingToken && { id: editingToken.id })
      };

      const response = await fetch('/api/line-tokens', {
        method: editingToken ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.success) {
        showSuccess(
          language === 'th' ? 'สำเร็จ' : 'Success',
          editingToken 
            ? (language === 'th' ? 'แก้ไข LINE Token สำเร็จ' : 'LINE Token updated') 
            : (language === 'th' ? 'เพิ่ม LINE Token สำเร็จ' : 'LINE Token added')
        );
        setIsModalOpen(false);
        fetchData();
      } else {
        showError(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error', result.error);
      }
    } catch (error) {
      console.error('Error saving token:', error);
      showError(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error', 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deletingToken) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/line-tokens?id=${deletingToken.id}`, { method: 'DELETE' });
      const result = await response.json();

      if (result.success) {
        showSuccess(language === 'th' ? 'สำเร็จ' : 'Success', language === 'th' ? 'ลบ LINE Token สำเร็จ' : 'LINE Token deleted');
        setIsDeleteModalOpen(false);
        setDeletingToken(null);
        fetchData();
      } else {
        showError(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error', result.error);
      }
    } catch (error) {
      console.error('Error deleting token:', error);
      showError(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error', 'Failed to delete');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helpers
  const getStatusStyle = (status: string) => {
    if (status === 'active') return { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', icon: CheckCircle };
    if (status === 'inactive') return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', icon: XCircle };
    return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', icon: AlertTriangle };
  };

  const getStatusLabel = (status: string) => {
    if (status === 'active') return language === 'th' ? 'ใช้งาน' : 'Active';
    if (status === 'inactive') return language === 'th' ? 'ไม่ใช้งาน' : 'Inactive';
    return language === 'th' ? 'หมดอายุ' : 'Expired';
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleShowToken = (id: string) => {
    setShowToken(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('th-TH', { 
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  const filteredTokens = tokens.filter(token => {
    if (statusFilter !== 'all' && token.status !== statusFilter) return false;
    if (websiteFilter !== 'all') {
      if (websiteFilter === 'none' && token.websiteId) return false;
      if (websiteFilter !== 'none' && token.websiteId !== websiteFilter) return false;
    }
    if (searchTerm && !token.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !token.channelId.includes(searchTerm) &&
        !(token.websiteName || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const activeCount = tokens.filter(t => t.status === 'active').length;
  const inactiveCount = tokens.filter(t => t.status === 'inactive').length;
  const expiredCount = tokens.filter(t => t.status === 'expired').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: colors.text, margin: 0 }}>
            {language === 'th' ? 'จัดการ LINE Token' : 'LINE Token Management'}
          </h1>
          <p style={{ fontSize: '14px', color: colors.textMuted, marginTop: '4px' }}>
            {language === 'th' ? 'จัดการ Channel และ Token สำหรับ LINE Messaging API' : 'Manage channels and tokens for LINE Messaging API'}
          </p>
        </div>
        <button
          onClick={openAddModal}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '12px 20px', 
            borderRadius: '12px', 
            border: 'none', 
            background: 'linear-gradient(135deg, #06c755 0%, #00b900 100%)', 
            color: '#ffffff', 
            fontSize: '14px', 
            fontWeight: 600, 
            cursor: 'pointer', 
            boxShadow: '0 4px 15px rgba(6, 199, 85, 0.3)' 
          }}
        >
          <Plus style={{ width: '18px', height: '18px' }} />
          <span>{language === 'th' ? 'เพิ่ม Token' : 'Add Token'}</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {[
          { icon: Key, color: '#06c755', label: language === 'th' ? 'Token ทั้งหมด' : 'Total Tokens', value: tokens.length },
          { icon: CheckCircle, color: '#22c55e', label: language === 'th' ? 'ใช้งาน' : 'Active', value: activeCount },
          { icon: XCircle, color: '#f59e0b', label: language === 'th' ? 'ไม่ใช้งาน' : 'Inactive', value: inactiveCount },
          { icon: AlertTriangle, color: '#ef4444', label: language === 'th' ? 'หมดอายุ' : 'Expired', value: expiredCount },
        ].map((card, i) => (
          <div key={i} style={{ background: colors.cardBg, borderRadius: '16px', padding: '20px', border: `1px solid ${colors.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${card.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <card.icon style={{ width: '22px', height: '22px', color: card.color }} />
              </div>
              <span style={{ fontSize: '14px', color: colors.textMuted }}>{card.label}</span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: 700, color: card.color, margin: 0 }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: colors.cardBg, borderRadius: '16px', padding: '20px', border: `1px solid ${colors.border}` }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: colors.textMuted }} />
            <input
              type="text"
              placeholder={language === 'th' ? 'ค้นหาชื่อ, Channel ID, เว็บไซต์...' : 'Search name, Channel ID, website...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '12px 16px 12px 46px', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: '12px', color: colors.text, fontSize: '14px', outline: 'none' }}
            />
          </div>
          <select
            value={websiteFilter}
            onChange={(e) => setWebsiteFilter(e.target.value)}
            style={{ padding: '12px 16px', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: '12px', color: colors.text, fontSize: '14px', cursor: 'pointer', outline: 'none' }}
          >
            <option value="all">{language === 'th' ? 'ทุกเว็บไซต์' : 'All Websites'}</option>
            <option value="none">{language === 'th' ? 'ไม่ระบุเว็บ' : 'No Website'}</option>
            {websites.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '12px 16px', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: '12px', color: colors.text, fontSize: '14px', cursor: 'pointer', outline: 'none' }}
          >
            <option value="all">{language === 'th' ? 'ทุกสถานะ' : 'All Status'}</option>
            <option value="active">{language === 'th' ? 'ใช้งาน' : 'Active'}</option>
            <option value="inactive">{language === 'th' ? 'ไม่ใช้งาน' : 'Inactive'}</option>
            <option value="expired">{language === 'th' ? 'หมดอายุ' : 'Expired'}</option>
          </select>
          <button
            onClick={fetchData}
            disabled={isLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 18px', borderRadius: '12px', border: 'none', background: 'rgba(6, 199, 85, 0.15)', color: '#06c755', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
          >
            <RefreshCw style={{ width: '18px', height: '18px', animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            <span>{language === 'th' ? 'รีเฟรช' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Tokens Table */}
      <div style={{ background: colors.cardBg, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <RefreshCw style={{ width: '32px', height: '32px', color: '#06c755', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: colors.textMuted }}>{language === 'th' ? 'กำลังโหลด...' : 'Loading...'}</p>
          </div>
        ) : filteredTokens.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <MessageSquare style={{ width: '48px', height: '48px', color: colors.textFaded, margin: '0 auto 16px' }} />
            <p style={{ color: colors.textMuted, fontSize: '16px' }}>
              {tokens.length === 0 
                ? (language === 'th' ? 'ยังไม่มี LINE Token' : 'No LINE Tokens yet')
                : (language === 'th' ? 'ไม่พบข้อมูลที่ค้นหา' : 'No matching tokens found')
              }
            </p>
            {tokens.length === 0 && (
              <button
                onClick={openAddModal}
                style={{ marginTop: '16px', padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#06c755', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                {language === 'th' ? 'เพิ่ม Token แรก' : 'Add First Token'}
              </button>
            )}
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                  {[
                    language === 'th' ? 'ชื่อ Token' : 'Token Name',
                    'Channel ID',
                    'Access Token',
                    language === 'th' ? 'เว็บไซต์' : 'Website',
                    language === 'th' ? 'สถานะ' : 'Status',
                    language === 'th' ? 'สร้างเมื่อ' : 'Created',
                    language === 'th' ? 'จัดการ' : 'Actions'
                  ].map((h, i) => (
                    <th key={i} style={{ padding: '16px', textAlign: i === 6 ? 'center' : 'left', fontSize: '12px', fontWeight: 600, color: colors.textFaded, textTransform: 'uppercase', letterSpacing: '0.5px', background: colors.inputBg }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTokens.map((token, i) => {
                  const statusStyle = getStatusStyle(token.status);
                  const StatusIcon = statusStyle.icon;
                  return (
                    <tr key={token.id} style={{ borderBottom: i < filteredTokens.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #06c755, #00b900)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <MessageSquare style={{ width: '20px', height: '20px', color: '#fff' }} />
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: colors.text }}>{token.name}</p>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.textMuted }}>{token.id}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <code style={{ padding: '6px 10px', borderRadius: '8px', background: colors.inputBg, fontSize: '12px', fontFamily: 'monospace', color: colors.text }}>
                          {token.channelId}
                        </code>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <code style={{ padding: '6px 10px', borderRadius: '8px', background: colors.inputBg, fontSize: '12px', fontFamily: 'monospace', color: colors.text, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {showToken[token.id] ? token.accessToken : '••••••••••••••••'}
                          </code>
                          <button 
                            onClick={() => toggleShowToken(token.id)}
                            style={{ padding: '6px', borderRadius: '8px', border: 'none', background: 'transparent', color: colors.textMuted, cursor: 'pointer' }}
                          >
                            {showToken[token.id] ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
                          </button>
                          <button 
                            onClick={() => handleCopy(token.id, token.accessToken)}
                            style={{ padding: '6px', borderRadius: '8px', border: 'none', background: copiedId === token.id ? 'rgba(34, 197, 94, 0.15)' : 'transparent', color: copiedId === token.id ? '#22c55e' : colors.textMuted, cursor: 'pointer' }}
                          >
                            {copiedId === token.id ? <CheckCircle style={{ width: '16px', height: '16px' }} /> : <Copy style={{ width: '16px', height: '16px' }} />}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        {token.websiteName ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                            <Globe style={{ width: '14px', height: '14px' }} />
                            {token.websiteName}
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, background: colors.inputBg, color: colors.textFaded }}>
                            {language === 'th' ? 'ไม่ระบุ' : 'None'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: statusStyle.bg, color: statusStyle.color }}>
                          <StatusIcon style={{ width: '14px', height: '14px' }} />
                          {getStatusLabel(token.status)}
                        </span>
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', color: colors.textMuted }}>{formatDate(token.createdAt)}</td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <button
                            onClick={() => openEditModal(token)}
                            style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', cursor: 'pointer' }}
                            title={language === 'th' ? 'แก้ไข' : 'Edit'}
                          >
                            <Edit2 style={{ width: '16px', height: '16px' }} />
                          </button>
                          <button
                            onClick={() => openDeleteModal(token)}
                            style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', cursor: 'pointer' }}
                            title={language === 'th' ? 'ลบ' : 'Delete'}
                          >
                            <Trash2 style={{ width: '16px', height: '16px' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ padding: '16px', borderTop: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '14px', color: colors.textMuted }}>
                {language === 'th' ? 'แสดง' : 'Showing'} <span style={{ fontWeight: 600, color: colors.text }}>{filteredTokens.length}</span> {language === 'th' ? 'จาก' : 'of'} <span style={{ fontWeight: 600, color: colors.text }}>{tokens.length}</span> {language === 'th' ? 'รายการ' : 'items'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingToken ? (language === 'th' ? 'แก้ไข LINE Token' : 'Edit LINE Token') : (language === 'th' ? 'เพิ่ม LINE Token' : 'Add LINE Token')}
        subtitle={editingToken ? (language === 'th' ? 'แก้ไขข้อมูล Channel และ Token' : 'Update channel and token details') : (language === 'th' ? 'กรอกข้อมูล Channel และ Token' : 'Enter channel and token details')}
        icon={MessageSquare}
        iconColor="#06c755"
        showSparkle={!editingToken}
        maxWidth="520px"
        footer={
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <FormButton variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              {language === 'th' ? 'ยกเลิก' : 'Cancel'}
            </FormButton>
            <FormButton variant="primary" onClick={handleSave} loading={isSubmitting} icon={Save} color="#06c755">
              {language === 'th' ? 'บันทึก' : 'Save'}
            </FormButton>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <FormGroup label={language === 'th' ? 'ชื่อ Token' : 'Token Name'} required error={formErrors.name}>
            <TextInput
              value={formData.name}
              onChange={(e) => { const v = e.target.value; setFormData({ ...formData, name: v }); if (formErrors.name) setFormErrors({ ...formErrors, name: '' }); }}
              placeholder={language === 'th' ? 'เช่น Main LINE OA' : 'e.g. Main LINE OA'}
              icon={Key}
              error={!!formErrors.name}
              autoComplete="off"
            />
          </FormGroup>

          <FormGroup label="Channel ID" required error={formErrors.channelId}>
            <TextInput
              value={formData.channelId}
              onChange={(e) => { const v = e.target.value; setFormData({ ...formData, channelId: v }); if (formErrors.channelId) setFormErrors({ ...formErrors, channelId: '' }); }}
              placeholder="e.g. 2008963830"
              icon={MessageSquare}
              error={!!formErrors.channelId}
              autoComplete="off"
            />
          </FormGroup>

          <FormGroup label="Channel Secret" required={!editingToken} error={formErrors.channelSecret}>
            <TextInput
              value={formData.channelSecret}
              onChange={(e) => { const v = e.target.value; setFormData({ ...formData, channelSecret: v }); if (formErrors.channelSecret) setFormErrors({ ...formErrors, channelSecret: '' }); }}
              placeholder={editingToken ? (language === 'th' ? 'เว้นว่างถ้าไม่ต้องการเปลี่ยน' : 'Leave empty to keep current') : 'e.g. e3fecfe989126e2c474cc15757df52d4'}
              type="password"
              error={!!formErrors.channelSecret}
              autoComplete="new-password"
            />
          </FormGroup>

          <FormGroup label="Access Token" required={!editingToken} error={formErrors.accessToken}>
            <TextInput
              value={formData.accessToken}
              onChange={(e) => { const v = e.target.value; setFormData({ ...formData, accessToken: v }); if (formErrors.accessToken) setFormErrors({ ...formErrors, accessToken: '' }); }}
              placeholder={editingToken ? (language === 'th' ? 'เว้นว่างถ้าไม่ต้องการเปลี่ยน' : 'Leave empty to keep current') : 'Long-lived channel access token'}
              type="password"
              error={!!formErrors.accessToken}
              autoComplete="new-password"
            />
          </FormGroup>

          <FormGroup label={language === 'th' ? 'เว็บไซต์ (ถ้ามี)' : 'Website (optional)'}>
            <SelectInput
              value={formData.websiteId}
              onChange={(e) => setFormData({ ...formData, websiteId: e.target.value })}
              options={[
                { value: '', label: language === 'th' ? '-- ไม่ระบุ --' : '-- None --' },
                ...websites.map(w => ({ value: w.id, label: w.name }))
              ]}
              icon={Globe}
            />
          </FormGroup>

          <FormGroup label={language === 'th' ? 'สถานะ' : 'Status'}>
            <SelectInput
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { value: 'active', label: language === 'th' ? 'ใช้งาน' : 'Active' },
                { value: 'inactive', label: language === 'th' ? 'ไม่ใช้งาน' : 'Inactive' },
                { value: 'expired', label: language === 'th' ? 'หมดอายุ' : 'Expired' }
              ]}
            />
          </FormGroup>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setDeletingToken(null); }}
        onConfirm={handleDelete}
        title={language === 'th' ? 'ยืนยันการลบ LINE Token' : 'Confirm Delete LINE Token'}
        itemName={deletingToken?.name || ''}
        itemDetails={deletingToken ? [
          { label: 'Channel ID', value: deletingToken.channelId },
          { label: language === 'th' ? 'เว็บไซต์' : 'Website', value: deletingToken.websiteName || '-' }
        ] : []}
        loading={isSubmitting}
      />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
