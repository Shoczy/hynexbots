'use strict';

const config = require('../config');
const store = require('./db');
const { sanitizeSettings, sanitizeGuildSync } = require('./validate');
const { resolveFeatures } = require('./products');
const { EDIT_TABS, ALL_PERMISSIONS } = require('./permissions');
const { rateLimit } = require('./rateLimit');
const { inviteUrl } = require('./invite');
const launcher = require('../launcher/manager');
const orders = require('../tickets/orders');

/** Top-level config sections that differ between two settings objects. */
function changedSections(before, after) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  const changed = [];
  for (const k of keys) {
    if (JSON.stringify(before?.[k]) !== JSON.stringify(after?.[k])) changed.push(k);
  }
  return changed;
}

/**
 * Apply an invited member's edit scope: keep the stored value for any config
 * section they aren't allowed to edit, take the incoming value for the rest.
 * The owner (or a member granted every edit token) can change everything.
 */
function applyEditScope(current, incoming, access) {
  if (access.isOwner) return incoming;
  const out = { ...current };
  for (const section of EDIT_TABS) {
    if (access.permissions.includes(section)) out[section] = incoming[section];
  }
  return out;
}

/** Live process status for a bot, for the dashboard control panel. */
function processStatus(bot) {
  const live = launcher.statusList().find((s) => s.appId === bot.app_id);
  return {
    managed: launcher.isManaged(bot.type), // this type ships a runnable product
    hosted: Boolean(store.getProcess(bot.app_id)), // registered with a token on this host
    running: launcher.isRunning(bot.app_id),
    uptimeMs: live?.uptimeMs ?? 0,
    restarts: live?.restarts ?? 0,
  };
}

/** Pretty metadata for a bot type (falls back to a generic custom look). */
function typeMeta(type) {
  const p = config.catalog.find((c) => c.id === type);
  // The dashboard is a web app — it can't render Discord custom emojis
  // (<:name:id>), so always hand it a plain Unicode `webEmoji`.
  if (p) return { type: p.id, label: p.label, emoji: p.webEmoji || '🤖' };
  return { type: type || 'custom', label: type === 'custom' ? 'Custom Bot' : type, emoji: '🛠️' };
}

function botView(bot, userId) {
  const access = store.memberAccess(userId, bot.app_id);
  return {
    appId: bot.app_id,
    name: bot.name,
    isOwner: access ? access.isOwner : bot.owner_id === userId,
    // The current user's effective permissions on this bot (owner = all).
    permissions: access ? access.permissions : [],
    features: resolveFeatures(bot), // { tabs, modules, commandGroups } — scopes the editor
    inviteUrl: inviteUrl(bot.app_id, bot.type), // one-click "add to server" with the right perms
    ...typeMeta(bot.type),
  };
}

/**
 * Mount the customer-config API onto the existing Express app.
 *   - dashboard realm: server-to-server from Next.js, header `x-api-key`
 *   - bot realm:       a customer's running bot, `Authorization: Bearer <botKey>`
 */
