// Server-side client for the bot's config service. Uses the shared API key.
const BASE = (process.env.CONFIG_API_URL || 'http://localhost:8787').replace(/\/$/, '');
const KEY = process.env.DASHBOARD_API_KEY || '';

async function call(path: string, init: RequestInit = {}) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', 'x-api-key': KEY, ...(init.headers || {}) },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => ({ ok: false, error: 'bad_response' }));
    return { status: res.status, json };
  } catch {
    // Config service unreachable (down / wrong CONFIG_API_URL). Return a clean
    // JSON envelope so dashboard routes never crash on a backend hiccup.
    return { status: 503, json: { ok: false, error: 'service_unavailable' } };
  }
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
  billing(userId: string) {
    return call(`/api/bots/me/billing?userId=${encodeURIComponent(userId)}`);
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
  getStats(appId: string, userId: string, days = 14) {
    return call(`/api/bots/${encodeURIComponent(appId)}/stats?userId=${encodeURIComponent(userId)}&days=${days}`);
  },
  getLicense(appId: string, userId: string) {
    return call(`/api/bots/${encodeURIComponent(appId)}/license?userId=${encodeURIComponent(userId)}`);
  },
  regenerateKey(appId: string, userId: string) {
    return call(`/api/bots/${encodeURIComponent(appId)}/license/regenerate`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },
  transferBot(appId: string, userId: string, newOwnerId: string) {
    return call(`/api/bots/${encodeURIComponent(appId)}/license/transfer`, {
      method: 'POST',
      body: JSON.stringify({ userId, newOwnerId }),
    });
  },
};

export type LicenseInfo = {
  key: string | null;
  status: string;
  registeredAt: number;
  claimedAt: number | null;
};

export type UsageStats = {
  days: number;
  total: number;
  totalToday: number;
  perCommand: { command: string; count: number }[];
  byDay: { day: string; count: number }[];
};

export type HealthStats = {
  days: number;
  uptimePct: number | null;
  lastSeen: number | null;
  byDay: { day: string; pct: number | null }[];
};

export type BotIncident = {
  startedAt: number;
  resolvedAt: number | null;
  ongoing: boolean;
  durationMs: number;
};

export type Order = {
  id: string;
  productLabel: string;
  botName: string | null;
  price: string | null;
  payment: string | null;
  status: 'pending' | 'paid' | 'delivered' | 'cancelled';
  createdAt: number;
  updatedAt: number;
};

export type License = {
  appId: string;
  name: string;
  type: string;
  label: string;
  emoji: string;
  status: string;
  registeredAt: number;
  claimedAt: number | null;
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
