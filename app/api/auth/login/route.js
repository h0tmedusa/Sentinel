import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';
import { verifyPassword, signSession } from '@/lib/auth.js';
import { checkLoginRateLimit, recordFailedLogin, clearLoginAttempts } from '@/lib/loginRateLimiter.js';
import { SESSION_COOKIE_NAME } from '@/lib/requireAuth.js';

function getClientIp(request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || '127.0.0.1';
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { username, password } = body;

    const trimmedUsername = typeof username === 'string' ? username.trim() : '';
    const trimmedPassword = typeof password === 'string' ? password : '';

    const ip = getClientIp(request);

    // 1. Check rate limit before validating
    const rateLimit = checkLoginRateLimit(ip, trimmedUsername);
    if (rateLimit.isLocked) {
      const remainingSecs = Math.ceil(rateLimit.remainingMs / 1000);
      return NextResponse.json(
        { error: `Too many failed login attempts. Please try again in ${remainingSecs} seconds.` },
        { status: 429 }
      );
    }

    if (!trimmedUsername || !trimmedPassword) {
      recordFailedLogin(ip, trimmedUsername);
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // 2. Find user in database
    const user = await prisma.user.findUnique({
      where: { username: trimmedUsername },
    });

    if (!user) {
      recordFailedLogin(ip, trimmedUsername);
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // 3. Verify password using scrypt and timingSafeEqual
    const isValid = await verifyPassword(trimmedPassword, user.passwordHash);
    if (!isValid) {
      recordFailedLogin(ip, trimmedUsername);
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // 4. Clear failed attempts on success
    clearLoginAttempts(ip, trimmedUsername);

    // 5. Create signed session token
    const token = signSession({
      userId: user.id,
      role: user.role,
      issuedAt: Date.now(),
    });

    // 6. Return response with httpOnly cookie
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = [
      `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      isProduction ? 'Secure' : '',
    ]
      .filter(Boolean)
      .join('; ');

    const displayName = user.username.charAt(0).toUpperCase() + user.username.slice(1);

    const response = NextResponse.json({
      username: user.username,
      role: user.role,
      displayName,
    });

    response.headers.set('Set-Cookie', cookieOptions);
    return response;
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
