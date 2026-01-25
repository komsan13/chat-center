'use client';

import { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';
import { LucideIcon, AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

// ============================================
// Form Group Component
// ============================================
interface FormGroupProps {
  label?: string;
  required?: boolean;
  error?: string;
  success?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

export function FormGroup({ label, required, error, success, hint, children, className }: FormGroupProps) {
  const { isDark } = useTheme();

  const colors = {
    text: isDark ? '#ffffff' : '#1e293b',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.5)' : '#64748b',
  };

  return (
    <div className={className} style={{ marginBottom: '24px' }}>
      {label && (
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 600,
            color: colors.text,
            marginBottom: '10px',
            letterSpacing: '-0.01em',
          }}
        >
          {label}
          {required && (
            <span style={{ color: '#ef4444', fontSize: '14px' }}>*</span>
          )}
        </label>
      )}
      {children}
      {(error || success || hint) && (
        <p
          style={{
            fontSize: '12px',
            color: error ? '#ef4444' : success ? '#22c55e' : colors.textMuted,
            margin: '8px 0 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            lineHeight: 1.4,
          }}
        >
          {error && <AlertCircle style={{ width: '14px', height: '14px', flexShrink: 0 }} />}
          {success && <CheckCircle2 style={{ width: '14px', height: '14px', flexShrink: 0 }} />}
          {error || success || hint}
        </p>
      )}
    </div>
  );
}

// ============================================
// Text Input Component
// ============================================
interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  icon?: LucideIcon;
  iconColor?: string;
  error?: boolean;
  success?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'outlined';
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ icon: Icon, iconColor, error, success, size = 'md', variant = 'default', style, ...props }, ref) => {
    const { isDark } = useTheme();

    const sizes = {
      sm: { height: '40px', padding: Icon ? '0 12px 0 40px' : '0 12px', fontSize: '13px', iconSize: 16 },
      md: { height: '48px', padding: Icon ? '0 16px 0 48px' : '0 16px', fontSize: '14px', iconSize: 18 },
      lg: { height: '56px', padding: Icon ? '0 18px 0 54px' : '0 18px', fontSize: '15px', iconSize: 20 },
    };

    const sizeConfig = sizes[size];

    const colors = {
      inputBg: isDark ? '#23262B' : '#f8fafc',
      border: error ? '#ef4444' : success ? '#22c55e' : (isDark ? '#2A2D35' : '#e2e8f0'),
      text: isDark ? '#ffffff' : '#1e293b',
      textMuted: isDark ? 'rgba(255, 255, 255, 0.4)' : '#94a3b8',
      focusBorder: error ? '#ef4444' : success ? '#22c55e' : '#3b82f6',
      hoverBorder: isDark ? '#3A3D45' : '#cbd5e1',
    };

    return (
      <div style={{ position: 'relative' }}>
        {Icon && (
          <Icon
            style={{
              position: 'absolute',
              left: size === 'sm' ? '12px' : size === 'lg' ? '18px' : '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: sizeConfig.iconSize,
              height: sizeConfig.iconSize,
              color: iconColor || (error ? '#ef4444' : success ? '#22c55e' : colors.textMuted),
              pointerEvents: 'none',
              transition: 'color 0.2s ease',
            }}
          />
        )}
        <input
          ref={ref}
          {...props}
          style={{
            width: '100%',
            height: sizeConfig.height,
            padding: sizeConfig.padding,
            borderRadius: '12px',
            border: `2px solid ${colors.border}`,
            background: colors.inputBg,
            color: colors.text,
            fontSize: sizeConfig.fontSize,
            fontWeight: 500,
            outline: 'none',
            transition: 'all 0.2s ease',
            boxSizing: 'border-box',
            ...style,
          }}
          onFocus={(e) => {
            e.target.style.borderColor = colors.focusBorder;
            e.target.style.boxShadow = `0 0 0 4px ${colors.focusBorder}20`;
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.target.style.borderColor = colors.border;
            e.target.style.boxShadow = 'none';
            props.onBlur?.(e);
          }}
        />
      </div>
    );
  }
);
TextInput.displayName = 'TextInput';

