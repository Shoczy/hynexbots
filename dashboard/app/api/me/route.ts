import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { configApi } from '@/lib/configApi';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

  const { json } = await configApi.myBots(session.user.id);
  // `serviceUp` lets the UI distinguish "no bots yet" from "backend unreachable".
  const serviceUp = json?.error !== 'service_unavailable';
  return NextResponse.json({ ok: true, user: session.user, bots: json?.bots || [], serviceUp });
}
