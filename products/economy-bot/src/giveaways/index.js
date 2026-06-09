'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { cfg } = require('../lib/state');
const { make, ok, err, COLORS } = require('../lib/embeds');
const store = require('../lib/giveaways');

const ENTER_PREFIX = 'hynex:gw:enter:'; // + giveaway id
const timers = new Map(); // id -> NodeJS timeout
const MAX_TIMEOUT = 2_000_000_000; // setTimeout caps ~24.8 days

/** Members allowed to run giveaways: owner, ManageGuild, or a configured manager role. */
function isManager(member) {
  if (!member) return false;
  if (member.id === member.guild?.ownerId) return true;
  if (member.permissions?.has(PermissionFlagsBits.ManageGuild)) return true;
  return (cfg('giveaways.managerRoleIds', []) || []).some((id) => member.roles.cache.has(id));
}

/** Parse "10m", "1h30m", "2d" → milliseconds, or null if invalid. */
function parseDuration(input) {
  const re = /(\d+)\s*(d|h|m|s)/gi;
  const mult = { d: 864e5, h: 36e5, m: 6e4, s: 1e3 };
  let ms = 0;
  let matched = false;
  let m;
  while ((m = re.exec(input))) {
    matched = true;
    ms += parseInt(m[1], 10) * mult[m[2].toLowerCase()];
  }
  return matched && ms > 0 ? ms : null;
}

function gwEmbed(gw, { ended = false, winnerIds = null } = {}) {
  const lines = [`**Prize:** ${gw.prize}`, `**Winners:** ${gw.winners}`, `**Host:** <@${gw.host_id}>`];
  if (gw.require_role_id) lines.push(`**Required role:** <@&${gw.require_role_id}>`);
  if (ended) {
    lines.push(
      winnerIds && winnerIds.length
        ? `**Winner${winnerIds.length > 1 ? 's' : ''}:** ${winnerIds.map((i) => `<@${i}>`).join(', ')}`
        : '**No valid entries.**',
    );
  } else {
    lines.push(`**Ends:** <t:${Math.floor(gw.ends_at / 1000)}:R>`);
  }
  return make({
    title: ended ? '🎉 Giveaway ended' : '🎉 Giveaway',
    description: lines.join('\n'),
    color: ended ? COLORS.warning : undefined,
  });
}

function enterRow(id, count) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(ENTER_PREFIX + id)
      .setLabel(count ? `Enter (${count})` : 'Enter')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🎉'),
  );
}

function pickWinners(entrants, n) {
  const pool = [...new Set(entrants)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.max(1, n));
}

async function start(client, { guild, channel, prize, durationMs, winners, hostId, requireRoleId }) {
  const endsAt = Date.now() + durationMs;
  let gw = store.create({ guildId: guild.id, channelId: channel.id, prize, winners, hostId, requireRoleId, endsAt });
  const msg = await channel.send({ embeds: [gwEmbed(gw)], components: [enterRow(gw.id, 0)] });
  store.setMessageId(gw.id, msg.id);
  gw = store.get(gw.id);
  schedule(client, gw.id, durationMs);
  return gw;
}

async function updateMessage(client, gw, count) {
  try {
    const ch = await client.channels.fetch(gw.channel_id);
    const msg = gw.message_id ? await ch.messages.fetch(gw.message_id) : null;
    if (msg) await msg.edit({ components: [enterRow(gw.id, count)] });
  } catch {
    /* message gone */
  }
}

async function handleEnter(interaction) {
  if (!cfg('modules.giveaways', false)) {
    return interaction.reply({ embeds: [err('Giveaways are currently disabled.')], ephemeral: true });
  }
  const id = interaction.customId.slice(ENTER_PREFIX.length);
  const gw = store.get(id);
  if (!gw || gw.ended) return interaction.reply({ embeds: [err('This giveaway has ended.')], ephemeral: true });
  if (gw.require_role_id && !interaction.member.roles.cache.has(gw.require_role_id)) {
    return interaction.reply({ embeds: [err(`You need <@&${gw.require_role_id}> to enter.`)], ephemeral: true });
  }

  const entrants = store.entrantsOf(gw);
  if (entrants.includes(interaction.user.id)) {
    const next = entrants.filter((e) => e !== interaction.user.id);
    store.setEntrants(id, next);
    await updateMessage(interaction.client, gw, next.length);
    return interaction.reply({ embeds: [ok('You left the giveaway.')], ephemeral: true });
  }
  entrants.push(interaction.user.id);
  store.setEntrants(id, entrants);
  await updateMessage(interaction.client, gw, entrants.length);
  return interaction.reply({ embeds: [ok('You’re in! 🎉')], ephemeral: true });
}

async function end(client, id) {
  const gw = store.get(id);
  if (!gw || gw.ended) return null;
  store.markEnded(id);
  clearTimeout(timers.get(id));
  timers.delete(id);

  const winners = pickWinners(store.entrantsOf(gw), gw.winners);
  try {
    const ch = await client.channels.fetch(gw.channel_id);
    const msg = gw.message_id ? await ch.messages.fetch(gw.message_id).catch(() => null) : null;
    if (msg) await msg.edit({ embeds: [gwEmbed(gw, { ended: true, winnerIds: winners })], components: [] }).catch(() => {});
    if (winners.length) {
      await ch.send({
        content: winners.map((i) => `<@${i}>`).join(' '),
        embeds: [make({ description: `🎉 Congratulations! You won **${gw.prize}**.` })],
      });
    } else if (msg) {
      await ch.send({ embeds: [make({ description: `No valid entries for **${gw.prize}**.` })] });
    }
  } catch {
    /* channel gone */
  }
  return winners;
}

async function reroll(client, id) {
  const gw = store.get(id);
  if (!gw) return null;
  const winners = pickWinners(store.entrantsOf(gw), gw.winners);
  if (!winners.length) return [];
  try {
    const ch = await client.channels.fetch(gw.channel_id);
    await ch.send({
      content: winners.map((i) => `<@${i}>`).join(' '),
      embeds: [make({ description: `🔁 New winner for **${gw.prize}**!` })],
    });
  } catch {
    /* channel gone */
  }
  return winners;
}

function schedule(client, id, ms) {
  clearTimeout(timers.get(id));
  const t = setTimeout(() => end(client, id).catch(() => {}), Math.min(Math.max(0, ms), MAX_TIMEOUT));
  if (t.unref) t.unref();
  timers.set(id, t);
}

/** On boot: end overdue giveaways and re-arm timers for the rest. */
function restore(client) {
  for (const gw of store.active()) {
    const ms = gw.ends_at - Date.now();
    if (ms <= 0) end(client, gw.id).catch(() => {});
    else schedule(client, gw.id, ms);
  }
}

module.exports = { ENTER_PREFIX, isManager, parseDuration, start, end, reroll, handleEnter, restore };
