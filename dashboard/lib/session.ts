import { cookies } from 'next/headers';
import crypto from 'crypto';
import type { DiscordUser } from './discord';

/**
 * Stateless session, carried entirely in an httpOnly cookie. The session
 * payload (just the public Discord profile — no OAuth tokens) is encrypted and
 * authenticated with AES-256-GCM, keyed from SESSION_SECRET. Because nothing is
 * kept server-side, sessions survive restarts and work across multiple
 * instances (e.g. Vercel) with no shared store.
 */
export type Session = {
  user: Pick<DiscordUser, 'id' | 'username' | 'global_name' | 'avatar'>;
  createdAt: number;
};

const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const COOKIE = 'hx_sid';

// Derive a stable 32-byte key from the secret. In production a real secret is
// required; in dev we fall back to a fixed dev key so login still works locally.
function sessionKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET must be set in production');
    }
    return crypto.scryptSync('hynex-dev-session-secret', 'hynex-session', 32);
  }
  return crypto.scryptSync(secret, 'hynex-session', 32);
}

function seal(payload: Session): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', sessionKey(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // iv.tag.ciphertext, all base64url — compact and cookie-safe.
  return [iv, tag, data].map((b) => b.toString('base64url')).join('.');
}

function unseal(value: string): Session | null {
  const parts = value.split('.');
  if (parts.length !== 3) return null;
  try {
    const [iv, tag, data] = parts.map((p) => Buffer.from(p, 'base64url'));
    const decipher = crypto.createDecipheriv('aes-256-gcm', sessionKey(), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    const session = JSON.parse(json) as Session;
    if (!session?.user?.id || typeof session.createdAt !== 'number') return null;
    return session;
  } catch {
    // Tampered, truncated, or sealed with a different key/secret.
    return null;
  }
}

export function createSession(user: Session['user']) {
  const session: Session = { user, createdAt: Date.now() };
  cookies().set(COOKIE, seal(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: TTL_MS / 1000,
  });
}

export function getSession(): Session | null {
  const value = cookies().get(COOKIE)?.value;
  if (!value) return null;
  const session = unseal(value);
  if (!session) return null;
  if (Date.now() - session.createdAt > TTL_MS) return null;
  return session;
}

export function destroySession() {
  cookies().delete(COOKIE);
}
