'use strict';

const { mod } = require('../lib/state');

// Per-channel rolling message timestamps + the channels we've tripped.
const buckets = new Map(); // channelId -> number[]
const active = new Map(); // channelId -> { prevRate, timer }

const clamp = (n, min, max, fb) => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fb;
};

/**
 * Watch channel message rate and enable Discord slowmode automatically when a
 * channel spikes, then lift it after things calm down. Non-blocking — call it
 * for every message; it never deletes or interferes with commands.
 */
async function trackMessage(message) {
  if (!message.guild || message.author?.bot) return;
  const cfg = mod().autoSlowmode || {};
  if (!cfg.enabled) return;

  const chan = message.channel;
  if (!chan || typeof chan.setRateLimitPerUser !== 'function') return; // text channels only
  if (Array.isArray(cfg.channelIds) && cfg.channelIds.length && !cfg.channelIds.includes(chan.id)) return;
  if (active.has(chan.id)) return; // already slowed — wait for the revert timer

  const now = Date.now();
  const windowMs = clamp(cfg.perSeconds, 1, 300, 10) * 1000;
  const arr = (buckets.get(chan.id) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  buckets.set(chan.id, arr);

  if (arr.length < clamp(cfg.messages, 2, 500, 20)) return;

  // Spike → enable slowmode, remember the channel's previous rate, schedule lift.
  const seconds = clamp(cfg.slowmodeSeconds, 1, 21600, 5);
  const prevRate = chan.rateLimitPerUser || 0;
  try {
    await chan.setRateLimitPerUser(seconds, 'Auto-slowmode: message spike');
  } catch {
    return; // missing Manage Channel — give up quietly
  }
  buckets.delete(chan.id);
  const timer = setTimeout(() => liftSlowmode(chan), clamp(cfg.cooldownSeconds, 5, 3600, 60) * 1000);
  if (timer.unref) timer.unref();
  active.set(chan.id, { prevRate, timer });
}

async function liftSlowmode(chan) {
  const rec = active.get(chan.id);
  active.delete(chan.id);
  try {
    await chan.setRateLimitPerUser(rec ? rec.prevRate : 0, 'Auto-slowmode: calmed down');
  } catch {
    /* ignore */
  }
}

module.exports = { trackMessage };
