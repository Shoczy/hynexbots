import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { configApi } from '@/lib/configApi';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { appId: string } }) {
  const session = getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === 'string' ? body.action : '';
  if (!action) return NextResponse.json({ ok: false, error: 'action required' }, { status: 400 });

  const { status, json } = await configApi.dispatch(params.appId, session.user.id, action, body.payload);
  return NextResponse.json(json, { status });
}
