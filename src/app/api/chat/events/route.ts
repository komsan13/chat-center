import { NextRequest, NextResponse } from 'next/server';

// Global event store (shared with webhook)
declare global {
  // eslint-disable-next-line no-var
  var __chatEvents: ChatEvent[];
}

interface ChatEvent {
  id: string;
  type: string;
  data: unknown;
  timestamp: number;
}

// GET - Long polling for chat events
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lastEventId = searchParams.get('lastEventId');
  const timeout = parseInt(searchParams.get('timeout') || '30000');

  const startTime = Date.now();
  const maxWaitTime = Math.min(timeout, 30000); // Max 30 seconds

  // Initialize if needed
  if (!global.__chatEvents) {
    global.__chatEvents = [];
  }

  // Function to get new events
  const getNewEvents = (): ChatEvent[] => {
    if (!lastEventId) {
      // Return recent events (last 5 minutes)
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      return global.__chatEvents.filter(e => e.timestamp > fiveMinutesAgo);
    }

    // Find events after lastEventId
    const lastIndex = global.__chatEvents.findIndex(e => e.id === lastEventId);
    if (lastIndex === -1) {
      // lastEventId not found, return all recent events
      return global.__chatEvents.slice(-20);
    }
    return global.__chatEvents.slice(lastIndex + 1);
  };

  // Check for events immediately
  let events = getNewEvents();
  if (events.length > 0) {
    return NextResponse.json({
      events,
      lastEventId: events[events.length - 1].id,
    });
  }

  // Long polling: wait for new events
  return new Promise<NextResponse>((resolve) => {
    const checkInterval = setInterval(() => {
      events = getNewEvents();
      
      if (events.length > 0) {
        clearInterval(checkInterval);
        resolve(NextResponse.json({
          events,
          lastEventId: events[events.length - 1].id,
        }));
        return;
      }

      // Timeout
      if (Date.now() - startTime >= maxWaitTime) {
        clearInterval(checkInterval);
        resolve(NextResponse.json({
          events: [],
          lastEventId: lastEventId || null,
        }));
      }
    }, 500); // Check every 500ms
  });
}

// POST - Trigger a chat event (for testing or internal use)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type) {
      return NextResponse.json({ error: 'Event type is required' }, { status: 400 });
    }

    if (!global.__chatEvents) {
      global.__chatEvents = [];
    }

    const event: ChatEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
    };

    global.__chatEvents.push(event);

    // Cleanup old events
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    global.__chatEvents = global.__chatEvents
      .filter(e => e.timestamp > fiveMinutesAgo)
      .slice(-100);

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error('[Chat Events API] Error:', error);
    return NextResponse.json({ error: 'Failed to emit event' }, { status: 500 });
  }
}
