// Discord OAuth2 + API helpers (server-side only).

const API = 'https://discord.com/api/v10';

export const env = {
  clientId: process.env.DISCORD_CLIENT_ID || '',
  clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
  // Single-origin: the callback lives under the site's /dashboard base path.
  // Register this exact URL in the Discord Developer Portal → OAuth2 → Redirects.
  redirectUri: process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/dashboard/api/auth/callback',
};

export type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar: string | null;
};

export function authorizeUrl(state: string): string {
  // Only `identify` is needed — access is granted per-bot (by Application ID),
  // not by server membership, so we don't request the `guilds` scope.
  const params = new URLSearchParams({
    client_id: env.clientId,
    redirect_uri: env.redirectUri,
    response_type: 'code',
    scope: 'identify',
    state,
    prompt: 'consent',
  });
  return `${API}/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCode(code: string): Promise<string> {
  const body = new URLSearchParams({
    client_id: env.clientId,
    client_secret: env.clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: env.redirectUri,
  });
  const res = await fetch(`${API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);
  const json = await res.json();
  return json.access_token as string;
}

export async function fetchUser(token: string): Promise<DiscordUser> {
  const res = await fetch(`${API}/users/@me`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`fetch user failed: ${res.status}`);
  return res.json();
}

export function avatarUrl(user: DiscordUser): string {
  if (user.avatar) return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`;
  return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(user.id) >> 22n) % 6}.png`;
}
