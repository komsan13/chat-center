'use client';

import { useState, useEffect, useCallback } from 'react';
import { Languages, BellRing, SunMedium, MoonStar, ChevronDown, Menu } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

interface Website {
  id: string;
  name: string;
  nameTh?: string;
}

interface HeaderProps {
  onMenuClick?: () => void;
  isMobile?: boolean;
}

export default function Header({ onMenuClick, isMobile = false }: HeaderProps) {
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);
  const [websiteOptions, setWebsiteOptions] = useState<Website[]>([]);
  const [selectedWebsite, setSelectedWebsite] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { isDark, toggleTheme } = useTheme();

  // Fetch websites from API
  const fetchWebsites = useCallback(async () => {
    try {
      const response = await fetch('/api/websites');
      const result = await response.json();
      if (result.success && result.data.length > 0) {
        const websites = result.data.map((w: { id: string; name: string }) => ({
          id: w.id,
          name: w.name,
          nameTh: w.name, // Use same name for Thai
        }));
        setWebsiteOptions(websites);
        // Set first website as default if no website selected
        if (!selectedWebsite) {
          setSelectedWebsite(websites[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch websites:', error);
    }
  }, [selectedWebsite]);

  useEffect(() => {
    fetchWebsites();
  }, [fetchWebsites]);

  // Theme-aware colors
  const colors = {
    background: isDark ? '#23262B' : '#ffffff',
    border: isDark ? '#2A313C' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#1e293b',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.7)' : '#64748b',
    textFaded: isDark ? 'rgba(255, 255, 255, 0.5)' : '#94a3b8',
    inputBg: isDark ? '#23262B' : '#f8fafc',
    dropdownBg: isDark ? '#1D1E24' : '#ffffff',
    hoverBg: isDark ? '#2A313C' : '#f1f5f9',
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.website-dropdown')) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getUserInitials = () => {
    if (!user?.name) return 'AA';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.name.slice(0, 2).toUpperCase();
  };

  const selectedWebsiteData = websiteOptions.find(w => w.id === selectedWebsite);

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      height: '100%', 
      padding: isMobile ? '0 12px' : '0 24px',
      gap: isMobile ? '8px' : '16px',
    }}>
      {/* Mobile Menu Button */}
      {isMobile && (
        <button
          onClick={onMenuClick}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            border: `1px solid ${colors.border}`,
            background: colors.background,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#22c55e',
            transition: 'all 0.2s ease',
            flexShrink: 0,
          }}
        >
          <Menu style={{ width: '20px', height: '20px' }} />
        </button>
      )}

      {/* Website Selector - Hidden on mobile */}
      {!isMobile && (
        <div 
          className="website-dropdown"
          style={{ 
            position: 'relative', 
            width: '280px',
          }}
        >
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          style={{
            width: '100%',
            height: '44px',
            padding: '0 14px',
            borderRadius: '12px',
            border: `1px solid ${isDropdownOpen ? '#22c55e' : colors.border}`,
            background: colors.inputBg,
            color: colors.text,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: isDropdownOpen ? '0 0 0 3px rgba(34, 197, 94, 0.1)' : 'none',
          }}
        >
          <Languages style={{ width: '18px', height: '18px', color: '#22c55e' }} />
          <span style={{ flex: 1, textAlign: 'left', fontWeight: 500 }}>
            {language === 'th' ? selectedWebsiteData?.nameTh : selectedWebsiteData?.name}
          </span>
          <ChevronDown 
            style={{ 
              width: '18px', 
              height: '18px', 
              color: colors.textFaded,
              transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }} 
          />
        </button>
        
        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            background: colors.dropdownBg,
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            boxShadow: isDark 
              ? '0 10px 40px rgba(0, 0, 0, 0.4)' 
              : '0 10px 40px rgba(0, 0, 0, 0.1)',
            zIndex: 100,
            overflow: 'hidden',
          }}>
            {websiteOptions.map((website) => (
              <button
                key={website.id}
                onClick={() => {
                  setSelectedWebsite(website.id);
                  setIsDropdownOpen(false);
                }}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: 'none',
                  background: selectedWebsite === website.id ? colors.hoverBg : 'transparent',
                  color: colors.text,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (selectedWebsite !== website.id) {
                    e.currentTarget.style.background = colors.hoverBg;
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedWebsite !== website.id) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <Languages style={{ 
                  width: '16px', 
                  height: '16px', 
                  color: selectedWebsite === website.id ? '#22c55e' : colors.textMuted 
                }} />
                <span style={{ 
                  fontWeight: selectedWebsite === website.id ? 600 : 400,
                  color: selectedWebsite === website.id ? '#22c55e' : colors.text,
                }}>
                  {language === 'th' ? website.nameTh : website.name}
                </span>
                {selectedWebsite === website.id && (
                  <span style={{ 
                    marginLeft: 'auto', 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    background: '#22c55e' 
                  }} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Mobile Title */}
      {isMobile && (
        <div style={{ 
          flex: 1, 
          textAlign: 'center',
          fontSize: '16px',
          fontWeight: 600,
          color: colors.text,
        }}>
          Aurix
        </div>
      )}

      {/* Right Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '12px' }}>
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            width: isMobile ? '36px' : '40px',
            height: isMobile ? '36px' : '40px',
            borderRadius: '10px',
            border: isDark ? '1px solid #2A313C' : '1px solid #e5e7eb',
            background: isDark ? '#23262B' : '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: isDark ? '#f59e0b' : '#6366f1',
            transition: 'all 0.2s ease',
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
          }}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <SunMedium style={{ width: '18px', height: '18px' }} /> : <MoonStar style={{ width: '18px', height: '18px' }} />}
        </button>

        {/* Language Switcher - Hidden on mobile */}
        {!isMobile && (
          <button
            onClick={() => setLanguage(language === 'en' ? 'th' : 'en')}
            style={{
              height: '40px',
              padding: '0 14px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: colors.background,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              color: colors.textMuted,
              fontSize: '13px',
              fontWeight: 500,
              transition: 'all 0.2s ease',
            }}
          >
            <Languages style={{ width: '16px', height: '16px' }} />
            {language.toUpperCase()}
          </button>
        )}

        {/* Notifications */}
        <button
          style={{
            position: 'relative',
            width: isMobile ? '36px' : '40px',
            height: isMobile ? '36px' : '40px',
            borderRadius: '10px',
            border: `1px solid ${colors.border}`,
            background: colors.background,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: colors.textMuted,
            transition: 'all 0.2s ease',
          }}
        >
          <BellRing style={{ width: '18px', height: '18px' }} />
          <span style={{
            position: 'absolute',
            top: isMobile ? '6px' : '8px',
            right: isMobile ? '6px' : '8px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#22c55e',
            border: `2px solid ${colors.background}`,
          }} />
        </button>

        {/* Divider - Hidden on mobile */}
        {!isMobile && (
          <div style={{ width: '1px', height: '32px', background: colors.border, margin: '0 8px' }} />
        )}

        {/* User Profile */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: isMobile ? '8px' : '12px', 
          padding: isMobile ? '4px' : '6px 12px 6px 6px',
          borderRadius: '12px',
          background: isMobile ? 'transparent' : colors.background,
          border: isMobile ? 'none' : `1px solid ${colors.border}`,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}>
          <div style={{
            width: isMobile ? '32px' : '36px',
            height: isMobile ? '32px' : '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: isMobile ? '11px' : '13px',
            fontWeight: 700,
          }}>
            {getUserInitials()}
          </div>
          {!isMobile && (
            <>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: colors.text, margin: 0, whiteSpace: 'nowrap' }}>
                  {user?.name || 'Admin Aurix'}
                </p>
                <p style={{ fontSize: '11px', color: colors.textFaded, margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                  admin
                </p>
              </div>
              <ChevronDown style={{ width: '16px', height: '16px', color: colors.textFaded }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
