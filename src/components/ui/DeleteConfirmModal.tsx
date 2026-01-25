'use client';

import { ReactNode } from 'react';
import { AlertTriangle, X, Trash2, LucideIcon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { FormButton } from './FormInputs';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  subtitle?: string;
  itemName?: string;
  itemDetails?: { label: string; value: string; icon?: LucideIcon }[];
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  warningMessage?: string;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  itemName,
  itemDetails,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  loading = false,
  warningMessage,
}: DeleteConfirmModalProps) {
  const { isDark } = useTheme();

  if (!isOpen) return null;

  const colors = {
    modalBg: isDark ? '#1A1B1F' : '#ffffff',
    border: isDark ? '#2A2D35' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#1e293b',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b',
    dangerBg: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
    cardBg: isDark ? '#23262B' : '#f8fafc',
    overlay: 'rgba(0, 0, 0, 0.7)',
  };

  return (
    <div
      style={{
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
        backdropFilter: 'blur(12px)',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: colors.modalBg,
          borderRadius: '20px',
          border: `1px solid ${colors.border}`,
          boxShadow: isDark 
            ? '0 25px 60px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            : '0 25px 60px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header with danger icon */}
        <div
          style={{
            padding: '32px 28px 24px',
            textAlign: 'center',
            background: colors.dangerBg,
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 12px 32px rgba(239, 68, 68, 0.4)',
            }}
          >
            <Trash2 style={{ width: '32px', height: '32px', color: '#ffffff' }} />
          </div>
          <h2
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: colors.text,
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              style={{
                fontSize: '14px',
                color: colors.textMuted,
                margin: '10px 0 0 0',
                lineHeight: 1.5,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px' }}>
          {/* Item Details Card */}
          {(itemName || itemDetails) && (
            <div
              style={{
                padding: '18px',
                borderRadius: '14px',
                background: colors.cardBg,
                border: `1px solid ${colors.border}`,
                marginBottom: warningMessage ? '20px' : '0',
              }}
            >
              {itemName && (
                <p
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: colors.text,
                    margin: 0,
                    textAlign: 'center',
                  }}
                >
                  {itemName}
                </p>
              )}
              {itemDetails && itemDetails.length > 0 && (
                <div style={{ marginTop: itemName ? '16px' : '0' }}>
                  {itemDetails.map((detail, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 0',
                        borderTop: index > 0 ? `1px solid ${colors.border}` : 'none',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '13px',
                          color: colors.textMuted,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        {detail.icon && <detail.icon style={{ width: '14px', height: '14px' }} />}
                        {detail.label}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>
                        {detail.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Warning Message */}
          {warningMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '14px 16px',
                borderRadius: '12px',
                background: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              <AlertTriangle style={{ width: '18px', height: '18px', color: '#f59e0b', flexShrink: 0, marginTop: '1px' }} />
              <p style={{ fontSize: '13px', color: '#f59e0b', margin: 0, lineHeight: 1.5 }}>
                {warningMessage}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '20px 28px',
            borderTop: `1px solid ${colors.border}`,
            display: 'flex',
            gap: '12px',
            background: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.02)',
          }}
        >
          <FormButton
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            fullWidth
          >
            {cancelText}
          </FormButton>
          <FormButton
            variant="danger"
            onClick={onConfirm}
            loading={loading}
            icon={Trash2}
            fullWidth
          >
            {confirmText}
          </FormButton>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
