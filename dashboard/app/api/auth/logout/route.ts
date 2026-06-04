import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  destroySession();
  return NextResponse.redirect(new URL('/', req.url));
}
