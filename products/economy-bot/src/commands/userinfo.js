'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { info } = require('../lib/embeds');
const { money, eco } = require('../lib/state');
const store = require('../lib/store');

module.exports = {
  name: 'userinfo',
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Show information about a member.')
    .addUserOption((o) => o.setName('user').setDescription('Member to look up (defaults to you)')),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild.members.cache.get(user.id);
    const acc = store.getAccount(interaction.guild.id, user.id, eco().startingBalance || 0);
    const e = info(user.tag)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'ID', value: user.id, inline: true },
        { name: 'Account created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Balance', value: money(acc.balance), inline: true },
      );
    if (member?.joinedTimestamp) {
      e.addFields({ name: 'Joined', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true });
    }
    return interaction.reply({ embeds: [e], ephemeral: true });
  },
};
