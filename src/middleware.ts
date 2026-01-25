import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';

// Routes ที่ไม่ต้อง authentication
const publicRoutes = ['/login', '/api/auth/login', '/api/auth/logout', '/api/line/webhook'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }
  
  // Check session
  const token = request.cookies.get('session')?.value;
  
  if (!token) {
    // Redirect to login if no session
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Verify token
  const session = await decrypt(token);
  
  if (!session) {
    // Invalid token, redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('session');
    return response;
  }
  
  // Check if session expired
  if (new Date(session.expiresAt) < new Date()) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('session');
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
