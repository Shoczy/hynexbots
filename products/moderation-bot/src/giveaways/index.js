'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { cfg } = require('../lib/state');
const { make, ok, COLORS, brandColor } = require('../lib/embeds');
const store = require('../lib/store');

// Constant id: the entry button is keyed by the message it sits on, so one
// handler serves every giveaway (we read interaction.message.id).
const ENTER_BUTTON_ID = 'hynex:gw';

function buttonRow(count, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(ENTER_BUTTON_ID)
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎉')
      .setLabel(count ? `Enter · ${count}` : 'Enter')
      .setDisabled(disabled),
  );
}

function liveEmbed({ prize, winners, hostId, endsAt }) {
  const ts = Math.floor(endsAt / 1000);
  return make({
    title: `🎉 ${prize}`.slice(0, 256),
    description: `Click 🎉 below to enter!\n\n**Winners:** ${winners}\n**Ends:** <t:${ts}:R> · <t:${ts}:f>\n**Hosted by:** <@${hostId}>`,
    color: brandColor(),
  });
}

/** Post the giveaway message and persist it. Returns the sent message. */
async function start(interaction, { prize, winners, durationMs }) {
  const endsAt = Date.now() + durationMs;
  const hostId = interaction.user.id;
  const msg = await interaction.channel.send({ embeds: [liveEmbed({ prize, winners, hostId, endsAt })], components: [buttonRow(0)] });
  store.createGiveaway({ messageId: msg.id, guildId: interaction.guild.id, channelId: interaction.channel.id, prize, winners, hostId, endsAt });
  return msg;
}

/** A member clicked the 🎉 button → toggle their entry and refresh the count. */
async function handleEnter(interaction) {
  const g = store.getGiveaway(interaction.message.id);
  if (!g || g.ended) {
    return interaction.reply({ embeds: [make({ description: 'This giveaway has ended.', color: COLORS.warning })], flags: MessageFlags.Ephemeral });
  }
  const { entered, count } = store.toggleGiveawayEntry(g.message_id, interaction.user.id);
  await interaction.message.edit({ components: [buttonRow(count)] }).catch(() => {});
  return interaction.reply({
    embeds: [ok(entered ? 'You\'re entered — good luck! 🎉' : 'You left the giveaway.')],
    flags: MessageFlags.Ephemeral,
  });
}

/** Pick up to `n` unique random winners from `entrants`. */
function pickWinners(entrants, n) {
  const pool = [...entrants];
  const out = [];
  while (pool.length && out.length < n) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

/** End a giveaway: draw winners, update the message, announce, DM winners. */
async function end(client, g) {
  store.markGiveawayEnded(g.message_id);
  const entrants = store.giveawayEntrants(g.message_id);
  const winners = pickWinners(entrants, g.winners);
  const channel = await client.channels.fetch(g.channel_id).catch(() => null);

  if (channel?.isTextBased?.()) {
    const ended = make({
      title: `🎉 ${g.prize}`.slice(0, 256),
      description: winners.length
        ? `**Winner${winners.length > 1 ? 's' : ''}:** ${winners.map((id) => `<@${id}>`).join(', ')}\n**Hosted by:** <@${g.host_id}>\n**Entries:** ${entrants.length}`
        : `No valid entries — no winner was drawn.\n**Hosted by:** <@${g.host_id}>`,
      color: COLORS.success,
    });
    const msg = await channel.messages.fetch(g.message_id).catch(() => null);
    if (msg) await msg.edit({ embeds: [ended], components: [buttonRow(entrants.length, true)] }).catch(() => {});
    if (winners.length) {
      await channel
        .send({ content: `🎉 Congratulations ${winners.map((id) => `<@${id}>`).join(', ')} — you won **${g.prize}**!`, allowedMentions: { users: winners } })
        .catch(() => {});
    } else {
      await channel.send({ embeds: [make({ description: `No one entered the giveaway for **${g.prize}** — no winner.` })] }).catch(() => {});
    }
  }

  if (cfg('giveaways.dmWinners', true)) {
    for (const id of winners) {
      const user = await client.users.fetch(id).catch(() => null);
      user?.send({ embeds: [make({ description: `🎉 You won **${g.prize}**! Reach out to <@${g.host_id}> to claim your prize.` })] }).catch(() => {});
    }
  }
  return winners;
}

/** Draw fresh winners for an existing giveaway and announce them. */
async function reroll(client, messageId, count) {
  const g = store.getGiveaway(messageId);
  if (!g) return null;
  const winners = pickWinners(store.giveawayEntrants(messageId), count || g.winners);
  if (!winners.length) return [];
  const channel = await client.channels.fetch(g.channel_id).catch(() => null);
  if (channel?.isTextBased?.()) {
    await channel
      .send({ content: `🎉 Reroll — new winner${winners.length > 1 ? 's' : ''} for **${g.prize}**: ${winners.map((id) => `<@${id}>`).join(', ')}!`, allowedMentions: { users: winners } })
      .catch(() => {});
  }
  return winners;
}

/** End every giveaway whose timer has elapsed, then prune very old ones. */
async function sweep(client) {
  for (const g of store.dueGiveaways()) {
    try {
      await end(client, g);
    } catch {
      /* channel gone / missing perms — skip */
    }
  }
  store.pruneGiveaways();
}

function startSweeper(client) {
  sweep(client).catch(() => {});
  const timer = setInterval(() => sweep(client).catch(() => {}), 30_000);
  if (timer.unref) timer.unref();
}

module.exports = { ENTER_BUTTON_ID, start, handleEnter, end, reroll, sweep, startSweeper };
