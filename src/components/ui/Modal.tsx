'use client';

import { ReactNode, useEffect } from 'react';
import { X, Sparkles, LucideIcon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
  showSparkle?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconColor = '#22c55e',
  children,
  footer,
  maxWidth = '560px',
  showSparkle = false,
}: ModalProps) {
  const { isDark } = useTheme();

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const colors = {
    modalBg: isDark ? '#1A1B1F' : '#ffffff',
    headerBg: isDark 
      ? `linear-gradient(135deg, ${iconColor}15 0%, transparent 100%)`
      : `linear-gradient(135deg, ${iconColor}10 0%, transparent 100%)`,
    border: isDark ? '#2A2D35' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#1e293b',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b',
    inputBg: isDark ? '#23262B' : '#f8fafc',
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
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth,
          maxHeight: '90vh',
          background: colors.modalBg,
          borderRadius: '20px',
          border: `1px solid ${colors.border}`,
          boxShadow: isDark 
            ? '0 25px 60px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            : '0 25px 60px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '24px 28px',
            borderBottom: `1px solid ${colors.border}`,
            background: colors.headerBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {Icon && (
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  background: `linear-gradient(135deg, ${iconColor} 0%, ${iconColor}dd 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 8px 24px ${iconColor}40`,
                }}
              >
                <Icon style={{ width: '26px', height: '26px', color: '#fff' }} />
              </div>
            )}
            <div>
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: colors.text,
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  letterSpacing: '-0.02em',
                }}
              >
                {title}
                {showSparkle && (
                  <Sparkles
                    style={{ width: '18px', height: '18px', color: iconColor }}
                  />
                )}
              </h2>
              {subtitle && (
                <p
                  style={{
                    fontSize: '14px',
                    color: colors.textMuted,
                    margin: '6px 0 0 0',
                    lineHeight: 1.4,
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              border: `1px solid ${colors.border}`,
              background: colors.inputBg,
              color: colors.textMuted,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? '#2A2D35' : '#f1f5f9';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = colors.inputBg;
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '28px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div
            style={{
              padding: '20px 28px',
              borderTop: `1px solid ${colors.border}`,
              background: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.02)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            {footer}
          </div>
        )}
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
