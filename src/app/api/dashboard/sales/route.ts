import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dailySales } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';

export async function GET() {
  try {
    // Get daily sales data
    const salesData = await db.select({
      dayName: dailySales.dayName,
      sales: dailySales.sales,
      orders: dailySales.orders,
    })
      .from(dailySales)
      .orderBy(asc(dailySales.date))
      .limit(7);

    // Calculate summary
    const totalSales = salesData.reduce((sum, item) => sum + item.sales, 0);
    const totalOrders = salesData.reduce((sum, item) => sum + item.orders, 0);
    const avgSales = salesData.length > 0 ? totalSales / salesData.length : 0;

    // Find best day
    const bestDay = salesData.reduce((max, item) => item.sales > max.sales ? item : max, salesData[0] || { dayName: 'N/A', sales: 0, orders: 0 });

    return NextResponse.json({
      success: true,
      data: salesData.map(row => ({
        name: row.dayName,
        sales: row.sales,
        orders: row.orders,
      })),
      summary: {
        totalSales,
        totalOrders,
        avgSales: Math.round(avgSales),
        bestDay: bestDay.dayName,
        bestDaySales: bestDay.sales,
      },
    });
  } catch (error) {
    console.error('Sales chart error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sales data' },
      { status: 500 }
    );
  }
}
