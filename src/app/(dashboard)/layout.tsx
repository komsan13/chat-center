'use client';

import { useState } from 'react';
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import RouteGuard from "@/components/RouteGuard";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isDark } = useTheme();

  // Theme colors
  const colors = {
    background: isDark ? '#1D1E24' : '#f8fafc',
    sidebar: isDark ? '#23262B' : '#ffffff',
    border: isDark ? '#2A313C' : '#e2e8f0',
  };

  return (
    <div 
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: colors.background,
        transition: 'background 0.3s ease',
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: sidebarCollapsed ? '80px' : '260px',
          background: colors.sidebar,
          borderRight: `1px solid ${colors.border}`,
          zIndex: 50,
          transition: 'all 0.3s ease',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </aside>

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          marginLeft: sidebarCollapsed ? '80px' : '260px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          transition: 'margin-left 0.3s ease',
        }}
      >
        {/* Header */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            height: '70px',
            background: colors.background,
            borderBottom: `1px solid ${colors.border}`,
            zIndex: 40,
            transition: 'all 0.3s ease',
          }}
        >
          <Header />
        </header>

        {/* Main Content */}
        <main
          style={{
            flex: 1,
            padding: '24px',
            overflowY: 'auto',
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
