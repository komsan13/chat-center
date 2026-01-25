import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

interface OrderRow {
  id: string;
  orderNo: string;
  amount: number;
  status: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
}

export async function GET(request: Request) {
  const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  const db = new Database(dbPath);

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    let query = `
      SELECT 
        o.id,
        o.orderNo,
        o.amount,
        o.status,
        o.createdAt,
        u.name as customerName,
        u.email as customerEmail
      FROM "Order" o
      LEFT JOIN User u ON o.userId = u.id
    `;

    const params: (string | number)[] = [];
    
    if (status && status !== 'all') {
      query += ` WHERE o.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY o.createdAt DESC LIMIT ?`;
    params.push(limit);

    const orders = db.prepare(query).all(...params) as OrderRow[];

    // Format date for display
    const formattedOrders = orders.map(order => {
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
        rawDate: order.createdAt,
      };
    });

    // Get status summary
    const statusSummary = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM "Order"
      GROUP BY status
    `).all() as { status: string; count: number }[];

    db.close();

    return NextResponse.json({
      success: true,
      data: formattedOrders,
      summary: {
        total: orders.length,
        statusCounts: statusSummary.reduce((acc, item) => {
          acc[item.status] = item.count;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    console.error('Orders API error:', error);
    db.close();
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
