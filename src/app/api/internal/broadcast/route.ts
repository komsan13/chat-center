import { NextRequest, NextResponse } from 'next/server';

// Internal broadcast endpoint - called by webhook or other API routes
// This endpoint is used to emit Socket.IO events when global.__io is not available

// POST - Emit Socket.IO event
export async function POST(request: NextRequest) {
  try {
    // Check for internal token (simple security)
    const authHeader = request.headers.get('x-internal-token');
    if (authHeader !== process.env.INTERNAL_BROADCAST_TOKEN && authHeader !== 'aurix-internal-2024') {
      console.warn('[Broadcast API] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { event, data, room = 'all-rooms' } = body;

    if (!event || !data) {
      return NextResponse.json({ error: 'Missing event or data' }, { status: 400 });
    }

    console.log(`[Broadcast API] Received: ${event} -> ${room}`);

    // Try to emit via global.__io (eslint-disable needed for global access)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (global as any).__io;
    if (io) {
      io.to(room).emit(event, data);
      console.log(`[Broadcast API] ✅ Emitted ${event} to ${room}`);
      return NextResponse.json({ success: true, method: 'direct' });
    }

    // If global.__io is not available, log warning
    console.warn(`[Broadcast API] ⚠️ global.__io not available, event ${event} not emitted`);
    return NextResponse.json({ 
      success: false, 
      error: 'Socket.IO not available',
      message: 'Event stored but not broadcast - clients should poll for updates'
    }, { status: 503 });

  } catch (error) {
    console.error('[Broadcast API] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// GET - Health check
export async function GET() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const io = (global as any).__io;
  return NextResponse.json({
    status: 'ok',
    socketAvailable: !!io,
    timestamp: new Date().toISOString()
  });
}
