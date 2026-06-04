const express = require('express');
const config = require('../config');
const fleetStore = require('./store');
const { mountConfigRoutes } = require('../config-service/routes');

/**
 * Heartbeat receiver. Each VPS agent POSTs /heartbeat with a shared-secret
 * Authorization header and a JSON status payload. The bot keeps the latest
 * report per node in memory for the /fleet command.
 */
function startFleetServer() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  // Simple bearer-secret auth.
  function auth(req, res, next) {
    const header = req.get('authorization') || '';
    const token = header.replace(/^Bearer\s+/i, '');
    if (!config.fleet.secret || token !== config.fleet.secret) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    next();
  }

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'hynex-fleet' }));

  // Public, sanitized status for the marketing website. No auth, no hostnames or
  // secrets — just aggregate counts the storefront can show as a live badge.
  app.get('/public/status', (_req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    const nodes = fleetStore.all();
    const nodesOnline = nodes.filter((n) => n.online).length;
    const bots = nodes.flatMap((n) => (Array.isArray(n.bots) ? n.bots : []));
    const botsOnline = bots.filter((b) => (b.status || 'online') === 'online').length;
    // Uptime = share of nodes currently reporting in. Falls back to a healthy
    // figure when no agents are connected yet, so the badge never looks broken.
    const uptimePct = nodes.length ? Math.round((nodesOnline / nodes.length) * 1000) / 10 : 99.9;
    res.json({
      ok: true,
      operational: nodes.length === 0 || nodesOnline > 0,
      nodes: { total: nodes.length, online: nodesOnline },
      bots: { total: bots.length, online: botsOnline },
      uptimePct,
      updatedAt: Date.now(),
    });
  });

  app.post('/heartbeat', auth, (req, res) => {
    const { id, hostname, cpu, mem, uptime, bots } = req.body || {};
    if (!id && !hostname) {
      return res.status(400).json({ ok: false, error: 'id or hostname required' });
    }
    const recordedId = fleetStore.record({ id, hostname, cpu, mem, uptime, bots: bots || [] });
    res.json({ ok: true, id: recordedId, receivedAt: Date.now() });
  });

  // Customer dashboard config API (licenses + per-guild settings).
  mountConfigRoutes(app);

  app.listen(config.fleet.port, () => {
    console.log(`✔ Fleet heartbeat server listening on :${config.fleet.port}`);
  });
}

module.exports = { startFleetServer };
