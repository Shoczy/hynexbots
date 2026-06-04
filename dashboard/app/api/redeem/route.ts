import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { configApi } from '@/lib/configApi';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

  const { key } = await req.json().catch(() => ({}));
  if (!key) return NextResponse.json({ ok: false, error: 'A license key is required' }, { status: 400 });

  const { status, json } = await configApi.redeem(session.user.id, String(key).trim());
  return NextResponse.json(json, { status });
}
