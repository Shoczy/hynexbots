import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { authorizeUrl, env } from '@/lib/discord';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!env.clientId || !env.clientSecret) {
    return NextResponse.json(
      { error: 'Discord OAuth not configured. Set DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET.' },
      { status: 500 },
    );
  }
  const state = crypto.randomBytes(16).toString('hex');
  cookies().set('hx_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  });
  return NextResponse.redirect(authorizeUrl(state));
}
