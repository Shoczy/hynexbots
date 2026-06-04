const config = require('../config');

/**
 * In-memory registry of VPS heartbeats. Keyed by VPS id.
 * Survives as long as the bot runs; agents re-register on their next beat,
 * so a bot restart self-heals within one heartbeat interval.
 */
const nodes = new Map();

function record(report) {
  const id = report.id || report.hostname || 'unknown';
  nodes.set(id, { ...report, id, lastSeen: Date.now() });
  return id;
}

function isOnline(node) {
  const ageMs = Date.now() - node.lastSeen;
  return ageMs <= config.fleet.offlineAfterMin * 60 * 1000;
}

function all() {
  return [...nodes.values()].map((n) => ({ ...n, online: isOnline(n) }));
}

module.exports = { record, all, isOnline };
