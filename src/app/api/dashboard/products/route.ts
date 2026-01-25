import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

interface ProductSalesRow {
  id: string;
  name: string;
  category: string;
  price: number;
  totalSold: number;
  totalRevenue: number;
}

export async function GET(request: Request) {
  const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  const db = new Database(dbPath);

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');

    // Get top selling products
    const products = db.prepare(`
      SELECT 
        p.id,
        p.name,
        p.category,
        p.price,
        COALESCE(SUM(oi.quantity), 0) as totalSold,
        COALESCE(SUM(oi.quantity * oi.price), 0) as totalRevenue
      FROM Product p
      LEFT JOIN OrderItem oi ON p.id = oi.productId
      LEFT JOIN "Order" o ON oi.orderId = o.id AND o.status = 'Completed'
      GROUP BY p.id
      ORDER BY totalRevenue DESC
      LIMIT ?
    `).all(limit) as ProductSalesRow[];

    // Calculate previous month data for growth (simplified - using random for demo)
    const formattedProducts = products.map((product, index) => {
      // Simulate growth percentage
      const growthRates = [12.5, 8.2, 15.7, -3.2, 22.4, 5.1, -1.8, 9.3];
      const growth = growthRates[index % growthRates.length];
      
      // Format revenue
      const revenue = product.totalRevenue;
      let formattedRevenue: string;
      if (revenue >= 1000000) {
        formattedRevenue = `$${(revenue / 1000000).toFixed(1)}M`;
      } else if (revenue >= 1000) {
        formattedRevenue = `$${(revenue / 1000).toFixed(0)}K`;
      } else {
        formattedRevenue = `$${revenue.toFixed(0)}`;
      }

      return {
        rank: index + 1,
        name: product.name,
        category: product.category,
        sales: product.totalSold,
        revenue: formattedRevenue,
        rawRevenue: product.totalRevenue,
        growth,
      };
    });

    // Get total stats
    const totalStats = db.prepare(`
      SELECT 
        COUNT(DISTINCT p.id) as totalProducts,
        COALESCE(SUM(oi.quantity), 0) as totalSold,
        COALESCE(SUM(oi.quantity * oi.price), 0) as totalRevenue
      FROM Product p
      LEFT JOIN OrderItem oi ON p.id = oi.productId
      LEFT JOIN "Order" o ON oi.orderId = o.id AND o.status = 'Completed'
    `).get() as { totalProducts: number; totalSold: number; totalRevenue: number };

    db.close();

    return NextResponse.json({
      success: true,
      data: formattedProducts,
      summary: {
        totalProducts: totalStats.totalProducts,
        totalSold: totalStats.totalSold,
        totalRevenue: totalStats.totalRevenue,
      },
    });
  } catch (error) {
    console.error('Products API error:', error);
    db.close();
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
