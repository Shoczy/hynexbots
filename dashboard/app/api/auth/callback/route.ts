import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCode, fetchUser } from '@/lib/discord';
import { createSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expected = cookies().get('hx_oauth_state')?.value;
  cookies().delete('hx_oauth_state');

  if (!code || !state || state !== expected) {
    return NextResponse.redirect(new URL('/?error=auth', req.url));
  }

  try {
    const token = await exchangeCode(code);
    const user = await fetchUser(token);
    createSession({ id: user.id, username: user.username, global_name: user.global_name, avatar: user.avatar });
    return NextResponse.redirect(new URL('/dashboard', req.url));
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(new URL('/?error=auth', req.url));
  }
}
