import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCode, fetchUser } from '@/lib/discord';
import { createSession } from '@/lib/session';
import { withBase } from '@/lib/paths';

export const dynamic = 'force-dynamic';

// Relative redirect so the browser resolves it against the public origin (the
// site that proxies /dashboard) rather than this app's internal host/port.
function redirectTo(path: string) {
  return new NextResponse(null, { status: 302, headers: { Location: withBase(path) } });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expected = cookies().get('hx_oauth_state')?.value;
  cookies().delete('hx_oauth_state');

  if (!code || !state || state !== expected) {
    return redirectTo('/?error=auth');
  }

  try {
    const token = await exchangeCode(code);
    const user = await fetchUser(token);
    createSession({ id: user.id, username: user.username, global_name: user.global_name, avatar: user.avatar });
    return redirectTo('/bots');
  } catch (err) {
    console.error('OAuth callback error:', err);
    return redirectTo('/?error=auth');
  }
}
