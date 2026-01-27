import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { revenue } from '@/lib/db/schema';
import { asc, sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Get revenue data from Revenue table
    const revenueData = await db.select({
      month: sql<string>`to_char(${revenue.date}, 'YYYY-MM')`,
      revenue: revenue.revenue,
      profit: revenue.profit,
    })
      .from(revenue)
      .orderBy(asc(revenue.date))
      .limit(12);

    // Format month names
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const formattedData = revenueData.map((row) => {
      const [year, monthNum] = row.month.split('-');
      const monthIndex = parseInt(monthNum) - 1;
      return {
        month: monthNames[monthIndex],
        year: parseInt(year),
        revenue: row.revenue,
        profit: row.profit,
      };
    });

    // Calculate totals
    const totalRevenue = formattedData.reduce((sum, item) => sum + item.revenue, 0);
    const totalProfit = formattedData.reduce((sum, item) => sum + item.profit, 0);

    return NextResponse.json({
      success: true,
      data: formattedData,
      summary: {
        totalRevenue,
        totalProfit,
        profitMargin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0,
      },
    });
  } catch (error) {
    console.error('Revenue chart error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch revenue data' },
      { status: 500 }
    );
  }
}
