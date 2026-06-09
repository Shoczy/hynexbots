'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { cfg } = require('../lib/state');
const gw = require('../giveaways');
const store = require('../lib/giveaways');
const { ok, err, warn, info } = require('../lib/embeds');

module.exports = {
  name: 'giveaway',
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Run giveaways.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('start')
        .setDescription('Start a giveaway')
        .addStringOption((o) => o.setName('prize').setDescription('What you’re giving away').setRequired(true))
        .addStringOption((o) => o.setName('duration').setDescription('e.g. 10m, 1h, 2d').setRequired(true))
        .addIntegerOption((o) => o.setName('winners').setDescription('Number of winners (default 1)').setMinValue(1).setMaxValue(20))
        .addChannelOption((o) => o.setName('channel').setDescription('Channel (defaults to here)').addChannelTypes(ChannelType.GuildText))
        .addRoleOption((o) => o.setName('required_role').setDescription('Role required to enter')),
    )
    .addSubcommand((s) =>
      s.setName('end').setDescription('End a giveaway now').addStringOption((o) => o.setName('id').setDescription('Giveaway message ID').setRequired(true)),
    )
    .addSubcommand((s) =>
      s.setName('reroll').setDescription('Reroll a giveaway’s winners').addStringOption((o) => o.setName('id').setDescription('Giveaway message ID').setRequired(true)),
    )
    .addSubcommand((s) => s.setName('list').setDescription('List recent giveaways')),

  async execute(interaction) {
    if (!cfg('modules.giveaways', false)) {
      return interaction.reply({ embeds: [warn('The Giveaways module is off — enable it in the dashboard.')], ephemeral: true });
    }
    if (!gw.isManager(interaction.member)) {
      return interaction.reply({ embeds: [err('You don’t have permission to manage giveaways.')], ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const prize = interaction.options.getString('prize');
      const durationMs = gw.parseDuration(interaction.options.getString('duration'));
      if (!durationMs) {
        return interaction.reply({ embeds: [err('Invalid duration — try `10m`, `1h`, or `2d`.')], ephemeral: true });
      }
      const winners = interaction.options.getInteger('winners') || 1;
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      if (!channel?.isTextBased?.()) {
        return interaction.reply({ embeds: [err('That channel can’t host a giveaway.')], ephemeral: true });
      }
      const requireRoleId = interaction.options.getRole('required_role')?.id || cfg('giveaways.requireRoleId', '');

      try {
        const created = await gw.start(interaction.client, {
          guild: interaction.guild,
          channel,
          prize,
          durationMs,
          winners,
          hostId: interaction.user.id,
          requireRoleId,
        });
        return interaction.reply({ embeds: [ok(`Giveaway started in ${channel} — ID \`${created.message_id}\`.`)], ephemeral: true });
      } catch {
        return interaction.reply({ embeds: [err(`I couldn’t post in ${channel} — check my permissions.`)], ephemeral: true });
      }
    }

    if (sub === 'end' || sub === 'reroll') {
      const messageId = interaction.options.getString('id');
      const record = store.recent(interaction.guild.id, 100).find((g) => g.message_id === messageId || g.id === messageId);
      if (!record) {
        return interaction.reply({ embeds: [err('No giveaway found with that ID.')], ephemeral: true });
      }
      if (sub === 'end') {
        if (record.ended) return interaction.reply({ embeds: [warn('That giveaway already ended.')], ephemeral: true });
        await gw.end(interaction.client, record.id);
        return interaction.reply({ embeds: [ok('Giveaway ended.')], ephemeral: true });
      }
      const winners = await gw.reroll(interaction.client, record.id);
      return interaction.reply({
        embeds: [winners && winners.length ? ok('Rerolled — new winner announced.') : warn('No entrants to reroll.')],
        ephemeral: true,
      });
    }

    // list
    const rows = store.recent(interaction.guild.id, 10);
    if (!rows.length) return interaction.reply({ embeds: [info('Giveaways', 'No giveaways yet.')], ephemeral: true });
    const lines = rows.map((g) => `${g.ended ? '⚫' : '🟢'} **${g.prize}** — \`${g.message_id || g.id}\` (${store.entrantsOf(g).length} entries)`);
    return interaction.reply({ embeds: [info('🎉 Recent giveaways').setDescription(lines.join('\n'))], ephemeral: true });
  },
};
