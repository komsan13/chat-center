import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, users } from '@/lib/db/schema';
import { eq, desc, sql, count } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    // Build query with optional status filter
    let ordersQuery = db.select({
      id: orders.id,
      orderNo: orders.orderNo,
      amount: orders.amount,
      status: orders.status,
      createdAt: orders.createdAt,
      customerName: users.name,
      customerEmail: users.email,
    })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .orderBy(desc(orders.createdAt))
      .limit(limit);

    let ordersData;
    if (status && status !== 'all') {
      ordersData = await db.select({
        id: orders.id,
        orderNo: orders.orderNo,
        amount: orders.amount,
        status: orders.status,
        createdAt: orders.createdAt,
        customerName: users.name,
        customerEmail: users.email,
      })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.id))
        .where(eq(orders.status, status))
        .orderBy(desc(orders.createdAt))
        .limit(limit);
    } else {
      ordersData = await ordersQuery;
    }

    // Format date for display
    const formattedOrders = ordersData.map(order => {
      const date = new Date(order.createdAt);
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
      return {
        id: order.orderNo,
        customer: order.customerName || 'Unknown',
        email: order.customerEmail || 'N/A',
        amount: `$${order.amount.toLocaleString()}`,
        status: order.status,
        date: date.toLocaleDateString('en-US', options),
        rawAmount: order.amount,
        rawDate: order.createdAt.toISOString(),
      };
    });

    // Get status summary
    const statusSummary = await db.select({
      status: orders.status,
      count: count(),
    })
      .from(orders)
      .groupBy(orders.status);

    return NextResponse.json({
      success: true,
      data: formattedOrders,
      summary: {
        total: ordersData.length,
        statusCounts: statusSummary.reduce((acc, item) => {
          acc[item.status] = item.count;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    console.error('Orders API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
