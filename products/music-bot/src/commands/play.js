'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { manager } = require('../lib/player');
const sources = require('../lib/sources');
const { ok, err, info } = require('../lib/embeds');
const { commandEmbed } = require('../lib/commandEmbed');

module.exports = {
  name: 'play',
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song (YouTube URL or search).')
    .addStringOption((o) => o.setName('query').setDescription('URL or search terms').setRequired(true)),

  async execute(interaction) {
    const voice = interaction.member.voice?.channel;
    if (!voice) return interaction.reply({ embeds: [err('Join a voice channel first.')], ephemeral: true });

    const me = interaction.guild.members.me;
    const perms = voice.permissionsFor(me);
    if (!perms?.has(PermissionFlagsBits.Connect) || !perms?.has(PermissionFlagsBits.Speak)) {
      return interaction.reply({ embeds: [err('I need permission to **Connect** and **Speak** in that channel.')], ephemeral: true });
    }

    await interaction.deferReply();

    let track;
    try {
      track = await sources.resolve(interaction.options.getString('query'), interaction.user.toString());
    } catch (e) {
      return interaction.editReply({ embeds: [err(`Search failed: ${e.message}`)] });
    }
    if (!track) return interaction.editReply({ embeds: [err('No results for that query.')] });

    const player = manager.getOrCreate(interaction.guild.id, interaction.channel);
    if (!player.connection) player.connect(voice);

    const wasIdle = !player.current;
    const res = await player.enqueue(track);
    if (!res.ok) {
      return interaction.editReply({ embeds: [err(res.reason === 'full' ? 'The queue is full.' : 'Could not queue that track.')] });
    }

    if (wasIdle) {
      const custom = commandEmbed('play', { title: track.title, url: track.url, duration: track.duration, requester: interaction.user.toString() });
      return interaction.editReply({ embeds: [custom || ok(`▶️ Playing **${track.title}** \`${track.duration}\``)] });
    }
    return interaction.editReply({ embeds: [info('➕ Added to queue', `**${track.title}** \`${track.duration}\`\nPosition: **${player.list().length}**`)] });
  },
};
