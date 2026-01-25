import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json({ success: true });
    
    // Delete session cookie
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      expires: new Date(0),
      sameSite: 'lax',
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
