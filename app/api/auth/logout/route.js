import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/requireAuth.js';

export async function POST() {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    isProduction ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.headers.set('Set-Cookie', cookieOptions);
  return response;
}
