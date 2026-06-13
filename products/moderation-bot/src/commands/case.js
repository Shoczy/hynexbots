'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const store = require('../lib/store');
const { make, ok, err, COLORS } = require('../lib/embeds');

const ACTION_LABEL = { warn: '⚠️ Warn', mute: '🔇 Mute', kick: '👢 Kick', ban: '🔨 Ban', tempban: '⏳ Temp-Ban' };
const label = (a) => ACTION_LABEL[a] || a;

function caseLine(c) {
  const when = `<t:${Math.floor(c.created_at / 1000)}:R>`;
  return `\`#${c.case_no}\` ${label(c.action)} · <@${c.user_id}> · by <@${c.mod_id}> · ${when}${c.reason ? `\n> ${c.reason.slice(0, 200)}` : ''}`;
}

module.exports = {
  name: 'case',
  requiredPerm: PermissionFlagsBits.ModerateMembers,
  data: new SlashCommandBuilder()
    .setName('case')
    .setDescription('View the moderation case log.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((s) =>
      s.setName('view').setDescription('Show a single case by number.').addIntegerOption((o) => o.setName('number').setDescription('Case number').setMinValue(1).setRequired(true)),
    )
    .addSubcommand((s) =>
      s.setName('list').setDescription('List recent cases (optionally for one member).').addUserOption((o) => o.setName('user').setDescription('Filter by member')),
    )
    .addSubcommand((s) =>
      s
        .setName('delete')
        .setDescription('Delete a case (Manage Server).')
        .addIntegerOption((o) => o.setName('number').setDescription('Case number').setMinValue(1).setRequired(true)),
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    if (sub === 'view') {
      const n = interaction.options.getInteger('number');
      const c = store.getCase(gid, n);
      if (!c) return interaction.reply({ embeds: [err(`No case **#${n}** found.`)], flags: MessageFlags.Ephemeral });
      return interaction.reply({
        embeds: [
          make({
            title: `Case #${c.case_no} — ${label(c.action)}`,
            color: COLORS.warning,
            fields: [
              { name: 'Member', value: `<@${c.user_id}>\n\`${c.user_id}\``, inline: true },
              { name: 'Moderator', value: `<@${c.mod_id}>`, inline: true },
              { name: 'When', value: `<t:${Math.floor(c.created_at / 1000)}:F>`, inline: false },
              { name: 'Reason', value: (c.reason || 'No reason provided').slice(0, 1024) },
            ],
          }),
        ],
      });
    }

    if (sub === 'list') {
      const user = interaction.options.getUser('user');
      const rows = user ? store.casesForUser(gid, user.id, 15) : store.recentCases(gid, 15);
      if (!rows.length) {
        return interaction.reply({ embeds: [make({ title: '📂 Case log', description: user ? `**${user.tag}** has no cases.` : 'No cases logged yet.' })], flags: MessageFlags.Ephemeral });
      }
      const title = user ? `📂 Cases — ${user.tag} (${rows.length})` : `📂 Recent cases (${rows.length})`;
      return interaction.reply({ embeds: [make({ title, description: rows.map(caseLine).join('\n').slice(0, 4000) })], allowedMentions: { parse: [] } });
    }

    // delete
    if (!interaction.member.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ embeds: [err('You need **Manage Server** to delete cases.')], flags: MessageFlags.Ephemeral });
    }
    const n = interaction.options.getInteger('number');
    const removed = store.deleteCase(gid, n);
    return interaction.reply({ embeds: [removed ? ok(`Deleted case **#${n}**.`) : err(`No case **#${n}** found.`)], flags: MessageFlags.Ephemeral });
  },
};
