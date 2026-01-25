'use client';

import { useState, useEffect, useCallback } from 'react';
import { Globe, Plus, Search, Edit2, Trash2, CheckCircle, XCircle, ExternalLink, ArrowLeft, Filter, Save, RefreshCw, Globe2, Link2 } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Modal, DeleteConfirmModal, ToastContainer, useToast, FormGroup, TextInput, ButtonSelect, FormButton } from '@/components/ui';

interface Website {
  id: string;
  name: string;
  url: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export default function WebsitesPage() {
  const [websitesData, setWebsitesData] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState<Website | null>(null);
  const [deletingWebsite, setDeletingWebsite] = useState<Website | null>(null);
  const [formData, setFormData] = useState({ name: '', url: '', status: 'active' as 'active' | 'inactive' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ name?: string; url?: string }>({});
  const { t, language } = useLanguage();
  const { isDark } = useTheme();
  const { toasts, removeToast, success: showSuccess, error: showError } = useToast();

  // Fetch websites from API
  const fetchWebsites = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/websites');
      const result = await response.json();
      
      if (result.success) {
        setWebsitesData(result.data);
      } else {
        showError('Error', result.error || 'Failed to load data');
      }
    } catch {
      showError('Error', 'Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  // Load data on mount
  useEffect(() => {
    fetchWebsites();
  }, [fetchWebsites]);

  // Form validation
  const validateForm = () => {
    const errors: { name?: string; url?: string } = {};
    if (!formData.name.trim()) {
      errors.name = language === 'th' ? 'กรุณากรอกชื่อเว็บไซต์' : 'Website name is required';
    }
    if (!formData.url.trim()) {
      errors.url = language === 'th' ? 'กรุณากรอก URL' : 'URL is required';
    } else if (!/^https?:\/\/.+/.test(formData.url)) {
      errors.url = language === 'th' ? 'URL ไม่ถูกต้อง (ต้องขึ้นต้นด้วย http:// หรือ https://)' : 'Invalid URL format (must start with http:// or https://)';
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

  const filteredData = websitesData.filter(item => {
    if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
    if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase()) && !item.id.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const openAddModal = () => {
    setEditingWebsite(null);
    setFormData({ name: '', url: '', status: 'active' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (website: Website) => {
    setEditingWebsite(website);
    setFormData({ name: website.name, url: website.url, status: website.status });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openDeleteModal = (website: Website) => {
    setDeletingWebsite(website);
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
      if (editingWebsite) {
        // Update existing website
        const response = await fetch(`/api/websites/${editingWebsite.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            url: formData.url,
            status: formData.status,
          }),
        });
        
        const result = await response.json();
        
        if (result.success) {
          await fetchWebsites(); // Reload data
          showSuccess(
            language === 'th' ? 'แก้ไขสำเร็จ!' : 'Updated Successfully!',
            language === 'th' ? `เว็บไซต์ "${formData.name}" ถูกแก้ไขเรียบร้อยแล้ว` : `Website "${formData.name}" has been updated`
          );
          setIsModalOpen(false);
        } else {
          showError(
            language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error',
            result.error || (language === 'th' ? 'ไม่สามารถแก้ไขข้อมูลได้' : 'Failed to update')
          );
        }
      } else {
        // Create new website
        const response = await fetch('/api/websites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            url: formData.url,
            status: formData.status,
          }),
        });
        
        const result = await response.json();
        
        if (result.success) {
          await fetchWebsites(); // Reload data
          showSuccess(
            language === 'th' ? 'เพิ่มสำเร็จ!' : 'Added Successfully!',
            language === 'th' ? `เว็บไซต์ "${formData.name}" ถูกเพิ่มเรียบร้อยแล้ว` : `Website "${formData.name}" has been added`
          );
          setIsModalOpen(false);
        } else {
          if (result.error?.includes('already exists')) {
            setFormErrors({ url: language === 'th' ? 'URL นี้มีอยู่ในระบบแล้ว' : 'This URL already exists' });
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
    if (!deletingWebsite) return;
    
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/websites/${deletingWebsite.id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        const deletedName = deletingWebsite.name;
        await fetchWebsites(); // Reload data
        setIsDeleteModalOpen(false);
        setDeletingWebsite(null);
        showSuccess(
          language === 'th' ? 'ลบสำเร็จ!' : 'Deleted Successfully!',
          language === 'th' ? `เว็บไซต์ "${deletedName}" ถูกลบเรียบร้อยแล้ว` : `Website "${deletedName}" has been deleted`
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
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
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
              transition: 'all 0.2s ease',
            }}
          >
            <ArrowLeft style={{ width: '20px', height: '20px' }} />
          </Link>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: colors.text, margin: 0 }}>{t('websites.title')}</h1>
            <p style={{ fontSize: '14px', color: colors.textMuted, margin: 0 }}>{t('websites.subtitle')}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={fetchWebsites}
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
              transition: 'all 0.2s ease',
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
            <span>{t('websites.addNew')}</span>
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
          boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
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
              <Globe style={{ width: '20px', height: '20px', color: '#22c55e' }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>{t('common.total')}</p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: colors.text, margin: 0 }}>{websitesData.length}</p>
            </div>
          </div>
        </div>
        <div style={{
          background: colors.cardBg,
          borderRadius: '12px',
          padding: '16px',
          border: `1px solid ${colors.border}`,
          boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
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
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>{t('websites.active')}</p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: '#10b981', margin: 0 }}>{websitesData.filter(w => w.status === 'active').length}</p>
            </div>
          </div>
        </div>
        <div style={{
          background: colors.cardBg,
          borderRadius: '12px',
          padding: '16px',
          border: `1px solid ${colors.border}`,
          boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
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
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>{t('websites.inactive')}</p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: '#9ca3af', margin: 0 }}>{websitesData.filter(w => w.status === 'inactive').length}</p>
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
        boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
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
            placeholder={t('websites.searchPlaceholder')}
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
            <option value="all">{t('status.all')}</option>
            <option value="active">{t('websites.active')}</option>
            <option value="inactive">{t('websites.inactive')}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: colors.cardBg,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        overflow: 'hidden',
        boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
              {[t('websites.id'), t('websites.name'), t('websites.url'), t('websites.status'), t('common.actions')].map((header) => (
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
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ width: '80px', height: '20px', borderRadius: '4px', background: colors.inputBg, animation: 'pulse 1.5s infinite' }} />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: colors.inputBg, animation: 'pulse 1.5s infinite' }} />
                        <div style={{ width: '120px', height: '20px', borderRadius: '4px', background: colors.inputBg, animation: 'pulse 1.5s infinite' }} />
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ width: '180px', height: '20px', borderRadius: '4px', background: colors.inputBg, animation: 'pulse 1.5s infinite' }} />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ width: '80px', height: '28px', borderRadius: '6px', background: colors.inputBg, animation: 'pulse 1.5s infinite' }} />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: colors.inputBg, animation: 'pulse 1.5s infinite' }} />
                        <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: colors.inputBg, animation: 'pulse 1.5s infinite' }} />
                      </div>
                    </td>
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
                    <Globe style={{ width: '40px', height: '40px', color: '#22c55e' }} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: colors.text, margin: '0 0 8px 0' }}>
                    {websitesData.length === 0 
                      ? (language === 'th' ? 'ยังไม่มีเว็บไซต์' : 'No websites yet')
                      : (language === 'th' ? 'ไม่พบข้อมูล' : 'No results found')
                    }
                  </h3>
                  <p style={{ fontSize: '14px', color: colors.textMuted, margin: 0 }}>
                    {websitesData.length === 0
                      ? (language === 'th' ? 'เริ่มต้นด้วยการเพิ่มเว็บไซต์แรกของคุณ' : 'Get started by adding your first website')
                      : (language === 'th' ? 'ลองค้นหาด้วยคำอื่น' : 'Try a different search term')
                    }
                  </p>
                  {websitesData.length === 0 && (
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
                      {language === 'th' ? 'เพิ่มเว็บไซต์' : 'Add Website'}
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
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#22c55e', fontFamily: 'monospace' }}>
                    {item.id.substring(0, 8)}...
                  </span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}>
                      {item.name.charAt(0)}
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: colors.text }}>{item.name}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      color: '#22c55e',
                    }}
                  >
                    <span>{item.url}</span>
                    <ExternalLink style={{ width: '14px', height: '14px' }} />
                  </a>
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
                    {item.status === 'active' ? t('websites.active') : t('websites.inactive')}
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
        title={editingWebsite 
          ? (language === 'th' ? 'แก้ไขเว็บไซต์' : 'Edit Website')
          : (language === 'th' ? 'เพิ่มเว็บไซต์ใหม่' : 'Add New Website')
        }
        subtitle={editingWebsite 
          ? (language === 'th' ? 'แก้ไขข้อมูลเว็บไซต์ของคุณ' : 'Update your website information')
          : (language === 'th' ? 'กรอกข้อมูลเพื่อเพิ่มเว็บไซต์ใหม่' : 'Fill in details for your new website')
        }
        icon={editingWebsite ? Edit2 : Plus}
        iconColor="#22c55e"
        showSparkle={!editingWebsite}
        footer={
          <>
            <FormButton
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              {language === 'th' ? 'ยกเลิก' : 'Cancel'}
            </FormButton>
            <FormButton
              variant="primary"
              color="#22c55e"
              onClick={handleSave}
              loading={isSubmitting}
              icon={Save}
            >
              {language === 'th' ? 'บันทึก' : 'Save'}
            </FormButton>
          </>
        }
      >
        {/* Website Name */}
        <FormGroup
          label={language === 'th' ? 'ชื่อเว็บไซต์' : 'Website Name'}
          required
          error={formErrors.name}
        >
          <TextInput
            icon={Globe2}
            iconColor="#22c55e"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              if (formErrors.name) setFormErrors({ ...formErrors, name: undefined });
            }}
            placeholder={language === 'th' ? 'กรอกชื่อเว็บไซต์' : 'Enter website name'}
            error={!!formErrors.name}
            size="lg"
          />
        </FormGroup>

        {/* Website URL */}
        <FormGroup
          label="URL"
          required
          error={formErrors.url}
        >
          <TextInput
            icon={Link2}
            iconColor="#3b82f6"
            type="url"
            value={formData.url}
            onChange={(e) => {
              setFormData({ ...formData, url: e.target.value });
              if (formErrors.url) setFormErrors({ ...formErrors, url: undefined });
            }}
            placeholder="https://example.com"
            error={!!formErrors.url}
            size="lg"
          />
        </FormGroup>

        {/* Status */}
        <FormGroup label={language === 'th' ? 'สถานะ' : 'Status'}>
          <ButtonSelect
            options={[
              { value: 'active', label: t('websites.active'), icon: CheckCircle, color: '#22c55e' },
              { value: 'inactive', label: t('websites.inactive'), icon: XCircle, color: '#9ca3af' },
            ]}
            value={formData.status}
            onChange={(value) => setFormData({ ...formData, status: value as 'active' | 'inactive' })}
            columns={2}
          />
        </FormGroup>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen && !!deletingWebsite}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingWebsite(null);
        }}
        onConfirm={handleDelete}
        title={language === 'th' ? 'ยืนยันการลบเว็บไซต์' : 'Confirm Delete Website'}
        subtitle={language === 'th' ? 'คุณกำลังจะลบเว็บไซต์นี้ออกจากระบบ' : 'You are about to delete this website'}
        itemName={deletingWebsite?.name}
        itemDetails={deletingWebsite ? [
          { label: 'URL', value: deletingWebsite.url, icon: Link2 },
          { label: language === 'th' ? 'สถานะ' : 'Status', value: deletingWebsite.status === 'active' ? t('websites.active') : t('websites.inactive'), icon: CheckCircle },
        ] : undefined}
        confirmText={language === 'th' ? 'ยืนยันลบ' : 'Delete'}
        cancelText={language === 'th' ? 'ยกเลิก' : 'Cancel'}
        loading={isSubmitting}
        warningMessage={language === 'th' ? 'การดำเนินการนี้ไม่สามารถยกเลิกได้' : 'This action cannot be undone'}
      />
    </div>
  );
}