function mountConfigRoutes(app) {
  const dashboardAuth = (req, res, next) => {
    if ((req.get('x-api-key') || '') !== config.api.dashboardKey) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    next();
  };

  const botAuth = (req, res, next) => {
    const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token || token !== config.api.botKey) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    next();
  };

  // Rate limits. Dashboard calls are proxied server-to-server from Next.js, so
  // every request shares the Next host's IP — key by the acting userId instead.
  // Bot-realm calls come straight from each sold bot, so key by appId.
  const userKey = (req) => String(req.body?.userId || req.query.userId || req.ip || 'anon');
  const appKey = (req) => String(req.query.appId || req.body?.appId || req.ip || 'anon');
  const writeLimit = rateLimit({ windowMs: 60_000, max: 60, key: userKey });
  const botLimit = rateLimit({ windowMs: 60_000, max: 120, key: appKey });

  // ── Claim a bot via its backup key ──────────────────
  app.post('/api/bots/redeem', writeLimit, dashboardAuth, (req, res) => {
    const { userId, key } = req.body || {};
    if (!userId || !key) return res.status(400).json({ ok: false, error: 'userId and key are required' });
    const result = store.redeemKey(key, String(userId));
    if (!result.ok) return res.status(400).json(result);
    store.addAudit({ appId: result.bot.app_id, actorId: String(userId), action: 'bot.claim', detail: 'redeemed license key' });
    return res.json({ ok: true, bot: botView(result.bot, String(userId)) });
  });

  // ── Bots visible to a user ──────────────────────────
  app.get('/api/bots/me', dashboardAuth, (req, res) => {
    const userId = String(req.query.userId || '');
    if (!userId) return res.status(400).json({ ok: false, error: 'userId required' });
    const bots = store.listBotsForUser(userId).map((b) => botView(b, userId));
    res.json({ ok: true, bots });
  });

  // ── Billing: a customer's purchase history + licenses ──
  // Orders come from the ticket store (keyed by the buyer's Discord id, which is
  // the same id we log in with). Licenses are the bots they own — metadata only,
  // never the backup key.
  app.get('/api/bots/me/billing', dashboardAuth, (req, res) => {
    const userId = String(req.query.userId || '');
    if (!userId) return res.status(400).json({ ok: false, error: 'userId required' });
    const licenses = store
      .listBotsForUser(userId)
      .filter((b) => b.owner_id === userId)
      .map((b) => ({
        appId: b.app_id,
        name: b.name,
        status: b.status,
        registeredAt: b.created_at,
        claimedAt: b.claimed_at,
        ...typeMeta(b.type),
      }));
    res.json({ ok: true, orders: orders.listForOwner(userId), licenses });
  });

  // ── Get a bot's config ──────────────────────────────
  app.get('/api/bots/:appId/config', dashboardAuth, (req, res) => {
    const userId = String(req.query.userId || '');
    const bot = store.accessibleBot(userId, req.params.appId);
    if (!bot) return res.status(403).json({ ok: false, error: 'no_access' });
    res.json({
      ok: true,
      bot: botView(bot, userId),
      settings: store.getConfig(bot.app_id),
      guild: store.getGuild(bot.app_id), // null until the bot has synced its roles/channels
    });
  });

  // ── Save a bot's config ─────────────────────────────
  app.put('/api/bots/:appId/config', writeLimit, dashboardAuth, (req, res) => {
    const { userId, settings } = req.body || {};
    const access = store.memberAccess(String(userId || ''), req.params.appId);
    if (!access) return res.status(403).json({ ok: false, error: 'no_access' });
    const bot = access.bot;
    // Enforce the product's capability scope: modules/commands outside it are dropped.
    const incoming = sanitizeSettings(settings, resolveFeatures(bot));
    // Then enforce the member's edit scope: sections they can't edit keep their
    // stored value, so a limited member can't change what they weren't granted.
    const before = store.getConfig(bot.app_id);
    const merged = applyEditScope(before, incoming, access);
    const saved = store.setConfig(bot.app_id, merged);
    const changed = changedSections(before, saved);
    if (changed.length) {
      store.addAudit({ appId: bot.app_id, actorId: String(userId), action: 'config.save', detail: `updated: ${changed.join(', ')}` });
    }
    res.json({ ok: true, settings: saved });
  });

  // ── Team management ─────────────────────────────────
  // Any member may view the team; only the owner can change it.

  app.get('/api/bots/:appId/members', dashboardAuth, (req, res) => {
    const userId = String(req.query.userId || '');
    const access = store.memberAccess(userId, req.params.appId);
    if (!access) return res.status(403).json({ ok: false, error: 'no_access' });
    res.json({
      ok: true,
      ownerId: access.bot.owner_id,
      isOwner: access.isOwner,
      members: store.listMembers(access.bot.app_id),
      // Permission tokens the editable for this bot's product, so the UI only
      // offers grants that make sense for the type they bought.
      permissions: ALL_PERMISSIONS,
      tabs: resolveFeatures(access.bot).tabs,
    });
  });

  app.post('/api/bots/:appId/members', writeLimit, dashboardAuth, (req, res) => {
    const { userId, memberId, permissions } = req.body || {};
    const bot = store.getBot(req.params.appId);
    if (!bot || bot.owner_id !== userId) return res.status(403).json({ ok: false, error: 'owner_only' });
    if (!/^\d{5,20}$/.test(String(memberId || ''))) {
      return res.status(400).json({ ok: false, error: 'invalid_member_id' });
    }
    if (String(memberId) === String(bot.owner_id)) {
      return res.status(400).json({ ok: false, error: 'is_owner' });
    }
    const perms = Array.isArray(permissions) ? permissions : [];
    store.addMember(bot.app_id, String(memberId), perms);
    store.addAudit({ appId: bot.app_id, actorId: String(userId), action: 'member.add', detail: `added ${memberId} [${perms.join(', ') || 'view only'}]` });
    res.json({ ok: true, members: store.listMembers(bot.app_id) });
  });

  app.patch('/api/bots/:appId/members/:memberId', writeLimit, dashboardAuth, (req, res) => {
    const { userId, permissions } = req.body || {};
    const bot = store.getBot(req.params.appId);
    if (!bot || bot.owner_id !== userId) return res.status(403).json({ ok: false, error: 'owner_only' });
    const perms = Array.isArray(permissions) ? permissions : [];
    store.setMemberPermissions(bot.app_id, String(req.params.memberId), perms);
    store.addAudit({ appId: bot.app_id, actorId: String(userId), action: 'member.update', detail: `${req.params.memberId} → [${perms.join(', ') || 'view only'}]` });
    res.json({ ok: true, members: store.listMembers(bot.app_id) });
  });

  app.delete('/api/bots/:appId/members/:memberId', writeLimit, dashboardAuth, (req, res) => {
    const userId = String(req.query.userId || '');
    const bot = store.getBot(req.params.appId);
    if (!bot || bot.owner_id !== userId) return res.status(403).json({ ok: false, error: 'owner_only' });
    store.removeMember(bot.app_id, String(req.params.memberId));
    store.addAudit({ appId: bot.app_id, actorId: String(userId), action: 'member.remove', detail: `removed ${req.params.memberId}` });
    res.json({ ok: true, members: store.listMembers(bot.app_id) });
  });

  // ── Audit log (owner only) ──────────────────────────
  app.get('/api/bots/:appId/audit', dashboardAuth, (req, res) => {
    const userId = String(req.query.userId || '');
    const access = store.memberAccess(userId, req.params.appId);
    if (!access) return res.status(403).json({ ok: false, error: 'no_access' });
    if (!access.isOwner) return res.status(403).json({ ok: false, error: 'owner_only' });
    res.json({ ok: true, entries: store.listAudit(access.bot.app_id, 100) });
  });

  // ── License management (owner only) ─────────────────
  app.get('/api/bots/:appId/license', dashboardAuth, (req, res) => {
    const userId = String(req.query.userId || '');
    const access = store.memberAccess(userId, req.params.appId);
    if (!access) return res.status(403).json({ ok: false, error: 'no_access' });
    if (!access.isOwner) return res.status(403).json({ ok: false, error: 'owner_only' });
    const b = access.bot;
    res.json({
      ok: true,
      license: { key: b.license_key, status: b.status, registeredAt: b.created_at, claimedAt: b.claimed_at },
    });
  });

  app.post('/api/bots/:appId/license/regenerate', writeLimit, dashboardAuth, (req, res) => {
    const { userId } = req.body || {};
    const bot = store.getBot(req.params.appId);
    if (!bot || bot.owner_id !== userId) return res.status(403).json({ ok: false, error: 'owner_only' });
    const key = store.regenerateKey(bot.app_id);
    store.addAudit({ appId: bot.app_id, actorId: String(userId), action: 'license.regenerate', detail: 'issued a new backup key' });
    res.json({ ok: true, key });
  });

  app.post('/api/bots/:appId/license/transfer', writeLimit, dashboardAuth, (req, res) => {
    const { userId, newOwnerId } = req.body || {};
    const bot = store.getBot(req.params.appId);
    if (!bot || bot.owner_id !== userId) return res.status(403).json({ ok: false, error: 'owner_only' });
    if (!/^\d{17,20}$/.test(String(newOwnerId || ''))) {
      return res.status(400).json({ ok: false, error: 'invalid_user_id' });
    }
    if (String(newOwnerId) === String(bot.owner_id)) return res.status(400).json({ ok: false, error: 'already_owner' });
    store.transferOwner(bot.app_id, String(newOwnerId));
    store.addAudit({ appId: bot.app_id, actorId: String(userId), action: 'license.transfer', detail: `transferred ownership to ${newOwnerId}` });
    res.json({ ok: true });
  });

  // ── Usage analytics (any member) ────────────────────
  app.get('/api/bots/:appId/stats', dashboardAuth, (req, res) => {
    const userId = String(req.query.userId || '');
    const bot = store.accessibleBot(userId, req.params.appId);
    if (!bot) return res.status(403).json({ ok: false, error: 'no_access' });
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 14, 1), 90);
    const guild = store.getGuild(bot.app_id);
    res.json({
      ok: true,
      usage: store.usageSummary(bot.app_id, days),
      health: store.healthSummary(bot.app_id, days),
      incidents: store.listBotIncidents(bot.app_id, 20),
      guild: guild
        ? { name: guild.guildName, roles: (guild.roles || []).length, channels: (guild.channels || []).length, syncedAt: guild.syncedAt }
        : null,
    });
  });

  // ── Process control (dashboard): status, restart, stop ──
  // Only the owner/invited admins of a bot can see or control its process.
  app.get('/api/bots/:appId/process', dashboardAuth, (req, res) => {
    const userId = String(req.query.userId || '');
    const bot = store.accessibleBot(userId, req.params.appId);
    if (!bot) return res.status(403).json({ ok: false, error: 'no_access' });
    res.json({ ok: true, process: processStatus(bot) });
  });

  // Recent log lines from a hosted bot (owner/admin only).
  app.get('/api/bots/:appId/logs', dashboardAuth, (req, res) => {
    const userId = String(req.query.userId || '');
    const bot = store.accessibleBot(userId, req.params.appId);
    if (!bot) return res.status(403).json({ ok: false, error: 'no_access' });
    res.json({
      ok: true,
      hosted: Boolean(store.getProcess(bot.app_id)),
      running: launcher.isRunning(bot.app_id),
      logs: launcher.getLogs(bot.app_id),
    });
  });

  app.post('/api/bots/:appId/process/:action', writeLimit, dashboardAuth, async (req, res) => {
    const { userId } = req.body || {};
    const access = store.memberAccess(String(userId || ''), req.params.appId);
    if (!access) return res.status(403).json({ ok: false, error: 'no_access' });
    if (!access.isOwner && !access.permissions.includes('process')) {
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }
    const bot = access.bot;
    if (!store.getProcess(bot.app_id)) return res.status(400).json({ ok: false, error: 'not_hosted' });

    const action = req.params.action;
    if (action === 'stop') {
      await launcher.stop(bot.app_id);
      store.setAutostart(bot.app_id, false);
      store.addAudit({ appId: bot.app_id, actorId: String(userId), action: 'process.stop', detail: 'stopped the bot' });
      return res.json({ ok: true, process: processStatus(bot) });
    }
    if (action === 'restart' || action === 'start') {
      const result = await launcher.restart(bot.app_id);
      if (!result.ok) return res.status(400).json({ ok: false, error: result.reason });
      store.addAudit({ appId: bot.app_id, actorId: String(userId), action: `process.${action}`, detail: `${action}ed the bot` });
      return res.json({ ok: true, process: processStatus(bot) });
    }
    return res.status(400).json({ ok: false, error: 'unknown_action' });
  });

  // ── A customer's running bot fetches its own config ──
  // The bot passes its own application id (client.application.id).
  app.get('/api/bot/config', botLimit, botAuth, (req, res) => {
    const appId = String(req.query.appId || '');
    if (!appId) return res.status(400).json({ ok: false, error: 'appId required' });
    if (!store.getBot(appId)) return res.status(404).json({ ok: false, error: 'unknown_bot' });
    // The bot polls this on an interval, so it doubles as an uptime heartbeat.
    store.recordHeartbeat(appId);
    res.json({ ok: true, settings: store.getConfig(appId) });
  });

  // ── A customer's running bot reports command usage ──
  app.post('/api/bot/usage', botLimit, botAuth, (req, res) => {
    const appId = String(req.body?.appId || '');
    const commands = req.body?.commands;
    if (!appId) return res.status(400).json({ ok: false, error: 'appId required' });
    if (!store.getBot(appId)) return res.status(404).json({ ok: false, error: 'unknown_bot' });
    store.recordHeartbeat(appId);
    if (commands && typeof commands === 'object') {
      for (const [name, count] of Object.entries(commands)) {
        const n = parseInt(count, 10);
        if (name && Number.isFinite(n) && n > 0) store.recordUsage(appId, name, n);
      }
    }
    res.json({ ok: true });
  });

  // ── A customer's running bot reports its guild roles & channels ──
  // Powers real pick-lists in the dashboard (instead of pasting IDs).
  app.post('/api/bot/sync', botLimit, botAuth, (req, res) => {
    const appId = String(req.body?.appId || '');
    if (!appId) return res.status(400).json({ ok: false, error: 'appId required' });
    if (!store.getBot(appId)) return res.status(404).json({ ok: false, error: 'unknown_bot' });
    store.recordHeartbeat(appId);
    store.setGuild(appId, sanitizeGuildSync(req.body));
    res.json({ ok: true });
  });
}

module.exports = { mountConfigRoutes };
