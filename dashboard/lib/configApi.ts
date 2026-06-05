// Server-side client for the bot's config service. Uses the shared API key.
const BASE = (process.env.CONFIG_API_URL || 'http://localhost:8787').replace(/\/$/, '');
const KEY = process.env.DASHBOARD_API_KEY || '';

async function call(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'x-api-key': KEY, ...(init.headers || {}) },
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({ ok: false, error: 'bad_response' }));
  return { status: res.status, json };
}

export type BotSummary = {
  appId: string;
  name: string;
  type: string;
  label: string;
  emoji: string;
  isOwner: boolean;
};

// The full Settings type lives in lib/settings.ts (shared with the editor UI).

export const configApi = {
  redeem(userId: string, key: string) {
    return call('/api/bots/redeem', { method: 'POST', body: JSON.stringify({ userId, key }) });
  },
  myBots(userId: string) {
    return call(`/api/bots/me?userId=${encodeURIComponent(userId)}`);
  },
  getConfig(appId: string, userId: string) {
    return call(`/api/bots/${encodeURIComponent(appId)}/config?userId=${encodeURIComponent(userId)}`);
  },
  saveConfig(appId: string, userId: string, settings: unknown) {
    return call(`/api/bots/${encodeURIComponent(appId)}/config`, {
      method: 'PUT',
      body: JSON.stringify({ userId, settings }),
    });
  },
  getProcess(appId: string, userId: string) {
    return call(`/api/bots/${encodeURIComponent(appId)}/process?userId=${encodeURIComponent(userId)}`);
  },
  getLogs(appId: string, userId: string) {
    return call(`/api/bots/${encodeURIComponent(appId)}/logs?userId=${encodeURIComponent(userId)}`);
  },
  processAction(appId: string, userId: string, action: 'restart' | 'stop' | 'start') {
    return call(`/api/bots/${encodeURIComponent(appId)}/process/${action}`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },
  listMembers(appId: string, userId: string) {
    return call(`/api/bots/${encodeURIComponent(appId)}/members?userId=${encodeURIComponent(userId)}`);
  },
  addMember(appId: string, userId: string, memberId: string, permissions: string[]) {
    return call(`/api/bots/${encodeURIComponent(appId)}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, memberId, permissions }),
    });
  },
  setMemberPermissions(appId: string, userId: string, memberId: string, permissions: string[]) {
    return call(`/api/bots/${encodeURIComponent(appId)}/members/${encodeURIComponent(memberId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ userId, permissions }),
    });
  },
  removeMember(appId: string, userId: string, memberId: string) {
    return call(
      `/api/bots/${encodeURIComponent(appId)}/members/${encodeURIComponent(memberId)}?userId=${encodeURIComponent(userId)}`,
      { method: 'DELETE' },
    );
  },
  getAudit(appId: string, userId: string) {
    return call(`/api/bots/${encodeURIComponent(appId)}/audit?userId=${encodeURIComponent(userId)}`);
  },
};

export type AuditEntry = {
  actorId: string;
  action: string;
  detail: string;
  at: number;
};

export type TeamMember = {
  userId: string;
  role: string;
  permissions: string[];
  addedAt: number;
};

export type ProcessStatus = {
  managed: boolean;
  hosted: boolean;
  running: boolean;
  uptimeMs: number;
  restarts: number;
};
