import { NextRequest, NextResponse } from 'next/server';
import { db, lineTokens } from '@/lib/db';
import { eq } from 'drizzle-orm';

// GET - Fetch media content from LINE and proxy it
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params;
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('token');

    if (!tokenId) {
      return NextResponse.json({ error: 'Token ID required' }, { status: 400 });
    }

    // Get LINE token
    const [lineToken] = await db.select().from(lineTokens).where(eq(lineTokens.id, tokenId));
    
    if (!lineToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
    }

    // Fetch media from LINE API
    const lineResponse = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
      headers: {
        'Authorization': `Bearer ${lineToken.accessToken}`,
      },
    });

    if (!lineResponse.ok) {
      console.error('[LINE Media API] Error:', lineResponse.status, await lineResponse.text());
      return NextResponse.json({ error: 'Failed to fetch media' }, { status: lineResponse.status });
    }

    // Get content type from LINE response
    const contentType = lineResponse.headers.get('content-type') || 'application/octet-stream';
    const buffer = await lineResponse.arrayBuffer();

    // Return the media with proper headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error('[LINE Media API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
  }
}
