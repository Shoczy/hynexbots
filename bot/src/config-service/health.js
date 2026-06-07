'use strict';

/**
 * Customer-bot health monitor. Bots phone home on a poll interval (config fetch,
 * usage, guild sync) which records a heartbeat; this watcher periodically checks
 * each active bot's last-seen time and, on an online↔offline change, logs an
 * incident and notifies subscribers (used for owner DMs / staff alerts).
 *
 * Edge detection mirrors the fleet store: the first observation of a bot only
 * establishes a baseline, so restarting the host never produces a burst of
 * spurious "offline" alerts for bots that were already down.
 */
const store = require('./db');

const OFFLINE_AFTER_MIN = parseInt(process.env.BOT_OFFLINE_AFTER_MIN || '10', 10);
const THRESHOLD_MS = OFFLINE_AFTER_MIN * 60 * 1000;

const state = new Map(); // appId -> last known online bool
const listeners = new Set();

/** Subscribe to { appId, online, at } transitions. Returns an unsubscribe fn. */
function onTransition(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Re-check every active bot once and emit/log any state changes. */
function evaluate() {
  const now = Date.now();
  for (const { appId, lastSeen } of store.listActiveBotsHealth()) {
    if (!lastSeen) continue; // never connected → nothing to baseline against
    const online = now - lastSeen <= THRESHOLD_MS;
    const prev = state.get(appId);
    if (prev === online) continue;
    state.set(appId, online);
    if (prev === undefined) continue; // first sighting: baseline only
    if (online) store.resolveBotIncident(appId, now);
    else store.openBotIncident(appId, now);
    for (const fn of listeners) {
      try {
        fn({ appId, online, at: now });
      } catch (err) {
        console.error('health listener error:', err?.message || err);
      }
    }
  }
}

/** Start the monitor loop. Returns the interval handle. */
function start(intervalMs = 60_000) {
  evaluate(); // establish baselines immediately
  const t = setInterval(evaluate, intervalMs);
  if (t.unref) t.unref();
  return t;
}

module.exports = { start, evaluate, onTransition, OFFLINE_AFTER_MIN };
