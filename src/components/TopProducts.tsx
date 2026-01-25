'use client';

import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, TrendingDown, Medal, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface Product {
  rank: number;
  name: string;
  category: string;
  sales: number;
  revenue: string;
  growth: number;
}

const rankColors = ['#eab308', '#9ca3af', '#d97706'];
const productColors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function TopProducts() {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Theme-aware colors
  const colors = {
    cardBg: isDark ? '#23262B' : '#ffffff',
    border: isDark ? '#2A313C' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#1e293b',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b',
    textFaded: isDark ? 'rgba(255, 255, 255, 0.5)' : '#94a3b8',
    itemBg: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
    rankBg: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/dashboard/products?limit=5');
      const result = await response.json();
      if (result.success) {
        setProducts(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      background: colors.cardBg,
      borderRadius: '16px',
      border: `1px solid ${colors.border}`,
      padding: '20px',
      height: '100%',
      boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(234, 179, 8, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Trophy style={{ width: '20px', height: '20px', color: '#eab308' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: colors.text, margin: 0 }}>{t('topProducts.title')}</h3>
            <p style={{ fontSize: '12px', color: colors.textFaded, margin: 0 }}>{t('topProducts.subtitle')}</p>
          </div>
        </div>
        <button style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#eab308',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}>
          {t('topProducts.viewAll')}
        </button>
      </div>

      {/* Products List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {isLoading ? (
          <div style={{ 
            padding: '40px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: colors.textMuted,
            gap: '8px',
          }}>
            <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
            <span>{t('topProducts.loading')}</span>
          </div>
        ) : (
          products.map((product, index) => (
            <div
              key={product.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                borderRadius: '10px',
                background: index < 3 ? colors.itemBg : 'transparent',
                border: index < 3 ? `1px solid ${colors.border}` : 'none',
              }}
            >
              {/* Rank */}
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: index < 3 ? `${rankColors[index]}20` : colors.rankBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {index < 3 ? (
                  index === 0 ? (
                    <Trophy style={{ width: '16px', height: '16px', color: rankColors[index] }} />
                  ) : (
                    <Medal style={{ width: '16px', height: '16px', color: rankColors[index] }} />
                  )
                ) : (
                  <span style={{ fontSize: '12px', fontWeight: 700, color: colors.textFaded }}>{product.rank}</span>
                )}
              </div>

              {/* Product Icon */}
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: productColors[index % productColors.length],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
              }}>
                {product.name.charAt(0)}
              </div>

              {/* Product Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: colors.text,
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {product.name}
                </p>
                <p style={{ fontSize: '11px', color: colors.textFaded, margin: 0 }}>
                  {product.category} · {product.sales.toLocaleString()} {t('topProducts.sold')}
                </p>
              </div>

              {/* Revenue & Growth */}
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: colors.text, margin: 0 }}>{product.revenue}</p>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '4px',
                  marginTop: '2px',
                }}>
                  {product.growth >= 0 ? (
                    <TrendingUp style={{ width: '12px', height: '12px', color: '#10b981' }} />
                  ) : (
                    <TrendingDown style={{ width: '12px', height: '12px', color: '#ef4444' }} />
                  )}
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: product.growth >= 0 ? '#10b981' : '#ef4444',
                  }}>
                    {product.growth >= 0 ? '+' : ''}{product.growth}%
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