// ============================================
// Number Input Component
// ============================================
interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  icon?: LucideIcon;
  iconColor?: string;
  error?: boolean;
  success?: boolean;
  size?: 'sm' | 'md' | 'lg';
  prefix?: string;
  suffix?: string;
  highlight?: 'positive' | 'negative' | 'neutral';
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ icon: Icon, iconColor, error, success, size = 'md', prefix, suffix, highlight, style, ...props }, ref) => {
    const { isDark } = useTheme();

    const sizes = {
      sm: { height: '40px', padding: '0 12px', fontSize: '14px', iconSize: 16 },
      md: { height: '48px', padding: '0 16px', fontSize: '16px', iconSize: 18 },
      lg: { height: '56px', padding: '0 18px', fontSize: '18px', iconSize: 20 },
    };

    const sizeConfig = sizes[size];

    const highlightColors = {
      positive: '#22c55e',
      negative: '#ef4444',
      neutral: isDark ? '#ffffff' : '#1e293b',
    };

    const colors = {
      inputBg: isDark ? '#23262B' : '#f8fafc',
      border: error ? '#ef4444' : success ? '#22c55e' : (isDark ? '#2A2D35' : '#e2e8f0'),
      text: highlight ? highlightColors[highlight] : (isDark ? '#ffffff' : '#1e293b'),
      textMuted: isDark ? 'rgba(255, 255, 255, 0.4)' : '#94a3b8',
      focusBorder: error ? '#ef4444' : success ? '#22c55e' : '#3b82f6',
    };

    const paddingLeft = Icon ? (size === 'sm' ? '40px' : size === 'lg' ? '54px' : '48px') : (prefix ? '32px' : '16px');
    const paddingRight = suffix ? '40px' : '16px';

    return (
      <div style={{ position: 'relative' }}>
        {Icon && (
          <Icon
            style={{
              position: 'absolute',
              left: size === 'sm' ? '12px' : size === 'lg' ? '18px' : '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: sizeConfig.iconSize,
              height: sizeConfig.iconSize,
              color: iconColor || (highlight ? highlightColors[highlight] : colors.textMuted),
              pointerEvents: 'none',
            }}
          />
        )}
        {prefix && !Icon && (
          <span
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.textMuted,
              fontSize: sizeConfig.fontSize,
              fontWeight: 600,
              pointerEvents: 'none',
            }}
          >
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          type="number"
          {...props}
          style={{
            width: '100%',
            height: sizeConfig.height,
            paddingLeft,
            paddingRight,
            borderRadius: '12px',
            border: `2px solid ${colors.border}`,
            background: colors.inputBg,
            color: colors.text,
            fontSize: sizeConfig.fontSize,
            fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', monospace",
            fontWeight: 600,
            outline: 'none',
            transition: 'all 0.2s ease',
            boxSizing: 'border-box',
            MozAppearance: 'textfield',
            ...style,
          }}
          onFocus={(e) => {
            e.target.style.borderColor = colors.focusBorder;
            e.target.style.boxShadow = `0 0 0 4px ${colors.focusBorder}20`;
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.target.style.borderColor = colors.border;
            e.target.style.boxShadow = 'none';
            props.onBlur?.(e);
          }}
        />
        {suffix && (
          <span
            style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.textMuted,
              fontSize: '13px',
              fontWeight: 500,
              pointerEvents: 'none',
            }}
          >
            {suffix}
          </span>
        )}
      </div>
    );
  }
);
NumberInput.displayName = 'NumberInput';

// ============================================
// Select Input Component
// ============================================
interface SelectOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  color?: string;
}

interface SelectInputProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: SelectOption[];
  icon?: LucideIcon;
  iconColor?: string;
  error?: boolean;
  success?: boolean;
  size?: 'sm' | 'md' | 'lg';
  placeholder?: string;
}

