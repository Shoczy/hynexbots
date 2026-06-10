'use strict';

const { fivem } = require('../lib/state');
const { make, COLORS } = require('../lib/embeds');

/**
 * Scheduled restart announcements. Every minute we compare the current server
 * time (HH:MM) against each configured restart time and its countdown warnings,
 * posting an embed when one is due. A per-day "fired" set prevents duplicates if
 * the tick runs more than once in the same minute.
 */
let client = null;
let timer = null;
let firedDay = '';
const fired = new Set();

const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Subtract `mins` minutes from an "HH:MM" string, wrapping around midnight. */
function minus(time, mins) {
  const [h, m] = time.split(':').map(Number);
  let total = (h * 60 + m - mins + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

async function announce(text, color, ping) {
  const rs = fivem().restarts;
  if (!rs.channelId) return;
  const channel = await client.channels.fetch(rs.channelId).catch(() => null);
  if (!channel || !channel.isTextBased?.()) return;
  const name = fivem().server.name || 'The server';
  const embed = make({ title: '🔄 Server restart', description: text.replace('{server}', name), color });
  await channel.send({ content: ping ? `<@&${ping}>` : undefined, embeds: [embed] }).catch(() => {});
}

async function tick() {
  const rs = fivem().restarts;
  if (!rs.enabled || !rs.channelId || !Array.isArray(rs.times) || rs.times.length === 0) return;

  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  if (day !== firedDay) {
    firedDay = day;
    fired.clear();
  }
  const cur = hhmm(now);

  for (const t of rs.times) {
    // Restart moment.
    if (cur === t) {
      const key = `${day}|${t}|0`;
      if (!fired.has(key)) {
        fired.add(key);
        await announce('**{server}** is restarting now. You may briefly lose connection.', COLORS.danger);
      }
    }
    // Countdown warnings.
    for (const m of rs.warnMinutes || []) {
      if (cur === minus(t, m)) {
        const key = `${day}|${t}|${m}`;
        if (!fired.has(key)) {
          fired.add(key);
          await announce(`**{server}** restarts in **${m} minute${m === 1 ? '' : 's'}**.`, COLORS.warning);
        }
      }
    }
  }
}

function start(c) {
  client = c;
  // Align to the top of the next minute, then tick every minute.
  const delay = (60 - new Date().getSeconds()) * 1000;
  setTimeout(() => {
    tick().catch(() => {});
    timer = setInterval(() => tick().catch(() => {}), 60_000);
    if (timer.unref) timer.unref();
  }, delay);
}

module.exports = { start, tick };
