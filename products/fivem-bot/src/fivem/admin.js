'use strict';

const crypto = require('crypto');

/**
 * In-memory queue of admin actions for the in-game resource to pick up. The
 * resource polls GET /admin/pending (which drains the queue) and executes each
 * one — kick now, or ban (kick + report identifiers back so the bot stores the
 * ban and enforces it on future connects).
 */
const queue = [];
const MAX = 200;

function enqueue(action) {
  queue.push({ id: crypto.randomUUID(), at: Date.now(), ...action });
  while (queue.length > MAX) queue.shift();
}

/** Queue a kick. `target` is a player name or in-game server id (as typed). */
const queueKick = (target, reason, by) => enqueue({ type: 'kick', target: String(target), reason: String(reason || ''), by: String(by || '') });
const queueBan = (target, reason, by) => enqueue({ type: 'ban', target: String(target), reason: String(reason || ''), by: String(by || '') });

/** Return all pending actions and clear the queue (consumed once). */
function drainPending() {
  const out = queue.splice(0, queue.length);
  return out;
}

module.exports = { queueKick, queueBan, drainPending };