export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(
  ({ options, icon: Icon, iconColor, error, success, size = 'md', placeholder, style, ...props }, ref) => {
    const { isDark } = useTheme();

    const sizes = {
      sm: { height: '40px', padding: Icon ? '0 36px 0 40px' : '0 36px 0 12px', fontSize: '13px', iconSize: 16 },
      md: { height: '48px', padding: Icon ? '0 40px 0 48px' : '0 40px 0 16px', fontSize: '14px', iconSize: 18 },
      lg: { height: '56px', padding: Icon ? '0 44px 0 54px' : '0 44px 0 18px', fontSize: '15px', iconSize: 20 },
    };

    const sizeConfig = sizes[size];

    const colors = {
      inputBg: isDark ? '#23262B' : '#f8fafc',
      border: error ? '#ef4444' : success ? '#22c55e' : (isDark ? '#2A2D35' : '#e2e8f0'),
      text: isDark ? '#ffffff' : '#1e293b',
      textMuted: isDark ? 'rgba(255, 255, 255, 0.4)' : '#94a3b8',
      focusBorder: error ? '#ef4444' : success ? '#22c55e' : '#3b82f6',
    };

    return (
      <div style={{ position: 'relative' }}>
        {Icon && (
          <Icon
            style={{
              position: 'absolute',
              left: size === 'sm' ? '12px' : size === 'lg' ? '18px' : '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: sizeConfig.iconSize,
              height: sizeConfig.iconSize,
              color: iconColor || colors.textMuted,
              pointerEvents: 'none',
            }}
          />
        )}
        <select
          ref={ref}
          {...props}
          style={{
            width: '100%',
            height: sizeConfig.height,
            padding: sizeConfig.padding,
            borderRadius: '12px',
            border: `2px solid ${colors.border}`,
            background: colors.inputBg,
            color: props.value ? colors.text : colors.textMuted,
            fontSize: sizeConfig.fontSize,
            fontWeight: 500,
            outline: 'none',
            cursor: 'pointer',
            appearance: 'none',
            transition: 'all 0.2s ease',
            boxSizing: 'border-box',
            ...style,
          }}
          onFocus={(e) => {
            e.target.style.borderColor = colors.focusBorder;
            e.target.style.boxShadow = `0 0 0 4px ${colors.focusBorder}20`;
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.target.style.borderColor = colors.border;
            e.target.style.boxShadow = 'none';
            props.onBlur?.(e);
          }}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          style={{
            position: 'absolute',
            right: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '18px',
            height: '18px',
            color: colors.textMuted,
            pointerEvents: 'none',
          }}
        />
      </div>
    );
  }
);
SelectInput.displayName = 'SelectInput';

