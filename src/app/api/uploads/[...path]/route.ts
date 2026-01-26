import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// GET - Serve uploaded files
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathParts } = await params;
    const filePath = path.join(process.cwd(), 'public', 'uploads', ...pathParts);
    
    // Security check - prevent directory traversal
    const normalizedPath = path.normalize(filePath);
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    
    if (!normalizedPath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    
    // Determine content type
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    
    const contentType = contentTypes[ext] || 'application/octet-stream';
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[Uploads API] Error:', error);
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 });
  }
}
