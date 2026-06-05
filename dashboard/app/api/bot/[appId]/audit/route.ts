import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { configApi } from '@/lib/configApi';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { appId: string } }) {
  const session = getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

  const { status, json } = await configApi.getAudit(params.appId, session.user.id);
  return NextResponse.json(json, { status });
}
