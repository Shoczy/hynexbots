import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { configApi } from '@/lib/configApi';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { appId: string } }) {
  const session = getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

  const { status, json } = await configApi.listMembers(params.appId, session.user.id);
  return NextResponse.json(json, { status });
}

export async function POST(req: Request, { params }: { params: { appId: string } }) {
  const session = getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const memberId = String(body.memberId || '');
  const permissions = Array.isArray(body.permissions) ? body.permissions : [];
  const { status, json } = await configApi.addMember(params.appId, session.user.id, memberId, permissions);
  return NextResponse.json(json, { status });
}

export async function PATCH(req: Request, { params }: { params: { appId: string } }) {
  const session = getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const memberId = String(body.memberId || '');
  const permissions = Array.isArray(body.permissions) ? body.permissions : [];
  const { status, json } = await configApi.setMemberPermissions(params.appId, session.user.id, memberId, permissions);
  return NextResponse.json(json, { status });
}

export async function DELETE(req: Request, { params }: { params: { appId: string } }) {
  const session = getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const memberId = String(body.memberId || '');
  const { status, json } = await configApi.removeMember(params.appId, session.user.id, memberId);
  return NextResponse.json(json, { status });
}
