import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

export async function GET(request: Request) {
  const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  const db = new Database(dbPath);

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    
    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Get total revenue (sum of completed orders)
    const revenueResult = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM "Order"
      WHERE status = 'Completed'
      AND datetime(createdAt) >= datetime(?)
    `).get(startDate.toISOString()) as { total: number };

    // Get previous period revenue for comparison
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - periodDays);
    
    const prevRevenueResult = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM "Order"
      WHERE status = 'Completed'
      AND datetime(createdAt) >= datetime(?)
      AND datetime(createdAt) < datetime(?)
    `).get(prevStartDate.toISOString(), startDate.toISOString()) as { total: number };

    // Get total customers
    const customersResult = db.prepare(`
      SELECT COUNT(DISTINCT userId) as total
      FROM "Order"
      WHERE datetime(createdAt) >= datetime(?)
    `).get(startDate.toISOString()) as { total: number };

    const prevCustomersResult = db.prepare(`
      SELECT COUNT(DISTINCT userId) as total
      FROM "Order"
      WHERE datetime(createdAt) >= datetime(?)
      AND datetime(createdAt) < datetime(?)
    `).get(prevStartDate.toISOString(), startDate.toISOString()) as { total: number };

    // Get total orders
    const ordersResult = db.prepare(`
      SELECT COUNT(*) as total
      FROM "Order"
      WHERE datetime(createdAt) >= datetime(?)
    `).get(startDate.toISOString()) as { total: number };

    const prevOrdersResult = db.prepare(`
      SELECT COUNT(*) as total
      FROM "Order"
      WHERE datetime(createdAt) >= datetime(?)
      AND datetime(createdAt) < datetime(?)
    `).get(prevStartDate.toISOString(), startDate.toISOString()) as { total: number };

    // Get completed orders count for conversion rate
    const completedOrdersResult = db.prepare(`
      SELECT COUNT(*) as total
      FROM "Order"
      WHERE status = 'Completed'
      AND datetime(createdAt) >= datetime(?)
    `).get(startDate.toISOString()) as { total: number };

    const prevCompletedOrdersResult = db.prepare(`
      SELECT COUNT(*) as total
      FROM "Order"
      WHERE status = 'Completed'
      AND datetime(createdAt) >= datetime(?)
      AND datetime(createdAt) < datetime(?)
    `).get(prevStartDate.toISOString(), startDate.toISOString()) as { total: number };

    // Calculate conversion rate (completed / total orders)
    const conversionRate = ordersResult.total > 0 
      ? (completedOrdersResult.total / ordersResult.total) * 100 
      : 0;
    
    const prevConversionRate = prevOrdersResult.total > 0 
      ? (prevCompletedOrdersResult.total / prevOrdersResult.total) * 100 
      : 0;

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    db.close();

    return NextResponse.json({
      success: true,
      data: {
        revenue: {
          value: revenueResult.total,
          change: calculateChange(revenueResult.total, prevRevenueResult.total),
          formatted: `$${revenueResult.total.toLocaleString()}`,
        },
        customers: {
          value: customersResult.total,
          change: calculateChange(customersResult.total, prevCustomersResult.total),
          formatted: customersResult.total.toLocaleString(),
        },
        orders: {
          value: ordersResult.total,
          change: calculateChange(ordersResult.total, prevOrdersResult.total),
          formatted: ordersResult.total.toLocaleString(),
        },
        conversionRate: {
          value: conversionRate,
          change: calculateChange(conversionRate, prevConversionRate),
          formatted: `${conversionRate.toFixed(2)}%`,
        },
      },
      period: `Last ${periodDays} days`,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    db.close();
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
