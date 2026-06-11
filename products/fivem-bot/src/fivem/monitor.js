'use strict';

const { fivem } = require('../lib/state');
const { queryServer } = require('../lib/fivem');
const { v2, COLORS } = require('../lib/embeds');

/**
 * Server-down monitor: polls the FiveM server and posts an alert (optionally
 * pinging a role) when it goes offline, then a recovery notice when it returns.
 * `downChecks` consecutive failures are required before alerting, so a single
 * blip doesn't spam the channel.
 */
let client = null;
let timer = null;
let downStreak = 0;
let alerted = false;

async function post(m, recovered) {
  const channel = await client.channels.fetch(m.channelId).catch(() => null);
  if (!channel || !channel.isTextBased?.()) return;
  const name = fivem().server.name || 'The FiveM server';
  const items = [];
  if (!recovered && m.pingRoleId) items.push(`<@&${m.pingRoleId}>`);
  if (recovered) {
    items.push('## 🟢 Server back online');
    items.push(`**${name}** is reachable again.`);
  } else {
    items.push('## 🔴 Server offline');
    items.push(`**${name}** isn't responding. We'll post here when it recovers.`);
  }
  items.push(`-# <t:${Math.floor(Date.now() / 1000)}:R>`);
  await channel.send(v2(items, recovered ? COLORS.success : COLORS.danger)).catch(() => {});
}

async function tick() {
  const m = fivem().monitor;
  if (!m?.enabled || !m.channelId || !fivem().server.host) {
    downStreak = 0;
    return;
  }
  const snap = await queryServer(fivem().server.host);
  if (snap.online) {
    if (alerted) await post(m, true); // recovery
    alerted = false;
    downStreak = 0;
    return;
  }
  downStreak += 1;
  if (!alerted && downStreak >= Math.max(1, m.downChecks || 2)) {
    alerted = true;
    await post(m, false);
  }
}

function start(c) {
  client = c;
  timer = setInterval(() => tick().catch(() => {}), 60_000);
  if (timer.unref) timer.unref();
}

module.exports = { start, tick };
