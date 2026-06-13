'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { cfg } = require('../lib/state');
const { ok, err } = require('../lib/embeds');
const { parseDuration } = require('./_helpers');
const giveaways = require('../giveaways');
const store = require('../lib/store');

const MAX_DURATION_MS = 60 * 86_400_000; // 60 days

/** Who may run giveaways: Manage Server, the owner, or a configured manager role. */
function canManage(member) {
  if (!member) return false;
  if (member.id === member.guild?.ownerId) return true;
  if (member.permissions?.has(PermissionFlagsBits.ManageGuild)) return true;
  const roleIds = cfg('giveaways.managerRoleIds', []) || [];
  return roleIds.some((id) => member.roles.cache.has(id));
}

module.exports = {
  name: 'giveaway',
  // No requiredPerm: access is "Manage Server OR a configured manager role",
  // enforced in execute() so manager roles work without the native permission.
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Start, end or reroll a giveaway.')
    .addSubcommand((s) =>
      s
        .setName('start')
        .setDescription('Start a giveaway in this channel.')
        .addStringOption((o) => o.setName('duration').setDescription('e.g. 30m, 1h, 2d').setRequired(true))
        .addIntegerOption((o) => o.setName('winners').setDescription('Number of winners').setMinValue(1).setMaxValue(50).setRequired(true))
        .addStringOption((o) => o.setName('prize').setDescription('What you are giving away').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('end')
        .setDescription('End a giveaway now and draw winners.')
        .addStringOption((o) => o.setName('message_id').setDescription('The giveaway message ID').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('reroll')
        .setDescription('Draw new winners for a giveaway.')
        .addStringOption((o) => o.setName('message_id').setDescription('The giveaway message ID').setRequired(true))
        .addIntegerOption((o) => o.setName('winners').setDescription('How many to reroll (default: same as the giveaway)').setMinValue(1).setMaxValue(50)),
    ),

  async execute(interaction) {
    if (!cfg('modules.giveaways', false)) {
      return interaction.reply({ embeds: [err('Giveaways are disabled for this server.')], flags: MessageFlags.Ephemeral });
    }
    if (!canManage(interaction.member)) {
      return interaction.reply({ embeds: [err('You don\'t have permission to manage giveaways.')], flags: MessageFlags.Ephemeral });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const durationMs = parseDuration(interaction.options.getString('duration'));
      if (!durationMs || durationMs < 10_000) {
        return interaction.reply({ embeds: [err('Give a valid duration of at least 10s — e.g. `30m`, `1h`, `2d`.')], flags: MessageFlags.Ephemeral });
      }
      if (durationMs > MAX_DURATION_MS) {
        return interaction.reply({ embeds: [err('Giveaways can run for at most 60 days.')], flags: MessageFlags.Ephemeral });
      }
      const winners = interaction.options.getInteger('winners');
      const prize = interaction.options.getString('prize').slice(0, 200);
      const msg = await giveaways.start(interaction, { prize, winners, durationMs });
      return interaction.reply({ embeds: [ok(`Giveaway started — [jump to it](${msg.url}).`)], flags: MessageFlags.Ephemeral });
    }

    const id = interaction.options.getString('message_id');
    const g = store.getGiveaway(id);
    if (!g || g.guild_id !== interaction.guild.id) {
      return interaction.reply({ embeds: [err('No giveaway found for that message ID.')], flags: MessageFlags.Ephemeral });
    }

    if (sub === 'end') {
      if (g.ended) return interaction.reply({ embeds: [err('That giveaway has already ended.')], flags: MessageFlags.Ephemeral });
      const winners = await giveaways.end(interaction.client, g);
      return interaction.reply({
        embeds: [ok(winners.length ? `Ended — drew **${winners.length}** winner(s).` : 'Ended — there were no valid entries.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    // reroll
    const winners = await giveaways.reroll(interaction.client, id, interaction.options.getInteger('winners'));
    return interaction.reply({
      embeds: [winners && winners.length ? ok('Rerolled — new winner(s) announced.') : err('There are no entries to reroll from.')],
      flags: MessageFlags.Ephemeral,
    });
  },
};
