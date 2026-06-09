import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/session';
import { withBase } from '@/lib/paths';

export const dynamic = 'force-dynamic';

export async function GET() {
  destroySession();
  // Relative redirect (resolved against the public origin) back to the login page.
  return new NextResponse(null, { status: 302, headers: { Location: withBase('/') } });
}
