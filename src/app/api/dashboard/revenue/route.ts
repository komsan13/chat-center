import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

interface RevenueRow {
  month: string;
  revenue: number;
  profit: number;
}

export async function GET() {
  const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  const db = new Database(dbPath);

  try {
    // Get revenue data from Revenue table
    const revenueData = db.prepare(`
      SELECT 
        strftime('%Y-%m', date) as month,
        revenue,
        profit
      FROM Revenue
      ORDER BY date ASC
      LIMIT 12
    `).all() as RevenueRow[];

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

    db.close();

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
    db.close();
    return NextResponse.json(
      { success: false, error: 'Failed to fetch revenue data' },
      { status: 500 }
    );
  }
}
