import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/requireAuth.js';

export async function GET(request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const displayName = user.username.charAt(0).toUpperCase() + user.username.slice(1);

  return NextResponse.json({
    username: user.username,
    role: user.role,
    displayName,
  });
}
