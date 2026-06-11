'use strict';

const { fivem } = require('../lib/state');
const { queryServer } = require('../lib/fivem');
const store = require('../lib/store');

/**
 * Playtime tracker: every minute, poll the player list and credit each online
 * player a minute of playtime, keyed by their most stable in-game identifier.
 * Powers /playtime and /playtime-top.
 */
const INTERVAL_SEC = 60;
let timer = null;

// Prefer a persistent identifier over a volatile one (names/ips change).
const ID_PRIORITY = ['license2:', 'license:', 'fivem:', 'discord:', 'steam:', 'xbl:', 'live:'];

function pickIdentifier(identifiers, name) {
  if (Array.isArray(identifiers)) {
    for (const pref of ID_PRIORITY) {
      const hit = identifiers.find((i) => String(i).toLowerCase().startsWith(pref));
      if (hit) return String(hit).toLowerCase();
    }
    if (identifiers.length) return String(identifiers[0]).toLowerCase();
  }
  // No identifiers exposed by the server → fall back to the (less reliable) name.
  return name ? `name:${String(name).toLowerCase()}` : null;
}

async function tick() {
  if (!fivem().playtime?.enabled || !fivem().server.host) return;
  const snap = await queryServer(fivem().server.host);
  if (!snap.online || !Array.isArray(snap.list)) return;
  for (const p of snap.list) {
    const id = pickIdentifier(p.identifiers, p.name);
    if (id) store.addPlaytime(id, p.name, INTERVAL_SEC);
  }
}

function start() {
  timer = setInterval(() => tick().catch(() => {}), INTERVAL_SEC * 1000);
  if (timer.unref) timer.unref();
}

module.exports = { start, tick };
