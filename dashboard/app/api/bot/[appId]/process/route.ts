import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { configApi } from '@/lib/configApi';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { appId: string } }) {
  const session = getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

  const { status, json } = await configApi.getProcess(params.appId, session.user.id);
  return NextResponse.json(json, { status });
}

export async function POST(req: Request, { params }: { params: { appId: string } }) {
  const session = getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = body.action;
  if (!['restart', 'stop', 'start'].includes(action)) {
    return NextResponse.json({ ok: false, error: 'unknown_action' }, { status: 400 });
  }

  const { status, json } = await configApi.processAction(params.appId, session.user.id, action);
  return NextResponse.json(json, { status });
}
