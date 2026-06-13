'use strict';

const http = require('http');
const config = require('../config');
const { fivem } = require('../lib/state');
const { v2, COLORS } = require('../lib/embeds');
const store = require('../lib/store');
const chatBridge = require('./chatBridge');
const admin = require('./admin');

/**
 * Optional HTTP intake the customer's FiveM server talks to. Two endpoints,
 * both guarded by the shared FIVEM_INGRESS_SECRET:
 *   POST /report            { player, reason, id? }  → forwards to the reports channel
 *   GET  /whitelist/check?identifier=...             → { allowed: bool }
 * Disabled entirely when no port is configured (status / whitelist mgmt /
 * restart announcements don't need it).
 */
let client = null;
let server = null;

function authed(req, url) {
  const header = (req.headers['x-secret'] || '').toString();
  const q = url.searchParams.get('secret') || '';
  const got = header || q;
  return config.ingress.secret && got === config.ingress.secret;
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 64 * 1024) req.destroy(); // cap payloads
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

const json = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
};

/** In-game chat → Discord bridge channel (no pings). */
async function postChat({ player, message }) {
  if (!chatBridge.enabled()) return false;
  const channel = await client.channels.fetch(chatBridge.channelId()).catch(() => null);
  if (!channel || !channel.isTextBased?.()) return false;
  const name = String(player || 'Player').slice(0, 80);
  const text = String(message || '').slice(0, 300);
  if (!text) return false;
  await channel
    .send({ content: `**${name}:** ${text}`, allowedMentions: { parse: [] } })
    .catch(() => {});
  return true;
}

async function postReport({ player, reason, id }) {
  const rp = fivem().reports;
  if (!rp.enabled || !rp.channelId) return false;
  const channel = await client.channels.fetch(rp.channelId).catch(() => null);
  if (!channel || !channel.isTextBased?.()) return false;
  const items = [];
  if (rp.pingRoleId) items.push(`<@&${rp.pingRoleId}>`);
  items.push('## 🚨 In-game report');
  items.push(`**Player:** ${String(player || 'Unknown').slice(0, 256)}`);
  if (id) items.push(`**Identifier:** ${String(id).slice(0, 256)}`);
  items.push(`**Reason:** ${String(reason || 'No reason given').slice(0, 1024)}`);
  await channel.send(v2(items, COLORS.warning)).catch(() => {});
  return true;
}

function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { ok: true });

  if (!authed(req, url)) return json(res, 401, { ok: false, error: 'unauthorized' });

  if (req.method === 'GET' && url.pathname === '/whitelist/check') {
    if (!fivem().whitelist.enabled) return json(res, 200, { ok: true, allowed: false, reason: 'disabled' });
    const identifier = url.searchParams.get('identifier') || url.searchParams.get('id') || '';
    return json(res, 200, { ok: true, allowed: store.isIdentifierWhitelisted(identifier) });
  }

  if (req.method === 'POST' && url.pathname === '/report') {
    return readBody(req).then((body) => {
      postReport(body).catch(() => {});
      return json(res, 200, { ok: true });
    });
  }

  // In-game chat → Discord.
  if (req.method === 'POST' && url.pathname === '/chat') {
    return readBody(req).then((body) => {
      postChat(body).catch(() => {});
      return json(res, 200, { ok: true });
    });
  }

  // Discord → in-game: the resource polls this for new messages by timestamp.
  if (req.method === 'GET' && url.pathname === '/chat/pending') {
    if (!chatBridge.enabled()) return json(res, 200, { ok: true, messages: [] });
    const since = url.searchParams.get('since') || 0;
    return json(res, 200, { ok: true, now: Date.now(), messages: chatBridge.pending(since) });
  }

  // Admin actions: the resource drains pending kicks/bans to execute in-game.
  if (req.method === 'GET' && url.pathname === '/admin/pending') {
    if (!fivem().admin?.enabled) return json(res, 200, { ok: true, actions: [] });
    return json(res, 200, { ok: true, actions: admin.drainPending() });
  }

  // Connect-time ban check (by any of the player's identifiers).
  if (req.method === 'GET' && url.pathname === '/admin/banned') {
    const identifier = url.searchParams.get('identifier') || '';
    const hit = store.isBanned(identifier);
    return json(res, 200, { ok: true, banned: Boolean(hit), reason: hit?.reason || '' });
  }

  // The resource reports identifiers of a player it just banned, so the bot
  // persists the ban and enforces it on future connects.
  if (req.method === 'POST' && url.pathname === '/admin/banned') {
    return readBody(req).then((body) => {
      const ids = Array.isArray(body.identifiers) ? body.identifiers : [];
      for (const id of ids) store.addBan(id, { reason: body.reason, bannedBy: body.by, name: body.name });
      return json(res, 200, { ok: true, stored: ids.length });
    });
  }

  // Queue priority: a queue script asks how much priority an identifier gets,
  // based on the linked member's Discord roles → the highest matching tier.
  if (req.method === 'GET' && url.pathname === '/priority') {
    return (async () => {
      const p = fivem().priority;
      if (!p?.enabled) return json(res, 200, { ok: true, priority: 0 });
      const userId = store.userIdForIdentifier(url.searchParams.get('identifier') || '');
      if (!userId) return json(res, 200, { ok: true, priority: 0 });
      let best = 0;
      for (const guild of client.guilds.cache.values()) {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) continue;
        for (const t of p.tiers || []) {
          if (t.roleId && member.roles.cache.has(t.roleId)) best = Math.max(best, t.priority || 0);
        }
      }
      return json(res, 200, { ok: true, priority: best });
    })();
  }

  return json(res, 404, { ok: false, error: 'not_found' });
}

function start(c) {
  client = c;
  if (!config.ingress.port) return; // intake disabled
  if (!config.ingress.secret) {
    console.warn('⚠ FIVEM_INGRESS_PORT is set but FIVEM_INGRESS_SECRET is empty — refusing to start the intake server.');
    return;
  }
  server = http.createServer((req, res) => {
    try {
      handle(req, res);
    } catch {
      json(res, 500, { ok: false });
    }
  });
  server.listen(config.ingress.port, () => {
    console.log(`✔ FiveM intake listening on :${config.ingress.port} (reports + whitelist check).`);
  });
  server.on('error', (e) => console.error('✖ FiveM intake failed:', e.message));
}

module.exports = { start };
