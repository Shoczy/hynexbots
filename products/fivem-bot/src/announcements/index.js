'use strict';

const { cfg } = require('../lib/state');
const { renderBlocks } = require('../lib/renderBlocks');

/**
 * Scheduled announcements: post a block-builder message to a channel on a fixed
 * interval. Checked once a minute. We seed each item's clock on first sight so a
 * restart doesn't immediately re-post everything — the first post lands one
 * interval after boot.
 */
const lastPost = new Map(); // id -> ms

async function tick(client) {
  const list = cfg('messages.announcements', []);
  if (!Array.isArray(list) || !list.length) return;
  const now = Date.now();
  for (const a of list) {
    if (!a || !a.enabled || !a.channelId) continue;
    if (!a.v2 || !Array.isArray(a.v2.blocks) || !a.v2.blocks.length) continue;
    if (!lastPost.has(a.id)) {
      lastPost.set(a.id, now); // seed — don't post on boot/first sight
      continue;
    }
    const interval = Math.max(5, Number(a.everyMinutes) || 360) * 60_000;
    if (now - lastPost.get(a.id) < interval) continue;
    const channel = await client.channels.fetch(a.channelId).catch(() => null);
    if (channel?.isTextBased?.()) {
      const payload = renderBlocks({ ...a.v2, enabled: true }, { server: channel.guild?.name || 'the server' });
      if (payload) await channel.send(payload).catch(() => {});
    }
    lastPost.set(a.id, now);
  }
}

function start(client) {
  const timer = setInterval(() => tick(client).catch(() => {}), 60_000);
  if (timer.unref) timer.unref();
}

module.exports = { start, tick };
