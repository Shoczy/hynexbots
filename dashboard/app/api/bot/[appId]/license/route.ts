import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { configApi } from '@/lib/configApi';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { appId: string } }) {
  const session = getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

  const { status, json } = await configApi.getLicense(params.appId, session.user.id);
  return NextResponse.json(json, { status });
}

export async function POST(req: Request, { params }: { params: { appId: string } }) {
  const session = getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (body.action === 'regenerate') {
    const { status, json } = await configApi.regenerateKey(params.appId, session.user.id);
    return NextResponse.json(json, { status });
  }
  if (body.action === 'transfer') {
    const newOwnerId = String(body.newOwnerId || '').trim();
    if (!/^\d{17,20}$/.test(newOwnerId)) {
      return NextResponse.json({ ok: false, error: 'invalid_user_id' }, { status: 400 });
    }
    const { status, json } = await configApi.transferBot(params.appId, session.user.id, newOwnerId);
    return NextResponse.json(json, { status });
  }
  return NextResponse.json({ ok: false, error: 'unknown_action' }, { status: 400 });
}
