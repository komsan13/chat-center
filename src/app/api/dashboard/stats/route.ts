import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { eq, sql, and, gte, lt, count } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    
    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Get previous period start date for comparison
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - periodDays);

    // Get total revenue (sum of completed orders)
    const revenueResult = await db.select({
      total: sql<number>`COALESCE(SUM(${orders.amount}), 0)`
    }).from(orders)
      .where(and(
        eq(orders.status, 'Completed'),
        gte(orders.createdAt, startDate)
      ));

    // Get previous period revenue for comparison
    const prevRevenueResult = await db.select({
      total: sql<number>`COALESCE(SUM(${orders.amount}), 0)`
    }).from(orders)
      .where(and(
        eq(orders.status, 'Completed'),
        gte(orders.createdAt, prevStartDate),
        lt(orders.createdAt, startDate)
      ));

    // Get total customers
    const customersResult = await db.select({
      total: sql<number>`COUNT(DISTINCT ${orders.userId})`
    }).from(orders)
      .where(gte(orders.createdAt, startDate));

    const prevCustomersResult = await db.select({
      total: sql<number>`COUNT(DISTINCT ${orders.userId})`
    }).from(orders)
      .where(and(
        gte(orders.createdAt, prevStartDate),
        lt(orders.createdAt, startDate)
      ));

    // Get total orders
    const ordersResult = await db.select({
      total: count()
    }).from(orders)
      .where(gte(orders.createdAt, startDate));

    const prevOrdersResult = await db.select({
      total: count()
    }).from(orders)
      .where(and(
        gte(orders.createdAt, prevStartDate),
        lt(orders.createdAt, startDate)
      ));

    // Get completed orders count for conversion rate
    const completedOrdersResult = await db.select({
      total: count()
    }).from(orders)
      .where(and(
        eq(orders.status, 'Completed'),
        gte(orders.createdAt, startDate)
      ));

    const prevCompletedOrdersResult = await db.select({
      total: count()
    }).from(orders)
      .where(and(
        eq(orders.status, 'Completed'),
        gte(orders.createdAt, prevStartDate),
        lt(orders.createdAt, startDate)
      ));

    // Extract values
    const revenueTotal = revenueResult[0]?.total || 0;
    const prevRevenueTotal = prevRevenueResult[0]?.total || 0;
    const customersTotal = customersResult[0]?.total || 0;
    const prevCustomersTotal = prevCustomersResult[0]?.total || 0;
    const ordersTotal = ordersResult[0]?.total || 0;
    const prevOrdersTotal = prevOrdersResult[0]?.total || 0;
    const completedOrdersTotal = completedOrdersResult[0]?.total || 0;
    const prevCompletedOrdersTotal = prevCompletedOrdersResult[0]?.total || 0;

    // Calculate conversion rate (completed / total orders)
    const conversionRate = ordersTotal > 0 
      ? (completedOrdersTotal / ordersTotal) * 100 
      : 0;
    
    const prevConversionRate = prevOrdersTotal > 0 
      ? (prevCompletedOrdersTotal / prevOrdersTotal) * 100 
      : 0;

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    return NextResponse.json({
      success: true,
      data: {
        revenue: {
          value: revenueTotal,
          change: calculateChange(revenueTotal, prevRevenueTotal),
          formatted: `$${revenueTotal.toLocaleString()}`,
        },
        customers: {
          value: customersTotal,
          change: calculateChange(customersTotal, prevCustomersTotal),
          formatted: customersTotal.toLocaleString(),
        },
        orders: {
          value: ordersTotal,
          change: calculateChange(ordersTotal, prevOrdersTotal),
          formatted: ordersTotal.toLocaleString(),
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
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
