'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XOctagon, AlertTriangle, Info, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export function ToastContainer({ toasts, onRemove, position = 'top-right' }: ToastContainerProps) {
  const positionStyles: Record<string, React.CSSProperties> = {
    'top-right': { top: '20px', right: '20px' },
    'top-left': { top: '20px', left: '20px' },
    'bottom-right': { bottom: '20px', right: '20px' },
    'bottom-left': { bottom: '20px', left: '20px' },
    'top-center': { top: '20px', left: '50%', transform: 'translateX(-50%)' },
    'bottom-center': { bottom: '20px', left: '50%', transform: 'translateX(-50%)' },
  };

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        pointerEvents: 'none',
        maxWidth: '420px',
        width: '100%',
        ...positionStyles[position],
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const { isDark } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Auto dismiss
    const duration = toast.duration || 4000;
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, duration - 300);

    const removeTimer = setTimeout(() => {
      onRemove(toast.id);
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, toast.duration, onRemove]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const config = {
    success: {
      icon: CheckCircle2,
      gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
      shadowColor: 'rgba(34, 197, 94, 0.35)',
      accentColor: '#22c55e',
    },
    error: {
      icon: XOctagon,
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      shadowColor: 'rgba(239, 68, 68, 0.35)',
      accentColor: '#ef4444',
    },
    warning: {
      icon: AlertTriangle,
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      shadowColor: 'rgba(245, 158, 11, 0.35)',
      accentColor: '#f59e0b',
    },
    info: {
      icon: Info,
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      shadowColor: 'rgba(59, 130, 246, 0.35)',
      accentColor: '#3b82f6',
    },
  };

  const { icon: Icon, gradient, shadowColor, accentColor } = config[toast.type];

  return (
    <div
      style={{
        background: isDark ? '#1A1B1F' : '#ffffff',
        borderRadius: '16px',
        border: isDark ? '1px solid #2A2D35' : '1px solid #e2e8f0',
        boxShadow: isDark 
          ? `0 20px 40px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05), 0 8px 24px ${shadowColor}`
          : `0 20px 40px -12px rgba(0, 0, 0, 0.15), 0 8px 24px ${shadowColor}`,
        overflow: 'hidden',
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'stretch',
        transform: isVisible && !isExiting ? 'translateX(0) scale(1)' : 'translateX(20px) scale(0.95)',
        opacity: isVisible && !isExiting ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Accent bar */}
      <div
        style={{
          width: '4px',
          background: gradient,
          flexShrink: 0,
        }}
      />

      {/* Content */}
      <div style={{ flex: 1, padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
        {/* Icon */}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 4px 12px ${shadowColor}`,
          }}
        >
          <Icon style={{ width: '20px', height: '20px', color: '#ffffff' }} />
        </div>

        {/* Text content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: isDark ? '#ffffff' : '#1e293b',
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            {toast.title}
          </p>
          {toast.message && (
            <p
              style={{
                fontSize: '13px',
                color: isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b',
                margin: '4px 0 0 0',
                lineHeight: 1.4,
              }}
            >
              {toast.message}
            </p>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            color: isDark ? 'rgba(255, 255, 255, 0.4)' : '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
            e.currentTarget.style.color = isDark ? '#ffffff' : '#1e293b';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = isDark ? 'rgba(255, 255, 255, 0.4)' : '#94a3b8';
          }}
        >
          <X style={{ width: '16px', height: '16px' }} />
        </button>
      </div>

      {/* Progress bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            background: accentColor,
            animation: `shrink ${(toast.duration || 4000) / 1000}s linear forwards`,
          }}
        />
      </div>

      <style jsx global>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: Toast['type'], title: string, message?: string, duration?: number) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, title, message, duration }]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((title: string, message?: string, duration?: number) => showToast('success', title, message, duration), [showToast]);
  const error = useCallback((title: string, message?: string, duration?: number) => showToast('error', title, message, duration), [showToast]);
  const warning = useCallback((title: string, message?: string, duration?: number) => showToast('warning', title, message, duration), [showToast]);
  const info = useCallback((title: string, message?: string, duration?: number) => showToast('info', title, message, duration), [showToast]);

  return {
    toasts,
    showToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };
}
