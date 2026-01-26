'use client';

import { useState, useEffect } from 'react';
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import RouteGuard from "@/components/RouteGuard";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const { isDark } = useTheme();

  // Detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const mobile = width < 768;
      setIsMobile(mobile);
      
      // Auto collapse sidebar on tablet
      if (width >= 768 && width < 1024) {
        setSidebarCollapsed(true);
      }
      
      // Close mobile sidebar when resizing to desktop
      if (!mobile) {
        setShowMobileSidebar(false);
      }
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Theme colors
  const colors = {
    background: isDark ? '#1D1E24' : '#f8fafc',
    sidebar: isDark ? '#23262B' : '#ffffff',
    border: isDark ? '#2A313C' : '#e2e8f0',
    overlay: 'rgba(0, 0, 0, 0.5)',
  };

  const sidebarWidth = isMobile ? 280 : (sidebarCollapsed ? 80 : 260);

  return (
    <div 
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: colors.background,
        transition: 'background 0.3s ease',
      }}
    >
      {/* Mobile Overlay */}
      {isMobile && showMobileSidebar && (
        <div
          onClick={() => setShowMobileSidebar(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: colors.overlay,
            zIndex: 45,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: isMobile ? (showMobileSidebar ? 0 : -sidebarWidth) : 0,
          bottom: 0,
          width: sidebarWidth,
          background: colors.sidebar,
          borderRight: `1px solid ${colors.border}`,
          zIndex: 50,
          transition: 'all 0.3s ease',
          overflowY: 'auto',
          overflowX: 'hidden',
          boxShadow: isMobile && showMobileSidebar ? '4px 0 20px rgba(0,0,0,0.15)' : 'none',
        }}
      >
        <Sidebar 
          collapsed={isMobile ? false : sidebarCollapsed} 
          onToggle={() => {
            if (isMobile) {
              setShowMobileSidebar(false);
            } else {
              setSidebarCollapsed(!sidebarCollapsed);
            }
          }} 
        />
      </aside>

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          marginLeft: isMobile ? 0 : sidebarWidth,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          transition: 'margin-left 0.3s ease',
          width: isMobile ? '100%' : `calc(100% - ${sidebarWidth}px)`,
        }}
      >
        {/* Header */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            height: isMobile ? '60px' : '70px',
            background: colors.background,
            borderBottom: `1px solid ${colors.border}`,
            zIndex: 40,
            transition: 'all 0.3s ease',
          }}
        >
          <Header 
            onMenuClick={() => setShowMobileSidebar(!showMobileSidebar)} 
            isMobile={isMobile} 
          />
        </header>

        {/* Main Content */}
        <main
          style={{
            flex: 1,
            padding: isMobile ? '12px' : '24px',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <RouteGuard>
          <DashboardContent>{children}</DashboardContent>
        </RouteGuard>
      </LanguageProvider>
    </ThemeProvider>
  );
}
