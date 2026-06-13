'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const store = require('../lib/store');
const { levelInfo } = require('../leveling');
const { ok } = require('../lib/embeds');

module.exports = {
  name: 'setxp',
  requiredPerm: PermissionFlagsBits.ManageGuild,
  data: new SlashCommandBuilder()
    .setName('setxp')
    .setDescription("Set a member's total XP.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true))
    .addIntegerOption((o) => o.setName('xp').setDescription('Total XP').setRequired(true).setMinValue(0)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const xp = interaction.options.getInteger('xp');
    store.setXp(interaction.guild.id, user.id, xp);
    return interaction.reply({ embeds: [ok(`Set ${user}'s XP to **${xp}** (Level ${levelInfo(xp).level}).`)], flags: MessageFlags.Ephemeral });
  },
};
