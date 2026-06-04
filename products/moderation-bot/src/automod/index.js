'use strict';

const { mod } = require('../lib/state');
const { isMod } = require('../lib/perms');
const { logModAction } = require('../lib/log');
const { info } = require('../lib/embeds');

const INVITE_RE = /(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/\S+/i;
const LINK_RE = /https?:\/\/\S+/i;

// Per-user rolling message timestamps for spam detection: key = `${guild}:${user}`.
const spamHits = new Map();

/** Run the configured auto-mod rules over a message. Returns true if it acted. */
async function handleMessage(message) {
  if (!message.guild || message.author.bot || !message.member) return false;
  const am = mod().automod || {};
  if (!am.enabled) return false;
  if (isMod(message.member)) return false; // never auto-mod staff/admins

  const content = message.content || '';

  // ── Banned words ──
  if (am.bannedWords?.enabled && am.bannedWords.words?.length) {
    const lower = content.toLowerCase();
    if (am.bannedWords.words.some((w) => w && lower.includes(w))) {
      return act(message, 'Blocked word');
    }
  }

  // ── Invite links ──
  if (am.antiInvites && INVITE_RE.test(content)) return act(message, 'Server invite');

  // ── External links ──
  if (am.antiLinks && LINK_RE.test(content)) return act(message, 'Link not allowed');

  // ── Mass mentions ──
  if (am.massMention?.enabled) {
    const mentions = message.mentions.users.size + message.mentions.roles.size;
    if (mentions >= am.massMention.threshold) return act(message, 'Mass mention');
  }

  // ── Caps filter ──
  if (am.capsFilter?.enabled && content.length >= 10) {
    const letters = content.replace(/[^a-zA-Z]/g, '');
    if (letters.length >= 8) {
      const caps = (content.match(/[A-Z]/g) || []).length;
      if ((caps / letters.length) * 100 >= am.capsFilter.percent) return act(message, 'Excessive caps');
    }
  }

  // ── Anti-spam (rate) ──
  if (am.antiSpam?.enabled) {
    const key = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    const windowMs = am.antiSpam.intervalSec * 1000;
    const hits = (spamHits.get(key) || []).filter((t) => now - t < windowMs);
    hits.push(now);
    spamHits.set(key, hits);
    if (hits.length > am.antiSpam.maxMessages) {
      spamHits.set(key, []); // reset so we don't fire repeatedly
      await act(message, 'Spam', { silent: true });
      try {
        await message.member.timeout(60_000, 'Auto-mod: spam');
      } catch {
        /* ignore */
      }
      await notify(message, 'Spam detected — slow down. (1 minute timeout)');
      return true;
    }
  }

  return false;
}

/** Delete the offending message and log it. */
async function act(message, reason, { silent = false } = {}) {
  try {
    await message.delete();
  } catch {
    return false;
  }
  await logModAction(
    message.guild,
    info('Auto-Mod', `**Rule:** ${reason}\n**User:** ${message.author.tag} (\`${message.author.id}\`)\n**Channel:** <#${message.channel.id}>`),
  );
  if (!silent) await notify(message, `${reason} — message removed.`);
  return true;
}

/** Briefly tell the channel why a message was removed (auto-deletes). */
async function notify(message, text) {
  try {
    const m = await message.channel.send(`${message.author}, ${text}`);
    setTimeout(() => m.delete().catch(() => {}), 5000);
  } catch {
    /* ignore */
  }
}

module.exports = { handleMessage };
