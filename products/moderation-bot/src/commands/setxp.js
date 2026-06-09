'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { ok } = require('../lib/embeds');
const lv = require('../lib/leveling');

module.exports = {
  name: 'setxp',
  requiredPerm: PermissionFlagsBits.ManageGuild,
  data: new SlashCommandBuilder()
    .setName('setxp')
    .setDescription('Set a member’s XP total.')
    .addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true))
    .addIntegerOption((o) => o.setName('xp').setDescription('New XP total').setRequired(true).setMinValue(0))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const xp = interaction.options.getInteger('xp');
    lv.setXp(interaction.guild.id, user.id, xp);
    const { level } = lv.levelFromXp(xp);
    return interaction.reply({ embeds: [ok(`Set ${user} to **${xp} XP** (level ${level}).`)], ephemeral: true });
  },
};
