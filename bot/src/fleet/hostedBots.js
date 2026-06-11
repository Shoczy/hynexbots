'use strict';

/**
 * In-memory snapshot of the Discord product bots this host runs (the real bots,
 * not the PM2 processes the agent sees). Populated by the main bot on ready +
 * a timer (it can resolve each bot's name/avatar via Discord), and read by the
 * public /status endpoint so the website can show which bots are live.
 */
let list = [];

function setHostedBots(next) {
  list = Array.isArray(next) ? next : [];
}

/** Public, sanitized view: app id, name, avatar, type, online. */
function hostedBots() {
  return list.map((b) => ({
    id: b.id,
    name: b.name,
    avatar: b.avatar || null,
    type: b.type || null,
    online: Boolean(b.online),
  }));
}

module.exports = { setHostedBots, hostedBots };
