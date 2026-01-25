import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

interface SalesRow {
  dayName: string;
  sales: number;
  orders: number;
}

export async function GET() {
  const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  const db = new Database(dbPath);

  try {
    // Get daily sales data
    const salesData = db.prepare(`
      SELECT dayName, sales, orders
      FROM DailySales
      ORDER BY date ASC
      LIMIT 7
    `).all() as SalesRow[];

    // Calculate summary
    const totalSales = salesData.reduce((sum, item) => sum + item.sales, 0);
    const totalOrders = salesData.reduce((sum, item) => sum + item.orders, 0);
    const avgSales = salesData.length > 0 ? totalSales / salesData.length : 0;

    // Find best day
    const bestDay = salesData.reduce((max, item) => item.sales > max.sales ? item : max, salesData[0] || { dayName: 'N/A', sales: 0, orders: 0 });

    db.close();

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
    db.close();
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sales data' },
      { status: 500 }
    );
  }
}
