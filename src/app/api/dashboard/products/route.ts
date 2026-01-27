import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products, orderItems, orders } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');

    // Get top selling products
    const productsData = await db.select({
      id: products.id,
      name: products.name,
      category: products.category,
      price: products.price,
      totalSold: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
      totalRevenue: sql<number>`COALESCE(SUM(${orderItems.quantity} * ${orderItems.price}), 0)`,
    })
      .from(products)
      .leftJoin(orderItems, eq(products.id, orderItems.productId))
      .leftJoin(orders, sql`${orderItems.orderId} = ${orders.id} AND ${orders.status} = 'Completed'`)
      .groupBy(products.id, products.name, products.category, products.price)
      .orderBy(desc(sql`COALESCE(SUM(${orderItems.quantity} * ${orderItems.price}), 0)`))
      .limit(limit);

    // Calculate previous month data for growth (simplified - using random for demo)
    const formattedProducts = productsData.map((product, index) => {
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
    const totalStats = await db.select({
      totalProducts: sql<number>`COUNT(DISTINCT ${products.id})`,
      totalSold: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
      totalRevenue: sql<number>`COALESCE(SUM(${orderItems.quantity} * ${orderItems.price}), 0)`,
    })
      .from(products)
      .leftJoin(orderItems, eq(products.id, orderItems.productId))
      .leftJoin(orders, sql`${orderItems.orderId} = ${orders.id} AND ${orders.status} = 'Completed'`);

    return NextResponse.json({
      success: true,
      data: formattedProducts,
      summary: {
        totalProducts: totalStats[0]?.totalProducts || 0,
        totalSold: totalStats[0]?.totalSold || 0,
        totalRevenue: totalStats[0]?.totalRevenue || 0,
      },
    });
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