// ============================================
// Textarea Component
// ============================================
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  success?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, success, style, ...props }, ref) => {
    const { isDark } = useTheme();

    const colors = {
      inputBg: isDark ? '#23262B' : '#f8fafc',
      border: error ? '#ef4444' : success ? '#22c55e' : (isDark ? '#2A2D35' : '#e2e8f0'),
      text: isDark ? '#ffffff' : '#1e293b',
      focusBorder: error ? '#ef4444' : success ? '#22c55e' : '#3b82f6',
    };

    return (
      <textarea
        ref={ref}
        {...props}
        style={{
          width: '100%',
          minHeight: '120px',
          padding: '14px 16px',
          borderRadius: '12px',
          border: `2px solid ${colors.border}`,
          background: colors.inputBg,
          color: colors.text,
          fontSize: '14px',
          fontWeight: 500,
          lineHeight: 1.6,
          outline: 'none',
          resize: 'vertical',
          transition: 'all 0.2s ease',
          boxSizing: 'border-box',
          ...style,
        }}
        onFocus={(e) => {
          e.target.style.borderColor = colors.focusBorder;
          e.target.style.boxShadow = `0 0 0 4px ${colors.focusBorder}20`;
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.target.style.borderColor = colors.border;
          e.target.style.boxShadow = 'none';
          props.onBlur?.(e);
        }}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

// ============================================
// Button Select Group (Radio-like buttons)
// ============================================
interface ButtonOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  color?: string;
}

interface ButtonSelectProps {
  options: ButtonOption[];
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'pill';
  error?: boolean;
  columns?: number;
}

export function ButtonSelect({ options, value, onChange, size = 'md', variant = 'default', error, columns }: ButtonSelectProps) {
  const { isDark } = useTheme();

  const sizes = {
    sm: { height: '40px', fontSize: '12px', iconSize: 14, padding: '0 12px', gap: '6px' },
    md: { height: '48px', fontSize: '13px', iconSize: 16, padding: '0 16px', gap: '8px' },
    lg: { height: '56px', fontSize: '14px', iconSize: 18, padding: '0 20px', gap: '10px' },
  };

  const sizeConfig = sizes[size];

  const colors = {
    bg: isDark ? '#23262B' : '#f8fafc',
    border: error ? '#ef4444' : (isDark ? '#2A2D35' : '#e2e8f0'),
    text: isDark ? '#ffffff' : '#1e293b',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.5)' : '#64748b',
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: columns ? `repeat(${columns}, 1fr)` : `repeat(auto-fit, minmax(120px, 1fr))`,
        gap: '10px',
      }}
    >
      {options.map((opt) => {
        const isSelected = value === opt.value;
        const optColor = opt.color || '#3b82f6';

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              height: sizeConfig.height,
              padding: sizeConfig.padding,
              borderRadius: variant === 'pill' ? '100px' : '12px',
              border: `2px solid ${isSelected ? optColor : colors.border}`,
              background: isSelected ? `${optColor}15` : 'transparent',
              color: isSelected ? optColor : colors.textMuted,
              fontSize: sizeConfig.fontSize,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: sizeConfig.gap,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isSelected ? `0 4px 16px ${optColor}30` : 'none',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = optColor;
                e.currentTarget.style.background = `${optColor}08`;
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = colors.border;
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {opt.icon && <opt.icon style={{ width: sizeConfig.iconSize, height: sizeConfig.iconSize }} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ============================================
// Chip Select (Multiple selection chips)
// ============================================
interface ChipOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  color?: string;
}

interface ChipSelectProps {
  options: ChipOption[];
  value: string[];
  onChange: (value: string[]) => void;
  multiple?: boolean;
  error?: boolean;
  placeholder?: string;
}

export function ChipSelect({ options, value, onChange, multiple = true, error, placeholder }: ChipSelectProps) {
  const { isDark } = useTheme();

  const colors = {
    bg: isDark ? '#23262B' : '#f8fafc',
    border: error ? '#ef4444' : (isDark ? '#2A2D35' : '#e2e8f0'),
    text: isDark ? '#ffffff' : '#1e293b',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.5)' : '#64748b',
  };

  const handleClick = (optValue: string) => {
    if (multiple) {
      if (value.includes(optValue)) {
        onChange(value.filter(v => v !== optValue));
      } else {
        onChange([...value, optValue]);
      }
    } else {
      onChange([optValue]);
    }
  };

  return (
    <div
      style={{
        padding: '14px',
        borderRadius: '14px',
        border: `2px solid ${colors.border}`,
        background: colors.bg,
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        minHeight: '52px',
        alignItems: 'center',
      }}
    >
      {options.length === 0 && placeholder ? (
        <span style={{ fontSize: '13px', color: colors.textMuted }}>{placeholder}</span>
      ) : (
        options.map((opt) => {
          const isSelected = value.includes(opt.value);
          const optColor = opt.color || '#3b82f6';

          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleClick(opt.value)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                border: `2px solid ${isSelected ? optColor : 'transparent'}`,
                background: isSelected ? `${optColor}15` : (isDark ? '#2A2D35' : '#e2e8f0'),
                color: isSelected ? optColor : colors.textMuted,
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = isDark ? '#3A3D45' : '#cbd5e1';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = isDark ? '#2A2D35' : '#e2e8f0';
                }
              }}
            >
              {opt.icon && <opt.icon style={{ width: '16px', height: '16px' }} />}
              {opt.label}
            </button>
          );
        })
      )}
    </div>
  );
}

// ============================================
// Form Button Component
// ============================================
interface FormButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  color?: string;
  fullWidth?: boolean;
}

