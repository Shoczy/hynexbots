'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { listWarnings, clearWarnings } = require('../lib/actions');
const { info, ok } = require('../lib/embeds');

module.exports = {
  name: 'warnings',
  requiredPerm: PermissionFlagsBits.ModerateMembers,
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View or clear a member\'s warnings.')
    .addUserOption((o) => o.setName('user').setDescription('Member to look up').setRequired(true))
    .addBooleanOption((o) => o.setName('clear').setDescription('Clear all of this member\'s warnings'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const clear = interaction.options.getBoolean('clear');

    if (clear) {
      const n = clearWarnings(interaction.guild, user.id);
      return interaction.reply({ embeds: [ok(`🧹 Cleared **${n}** warning(s) for **${user.tag}**.`)] });
    }

    const list = listWarnings(interaction.guild, user.id);
    if (!list.length) {
      return interaction.reply({ embeds: [info('Warnings', `**${user.tag}** has no active warnings.`)], flags: MessageFlags.Ephemeral });
    }
    const lines = list
      .slice(0, 15)
      .map((w, i) => `**${i + 1}.** ${w.reason} — <t:${Math.floor(w.created_at / 1000)}:R> by <@${w.mod_id}>`)
      .join('\n');
    return interaction.reply({
      embeds: [info(`Warnings — ${user.tag} (${list.length})`, lines)],
      flags: MessageFlags.Ephemeral,
    });
  },
};
