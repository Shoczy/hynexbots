'use strict';

const { fivem } = require('../lib/state');

/**
 * Two-way chat bridge state. In-game → Discord is handled by the intake server
 * (POST /chat → posts to the bridge channel). Discord → in-game works by the
 * in-game resource polling GET /chat/pending; we keep a small rolling queue of
 * recent Discord messages here for it to drain by timestamp.
 */
const queue = [];
const MAX = 200;

function enabled() {
  return Boolean(fivem().chatBridge?.enabled && fivem().chatBridge?.channelId);
}

function channelId() {
  return fivem().chatBridge?.channelId || '';
}

/** Queue a Discord message for the in-game resource to pick up. */
function pushFromDiscord(author, content) {
  queue.push({ t: Date.now(), author: String(author || '').slice(0, 80), content: String(content || '').slice(0, 300) });
  while (queue.length > MAX) queue.shift();
}

/** Messages newer than `since` (ms epoch) for the in-game poller. */
function pending(since) {
  const s = Number(since) || 0;
  return queue.filter((m) => m.t > s);
}

module.exports = { enabled, channelId, pushFromDiscord, pending };