export function FormButton({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon: Icon,
  color,
  fullWidth = false,
}: FormButtonProps) {
  const { isDark } = useTheme();

  const sizes = {
    sm: { height: '40px', padding: '0 16px', fontSize: '13px', iconSize: 16 },
    md: { height: '48px', padding: '0 24px', fontSize: '14px', iconSize: 18 },
    lg: { height: '56px', padding: '0 32px', fontSize: '15px', iconSize: 20 },
  };

  const sizeConfig = sizes[size];

  const getVariantStyles = () => {
    const primaryColor = color || '#3b82f6';
    
    switch (variant) {
      case 'primary':
        return {
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
          color: '#ffffff',
          border: 'none',
          boxShadow: `0 4px 16px ${primaryColor}40`,
          hoverShadow: `0 6px 24px ${primaryColor}50`,
        };
      case 'secondary':
        return {
          background: 'transparent',
          color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#64748b',
          border: `1px solid ${isDark ? '#2A2D35' : '#e2e8f0'}`,
          boxShadow: 'none',
          hoverBg: isDark ? '#2A2D35' : '#f1f5f9',
        };
      case 'danger':
        return {
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 4px 16px rgba(239, 68, 68, 0.4)',
          hoverShadow: '0 6px 24px rgba(239, 68, 68, 0.5)',
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b',
          border: 'none',
          boxShadow: 'none',
          hoverBg: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        height: sizeConfig.height,
        padding: sizeConfig.padding,
        borderRadius: '12px',
        border: variantStyles.border,
        background: variantStyles.background,
        color: variantStyles.color,
        fontSize: sizeConfig.fontSize,
        fontWeight: 600,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        boxShadow: variantStyles.boxShadow,
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: disabled || loading ? 0.6 : 1,
        width: fullWidth ? '100%' : 'auto',
        letterSpacing: '-0.01em',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          if (variantStyles.hoverShadow) {
            e.currentTarget.style.boxShadow = variantStyles.hoverShadow;
            e.currentTarget.style.transform = 'translateY(-2px)';
          }
          if (variantStyles.hoverBg) {
            e.currentTarget.style.background = variantStyles.hoverBg;
          }
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = variantStyles.boxShadow || 'none';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.background = variantStyles.background;
      }}
    >
      {loading ? (
        <div
          style={{
            width: sizeConfig.iconSize,
            height: sizeConfig.iconSize,
            border: '2px solid transparent',
            borderTopColor: 'currentColor',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      ) : (
        Icon && <Icon style={{ width: sizeConfig.iconSize, height: sizeConfig.iconSize }} />
      )}
      {children}
      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </button>
  );
}

// ============================================
// Preview Card Component (for calculated values)
// ============================================
interface PreviewCardProps {
  label: string;
  sublabel?: string;
  value: string | number;
  icon?: LucideIcon;
  variant?: 'positive' | 'negative' | 'neutral' | 'info';
}

export function PreviewCard({ label, sublabel, value, icon: Icon, variant = 'neutral' }: PreviewCardProps) {
  const { isDark } = useTheme();

  const variantColors = {
    positive: '#22c55e',
    negative: '#ef4444',
    neutral: isDark ? '#a1a1aa' : '#64748b',
    info: '#3b82f6',
  };

  const color = variantColors[variant];

  return (
    <div
      style={{
        padding: '20px',
        borderRadius: '16px',
        background: isDark ? `${color}10` : `${color}08`,
        border: `2px solid ${color}25`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        {Icon && (
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 14px ${color}35`,
            }}
          >
            <Icon style={{ width: '20px', height: '20px', color: '#ffffff' }} />
          </div>
        )}
        <div>
          <p style={{ fontSize: '13px', color: isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b', margin: 0, fontWeight: 500 }}>
            {label}
          </p>
          {sublabel && (
            <p style={{ fontSize: '11px', color: isDark ? 'rgba(255, 255, 255, 0.4)' : '#94a3b8', margin: '2px 0 0 0' }}>
              {sublabel}
            </p>
          )}
        </div>
      </div>
      <div
        style={{
          fontSize: '32px',
          fontWeight: 700,
          color: color,
          fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', monospace",
          textAlign: 'center',
          padding: '8px 0',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ============================================
// Divider Component
// ============================================
interface DividerProps {
  label?: string;
}

export function Divider({ label }: DividerProps) {
  const { isDark } = useTheme();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        margin: '28px 0',
      }}
    >
      <div style={{ flex: 1, height: '1px', background: isDark ? '#2A2D35' : '#e2e8f0' }} />
      {label && (
        <span style={{ fontSize: '12px', fontWeight: 600, color: isDark ? 'rgba(255, 255, 255, 0.4)' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
      )}
      <div style={{ flex: 1, height: '1px', background: isDark ? '#2A2D35' : '#e2e8f0' }} />
    </div>
  );
}
