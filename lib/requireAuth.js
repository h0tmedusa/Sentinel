import { prisma } from './prisma.js';
import { verifySession } from './auth.js';

export const SESSION_COOKIE_NAME = 'sentinel_session';

/**
 * Validates the session from the incoming request.
 * Returns the authenticated user object (without passwordHash) or null.
 *
 * @param {Request} request
 * @returns {Promise<{ id: string, username: string, role: string, createdAt: Date } | null>}
 */
export async function getAuthenticatedUser(request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader
        .split(';')
        .map((c) => c.trim().split('='))
        .filter(([k]) => Boolean(k))
        .map(([k, ...v]) => [k, decodeURIComponent(v.join('='))])
    );

    const token = cookies[SESSION_COOKIE_NAME];
    if (!token) return null;

    const session = verifySession(token);
    if (!session || !session.userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) return null;

    return user;
  } catch (err) {
    console.error('Authentication verification error:', err);
    return null;
  }
}

/**
 * Standard requireAuth check for Next.js App Router API routes.
 * Throws an object with an unauthorized Response if not authenticated,
 * or returns the authenticated user.
 *
 * Usage in route:
 *   const user = await requireAuth(request);
 *   if (user instanceof Response) return user;
 *
 * @param {Request} request
 * @returns {Promise<object | Response>}
 */
export async function requireAuth(request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return user;
}
