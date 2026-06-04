import { cookies } from 'next/headers';
import crypto from 'crypto';
import type { DiscordUser } from './discord';

/**
 * Server-side session store. Keyed by a random session id kept in an httpOnly
 * cookie. In-memory for the MVP — simple and avoids putting Discord tokens in
 * the browser. For multi-instance production, swap this Map for Redis.
 */
export type Session = {
  user: Pick<DiscordUser, 'id' | 'username' | 'global_name' | 'avatar'>;
  createdAt: number;
};

const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const COOKIE = 'hx_sid';

// Survive Next.js dev hot-reloads by stashing the store on globalThis.
const g = globalThis as unknown as { __hxSessions?: Map<string, Session> };
const sessions = g.__hxSessions ?? (g.__hxSessions = new Map<string, Session>());

function prune() {
  const now = Date.now();
  for (const [id, s] of sessions) if (now - s.createdAt > TTL_MS) sessions.delete(id);
}

export function createSession(user: Session['user']) {
  prune();
  const sid = crypto.randomBytes(24).toString('hex');
  sessions.set(sid, { user, createdAt: Date.now() });
  cookies().set(COOKIE, sid, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: TTL_MS / 1000,
  });
  return sid;
}

export function getSession(): Session | null {
  const sid = cookies().get(COOKIE)?.value;
  if (!sid) return null;
  const s = sessions.get(sid);
  if (!s) return null;
  if (Date.now() - s.createdAt > TTL_MS) {
    sessions.delete(sid);
    return null;
  }
  return s;
}

export function destroySession() {
  const sid = cookies().get(COOKIE)?.value;
  if (sid) sessions.delete(sid);
  cookies().delete(COOKIE);
}
