'use client';

import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <div style={{ 
          background: '#1D1E24', 
          minHeight: '100vh' 
        }}>
          {children}
        </div>
      </ThemeProvider>
    </LanguageProvider>
  );
}
