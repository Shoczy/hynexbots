'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { fivem } = require('../lib/state');
const adminQueue = require('../fivem/admin');
const store = require('../lib/store');
const { ok, err, make } = require('../lib/embeds');

module.exports = {
  name: 'fivem-admin',
  requiredPerm: PermissionFlagsBits.BanMembers,
  data: new SlashCommandBuilder()
    .setName('fivem-admin')
    .setDescription('Kick or ban players on the FiveM server from Discord.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addSubcommand((s) =>
      s
        .setName('kick')
        .setDescription('Kick a player now.')
        .addStringOption((o) => o.setName('player').setDescription('Player name or in-game ID').setRequired(true))
        .addStringOption((o) => o.setName('reason').setDescription('Reason')),
    )
    .addSubcommand((s) =>
      s
        .setName('ban')
        .setDescription('Ban a player (kicks now + blocks them on reconnect).')
        .addStringOption((o) => o.setName('player').setDescription('Player name or in-game ID').setRequired(true))
        .addStringOption((o) => o.setName('reason').setDescription('Reason')),
    )
    .addSubcommand((s) =>
      s
        .setName('unban')
        .setDescription('Lift a ban by identifier.')
        .addStringOption((o) => o.setName('identifier').setDescription('e.g. license:abc123 (see /fivem-admin bans)').setRequired(true)),
    )
    .addSubcommand((s) => s.setName('bans').setDescription('List active in-game bans.')),

  async execute(interaction) {
    if (!fivem().admin?.enabled) {
      return interaction.reply({ embeds: [err('In-game admin actions are turned off — enable them in the dashboard (FiveM).')], flags: MessageFlags.Ephemeral });
    }
    const sub = interaction.options.getSubcommand();

    if (sub === 'kick' || sub === 'ban') {
      const target = interaction.options.getString('player');
      const reason = interaction.options.getString('reason') || `${sub === 'ban' ? 'Banned' : 'Kicked'} by staff`;
      if (sub === 'ban') adminQueue.queueBan(target, reason, interaction.user.tag);
      else adminQueue.queueKick(target, reason, interaction.user.tag);
      return interaction.reply({
        embeds: [ok(`Queued **${sub}** for \`${target}\` — the server will action it within a few seconds.${sub === 'ban' ? ' They’ll be blocked on reconnect.' : ''}`)],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (sub === 'unban') {
      const identifier = interaction.options.getString('identifier');
      const n = store.removeBan(identifier);
      return interaction.reply({ embeds: [n ? ok(`Unbanned \`${identifier}\`.`) : err('No ban found for that identifier.')], flags: MessageFlags.Ephemeral });
    }

    // bans
    const list = store.listBans(25);
    if (!list.length) return interaction.reply({ embeds: [make({ title: '🔨 In-game bans', description: 'No active bans.' })], flags: MessageFlags.Ephemeral });
    const lines = list.map((b) => `• \`${b.identifier}\`${b.name ? ` (${b.name})` : ''}${b.reason ? ` — ${b.reason}` : ''}`).join('\n');
    return interaction.reply({ embeds: [make({ title: `🔨 In-game bans (${list.length})`, description: lines.slice(0, 4000) })], flags: MessageFlags.Ephemeral });
  },
};
