import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { configApi } from '@/lib/configApi';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { appId: string } }) {
  const session = getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

  const days = Number(new URL(req.url).searchParams.get('days')) || 14;
  const { status, json } = await configApi.getStats(params.appId, session.user.id, days);
  return NextResponse.json(json, { status });
}
