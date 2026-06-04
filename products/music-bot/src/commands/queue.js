'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { manager } = require('../lib/player');
const { info, err } = require('../lib/embeds');

module.exports = {
  name: 'queue',
  data: new SlashCommandBuilder().setName('queue').setDescription('Show the current queue.'),

  async execute(interaction) {
    const player = manager.get(interaction.guild.id);
    if (!player || !player.current) return interaction.reply({ embeds: [err('Nothing is playing.')], ephemeral: true });

    const up = player.list();
    const lines = up.slice(0, 10).map((t, i) => `**${i + 1}.** ${t.title} \`${t.duration}\``);
    const more = up.length > 10 ? `\n…and **${up.length - 10}** more` : '';
    const e = info('🎵 Queue', `**Now:** ${player.current.title} \`${player.current.duration}\`\n\n${lines.join('\n') || '*Queue is empty.*'}${more}`)
      .setFooter({ text: `Volume ${player.volume}% · Filter: ${player.filter}` });
    return interaction.reply({ embeds: [e] });
  },
};
