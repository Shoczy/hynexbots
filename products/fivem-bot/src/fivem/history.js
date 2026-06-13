'use strict';

const { fivem } = require('../lib/state');
const { queryServer } = require('../lib/fivem');
const store = require('../lib/store');

/**
 * Record the live player count every 5 minutes so /serverstats can show peaks
 * and a 24h trend. Only online samples are stored (gaps = downtime).
 */
const INTERVAL_MS = 5 * 60_000;
let timer = null;

async function sample() {
  if (!fivem().stats?.enabled || !fivem().server.host) return;
  const snap = await queryServer(fivem().server.host);
  if (!snap.online) return;
  store.addSample(snap.players || 0, snap.maxPlayers || 0);
}

function start() {
  sample().catch(() => {});
  timer = setInterval(() => sample().catch(() => {}), INTERVAL_MS);
  if (timer.unref) timer.unref();
}

module.exports = { start, sample };
