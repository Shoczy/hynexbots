'use strict';

const config = require('../config');
const store = require('./db');
const { sanitizeSettings, sanitizeGuildSync } = require('./validate');
const { resolveFeatures } = require('./products');
const launcher = require('../launcher/manager');

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
  if (p) return { type: p.id, label: p.label, emoji: p.emoji };
  return { type: type || 'custom', label: type === 'custom' ? 'Custom Bot' : type, emoji: '🛠️' };
}

function botView(bot, userId) {
  return {
    appId: bot.app_id,
    name: bot.name,
    isOwner: bot.owner_id === userId,
    features: resolveFeatures(bot), // { tabs, modules, commandGroups } — scopes the editor
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

  // ── Claim a bot via its backup key ──────────────────
  app.post('/api/bots/redeem', dashboardAuth, (req, res) => {
    const { userId, key } = req.body || {};
    if (!userId || !key) return res.status(400).json({ ok: false, error: 'userId and key are required' });
    const result = store.redeemKey(key, String(userId));
    if (!result.ok) return res.status(400).json(result);
    return res.json({ ok: true, bot: botView(result.bot, String(userId)) });
  });

  // ── Bots visible to a user ──────────────────────────
  app.get('/api/bots/me', dashboardAuth, (req, res) => {
    const userId = String(req.query.userId || '');
    if (!userId) return res.status(400).json({ ok: false, error: 'userId required' });
    const bots = store.listBotsForUser(userId).map((b) => botView(b, userId));
    res.json({ ok: true, bots });
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
  app.put('/api/bots/:appId/config', dashboardAuth, (req, res) => {
    const { userId, settings } = req.body || {};
    const bot = store.accessibleBot(String(userId || ''), req.params.appId);
    if (!bot) return res.status(403).json({ ok: false, error: 'no_access' });
    // Enforce the product's capability scope: modules/commands outside it are dropped.
    const saved = store.setConfig(bot.app_id, sanitizeSettings(settings, resolveFeatures(bot)));
    res.json({ ok: true, settings: saved });
  });

  // ── Manage invited admins (owner only) ──────────────
  app.post('/api/bots/:appId/members', dashboardAuth, (req, res) => {
    const { userId, memberId } = req.body || {};
    const bot = store.getBot(req.params.appId);
    if (!bot || bot.owner_id !== userId) return res.status(403).json({ ok: false, error: 'owner_only' });
    if (!/^\d{5,20}$/.test(String(memberId || ''))) {
      return res.status(400).json({ ok: false, error: 'invalid_member_id' });
    }
    store.addMember(bot.app_id, String(memberId));
    res.json({ ok: true, members: store.listMembers(bot.app_id) });
  });

  app.delete('/api/bots/:appId/members/:memberId', dashboardAuth, (req, res) => {
    const userId = String(req.query.userId || '');
    const bot = store.getBot(req.params.appId);
    if (!bot || bot.owner_id !== userId) return res.status(403).json({ ok: false, error: 'owner_only' });
    store.removeMember(bot.app_id, String(req.params.memberId));
    res.json({ ok: true, members: store.listMembers(bot.app_id) });
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

  app.post('/api/bots/:appId/process/:action', dashboardAuth, async (req, res) => {
    const { userId } = req.body || {};
    const bot = store.accessibleBot(String(userId || ''), req.params.appId);
    if (!bot) return res.status(403).json({ ok: false, error: 'no_access' });
    if (!store.getProcess(bot.app_id)) return res.status(400).json({ ok: false, error: 'not_hosted' });

    const action = req.params.action;
    if (action === 'stop') {
      await launcher.stop(bot.app_id);
      store.setAutostart(bot.app_id, false);
      return res.json({ ok: true, process: processStatus(bot) });
    }
    if (action === 'restart' || action === 'start') {
      const result = await launcher.restart(bot.app_id);
      if (!result.ok) return res.status(400).json({ ok: false, error: result.reason });
      return res.json({ ok: true, process: processStatus(bot) });
    }
    return res.status(400).json({ ok: false, error: 'unknown_action' });
  });

  // ── A customer's running bot fetches its own config ──
  // The bot passes its own application id (client.application.id).
  app.get('/api/bot/config', botAuth, (req, res) => {
    const appId = String(req.query.appId || '');
    if (!appId) return res.status(400).json({ ok: false, error: 'appId required' });
    if (!store.getBot(appId)) return res.status(404).json({ ok: false, error: 'unknown_bot' });
    res.json({ ok: true, settings: store.getConfig(appId) });
  });

  // ── A customer's running bot reports its guild roles & channels ──
  // Powers real pick-lists in the dashboard (instead of pasting IDs).
  app.post('/api/bot/sync', botAuth, (req, res) => {
    const appId = String(req.body?.appId || '');
    if (!appId) return res.status(400).json({ ok: false, error: 'appId required' });
    if (!store.getBot(appId)) return res.status(404).json({ ok: false, error: 'unknown_bot' });
    store.setGuild(appId, sanitizeGuildSync(req.body));
    res.json({ ok: true });
  });
}

module.exports = { mountConfigRoutes };
