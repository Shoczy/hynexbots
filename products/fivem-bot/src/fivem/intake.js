'use strict';

const http = require('http');
const config = require('../config');
const { fivem } = require('../lib/state');
const { make, COLORS } = require('../lib/embeds');
const store = require('../lib/store');

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

async function postReport({ player, reason, id }) {
  const rp = fivem().reports;
  if (!rp.enabled || !rp.channelId) return false;
  const channel = await client.channels.fetch(rp.channelId).catch(() => null);
  if (!channel || !channel.isTextBased?.()) return false;
  const embed = make({
    title: '🚨 In-game report',
    color: COLORS.warning,
    fields: [
      { name: 'Player', value: String(player || 'Unknown').slice(0, 256), inline: true },
      ...(id ? [{ name: 'Identifier', value: String(id).slice(0, 256), inline: true }] : []),
      { name: 'Reason', value: String(reason || 'No reason given').slice(0, 1024) },
    ],
  });
  await channel.send({ content: rp.pingRoleId ? `<@&${rp.pingRoleId}>` : undefined, embeds: [embed] }).catch(() => {});
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
