const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * In-memory registry of VPS heartbeats. Keyed by VPS id.
 * Survives as long as the bot runs; agents re-register on their next beat,
 * so a bot restart self-heals within one heartbeat interval.
 */
const nodes = new Map();

// Incident history: every time a node flips online↔offline we log it, so the
// public status page can show "what happened when", not just the live snapshot.
// Persisted to a small JSON file so the history outlives a bot restart.
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const INCIDENTS_FILE = process.env.HYNEX_INCIDENTS_PATH || path.join(DATA_DIR, 'incidents.json');
const MAX_INCIDENTS = 200;

const nodeOnline = new Map(); // id -> last known online state (for edge detection)
const transitionListeners = new Set(); // ({ node, online, at }) => void
let incidents = loadIncidents();

/** Subscribe to node online↔offline transitions. Returns an unsubscribe fn. */
function onTransition(fn) {
  transitionListeners.add(fn);
  return () => transitionListeners.delete(fn);
}

function loadIncidents() {
  try {
    const arr = JSON.parse(fs.readFileSync(INCIDENTS_FILE, 'utf8'));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveIncidents() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(INCIDENTS_FILE, JSON.stringify(incidents));
  } catch {
    /* best-effort: a status-page nicety shouldn't crash the heartbeat server */
  }
}

function openIncident(node, at) {
  if (incidents.some((i) => i.node === node && i.resolvedAt == null)) return; // already open
  incidents.unshift({ id: `${node}-${at}`, node, startedAt: at, resolvedAt: null });
  if (incidents.length > MAX_INCIDENTS) incidents.length = MAX_INCIDENTS;
  saveIncidents();
}

function resolveIncident(node, at) {
  const open = incidents.find((i) => i.node === node && i.resolvedAt == null);
  if (open) {
    open.resolvedAt = at;
    saveIncidents();
  }
}

/** Edge-detect a node's online state and log incidents on transitions. */
function transition(id, online, at) {
  const prev = nodeOnline.get(id);
  if (prev === online) return;
  nodeOnline.set(id, online);
  if (prev === undefined) return; // first sighting: set a baseline, don't log
  if (online) resolveIncident(id, at);
  else openIncident(id, at);
  for (const fn of transitionListeners) {
    try {
      fn({ node: id, online, at });
    } catch (err) {
      console.error('fleet transition listener error:', err?.message || err);
    }
  }
}

function record(report) {
  const id = report.id || report.hostname || 'unknown';
  nodes.set(id, { ...report, id, lastSeen: Date.now() });
  // A fresh heartbeat means the node is up — resolves any open incident.
  transition(id, true, Date.now());
  return id;
}

function isOnline(node) {
  const ageMs = Date.now() - node.lastSeen;
  return ageMs <= config.fleet.offlineAfterMin * 60 * 1000;
}

function all() {
  return [...nodes.values()].map((n) => ({ ...n, online: isOnline(n) }));
}

/**
 * Re-check every known node's online state and log incidents for any that have
 * gone quiet past the offline threshold. Run on a timer from the fleet server.
 */
function evaluate() {
  const now = Date.now();
  for (const node of nodes.values()) transition(node.id, isOnline(node), now);
}

/** Recent incidents, newest first, shaped for the public status page. */
function recentIncidents(limit = 20) {
  return incidents.slice(0, limit).map((i) => ({
    node: i.node,
    startedAt: i.startedAt,
    resolvedAt: i.resolvedAt,
    ongoing: i.resolvedAt == null,
    durationMs: (i.resolvedAt || Date.now()) - i.startedAt,
  }));
}

module.exports = { record, all, isOnline, evaluate, recentIncidents, onTransition };
