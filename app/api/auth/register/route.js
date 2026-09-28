import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';
import { hashPassword, signSession } from '@/lib/auth.js';
import { SESSION_COOKIE_NAME } from '@/lib/requireAuth.js';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { username, password, role } = body;

    const trimmedUsername = typeof username === 'string' ? username.trim() : '';
    const trimmedPassword = typeof password === 'string' ? password : '';

    if (!trimmedUsername || trimmedUsername.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters long.' },
        { status: 400 }
      );
    }

    if (!trimmedPassword || trimmedPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existing = await prisma.user.findUnique({
      where: { username: trimmedUsername },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Username is already taken. Please choose another.' },
        { status: 409 }
      );
    }

    // If there are zero users in the database, automatically assign ADMIN,
    // otherwise allow specified role or default to ANALYST.
    const totalUsers = await prisma.user.count();
    const assignedRole = totalUsers === 0 ? 'ADMIN' : (role === 'ADMIN' ? 'ADMIN' : 'ANALYST');

    // Securely hash password with crypto.scrypt + salt
    const passwordHash = await hashPassword(trimmedPassword);

    // Create user in database
    const user = await prisma.user.create({
      data: {
        username: trimmedUsername,
        passwordHash,
        role: assignedRole,
      },
    });

    // Automatically issue signed session cookie so user is logged in
    const token = signSession({
      userId: user.id,
      role: user.role,
      issuedAt: Date.now(),
    });

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
    console.error('Error during registration:', error);
    return NextResponse.json(
      { error: 'Internal server error while registering account' },
      { status: 500 }
    );
  }
}
