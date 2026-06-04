import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { configApi } from '@/lib/configApi';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

  const { json } = await configApi.myBots(session.user.id);
  return NextResponse.json({ ok: true, user: session.user, bots: json.bots || [] });
}
