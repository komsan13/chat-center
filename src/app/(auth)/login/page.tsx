'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles, Check, AlertCircle, Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LoginPage() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false,
  });

  const [validation, setValidation] = useState({
    email: false,
    password: false,
  });

  useEffect(() => {
    setValidation({
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email),
      password: formData.password.length >= 6,
    });
  }, [formData.email, formData.password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || t('login.errorInvalidCredentials'));
        setIsLoading(false);
        return;
      }
      
      router.push('/');
      router.refresh();
    } catch {
      setError(t('login.errorConnection'));
      setIsLoading(false);
    }
  };

  const isFormValid = validation.email && validation.password;

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
      background: '#1D1E24' 
    }}>
      {/* Background Glow */}
      <div style={{
        position: 'absolute',
        top: '-200px',
        left: '-200px',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'rgba(34, 197, 94, 0.08)',
        filter: 'blur(100px)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-200px',
        right: '-200px',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'rgba(22, 163, 74, 0.08)',
        filter: 'blur(80px)',
      }} />

      {/* Login Card */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '420px',
      }}>
        <div style={{
          borderRadius: '20px',
          padding: '40px',
          background: 'linear-gradient(145deg, #23262B 0%, #1D1E24 100%)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}>
          {/* Top Glow Line */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '20%',
            right: '20%',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(34, 197, 94, 0.5), transparent)',
          }} />
          
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              marginBottom: '16px',
              background: 'linear-gradient(145deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',
              boxShadow: '0 8px 25px rgba(34, 197, 94, 0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Server Stack Icon */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ width: '28px', height: '7px', background: 'rgba(255,255,255,0.95)', borderRadius: '2px', display: 'flex', alignItems: 'center', paddingLeft: '3px', gap: '2px' }}>
                  <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#22c55e' }} />
                  <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#22c55e' }} />
                </div>
                <div style={{ width: '28px', height: '7px', background: 'rgba(255,255,255,0.85)', borderRadius: '2px', display: 'flex', alignItems: 'center', paddingLeft: '3px', gap: '2px' }}>
                  <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#f59e0b' }} />
                  <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#22c55e' }} />
                </div>
                <div style={{ width: '28px', height: '7px', background: 'rgba(255,255,255,0.75)', borderRadius: '2px', display: 'flex', alignItems: 'center', paddingLeft: '3px', gap: '2px' }}>
                  <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#22c55e' }} />
                  <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#22c55e' }} />
                </div>
              </div>
              {/* Glow Effect */}
              <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 50%)', pointerEvents: 'none' }} />
            </div>
            <h1 style={{ 
              fontSize: '24px', 
              fontWeight: 800, 
              color: '#ffffff',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}>
              <span style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>DATA</span>
              <span>CENTER</span>
            </h1>
            <p style={{ 
              fontSize: '11px', 
              color: 'rgba(255, 255, 255, 0.5)',
              marginTop: '8px',
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}>
              {t('login.subtitle')}
            </p>
          </div>
          
          {/* Language Switcher */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '24px',
          }}>
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'th' : 'en')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Globe style={{ width: '14px', height: '14px' }} />
              {language === 'en' ? 'ไทย' : 'English'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{ 
              marginBottom: '24px', 
              padding: '16px', 
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <AlertCircle style={{ width: '20px', height: '20px', color: '#ef4444' }} />
              <span style={{ fontSize: '14px', color: '#ef4444' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: 500, 
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '8px',
              }}>
                {t('login.email')}
              </label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ 
                  position: 'absolute', 
                  left: '16px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  width: '18px', 
                  height: '18px', 
                  color: focusedField === 'email' ? '#22c55e' : 'rgba(255, 255, 255, 0.3)',
                  transition: 'color 0.2s ease',
                }} />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="admin@aurix.com"
                  style={{
                    width: '100%',
                    height: '48px',
                    paddingLeft: '48px',
                    paddingRight: validation.email && formData.email ? '48px' : '16px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    color: '#ffffff',
                    background: '#2a2d35',
                    border: focusedField === 'email' ? '1px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: focusedField === 'email' ? '0 0 20px rgba(34, 197, 94, 0.15)' : 'none',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                  }}
                />
                {validation.email && formData.email && (
                  <Check style={{ 
                    position: 'absolute', 
                    right: '16px', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    width: '18px', 
                    height: '18px', 
                    color: '#22c55e',
                  }} />
                )}
              </div>
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: 500, 
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '8px',
              }}>
                {t('login.password')}
              </label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ 
                  position: 'absolute', 
                  left: '16px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  width: '18px', 
                  height: '18px', 
                  color: focusedField === 'password' ? '#22c55e' : 'rgba(255, 255, 255, 0.3)',
                  transition: 'color 0.2s ease',
                }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    height: '48px',
                    paddingLeft: '48px',
                    paddingRight: '48px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    color: '#ffffff',
                    background: '#2a2d35',
                    border: focusedField === 'password' ? '1px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: focusedField === 'password' ? '0 0 20px rgba(34, 197, 94, 0.15)' : 'none',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    color: 'rgba(255, 255, 255, 0.3)',
                  }}
                >
                  {showPassword ? (
                    <EyeOff style={{ width: '18px', height: '18px' }} />
                  ) : (
                    <Eye style={{ width: '18px', height: '18px' }} />
                  )}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '24px',
            }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={formData.remember}
                  onChange={(e) => setFormData({ ...formData, remember: e.target.checked })}
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    accentColor: '#22c55e',
                  }}
                />
                <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  {t('login.rememberMe')}
                </span>
              </label>
              <button 
                type="button" 
                style={{ 
                  background: 'none',
                  border: 'none',
                  fontSize: '13px', 
                  color: '#22c55e',
                  cursor: 'pointer',
                }}
              >
                {t('login.forgotPassword')}
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '12px',
                border: 'none',
                fontSize: '14px',
                fontWeight: 600,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: isFormValid ? 'pointer' : 'not-allowed',
                background: isFormValid 
                  ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                  : 'rgba(34, 197, 94, 0.2)',
                boxShadow: isFormValid ? '0 8px 25px rgba(34, 197, 94, 0.35)' : 'none',
                opacity: isFormValid ? 1 : 0.5,
                transition: 'all 0.2s ease',
              }}
            >
              {isLoading ? (
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTopColor: '#ffffff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
              ) : (
                <>
                  <span>{t('login.signIn')}</span>
                  <ArrowRight style={{ width: '16px', height: '16px' }} />
                </>
              )}
            </button>
          </form>


        </div>
      </div>

      {/* Autofill styles to prevent white background */}
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #2a2d35 inset !important;
          -webkit-text-fill-color: #ffffff !important;
          transition: background-color 5000s ease-in-out 0s;
          caret-color: #ffffff !important;
        }
      `}</style>
    </div>
  );
}
