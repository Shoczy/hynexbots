'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { manager } = require('../lib/player');
const playlists = require('../lib/playlists');
const { cfg } = require('../lib/state');
const { isDJ } = require('../lib/perms');
const { ok, err, warn, info } = require('../lib/embeds');

const cleanName = (s) => String(s || '').trim().slice(0, 60);

module.exports = {
  name: 'playlist',
  data: new SlashCommandBuilder()
    .setName('playlist')
    .setDescription('Save and load playlists.')
    .addSubcommand((s) =>
      s.setName('save').setDescription('Save the current queue as a playlist').addStringOption((o) => o.setName('name').setDescription('Playlist name').setRequired(true)),
    )
    .addSubcommand((s) =>
      s.setName('load').setDescription('Queue up a saved playlist').addStringOption((o) => o.setName('name').setDescription('Playlist name').setRequired(true)),
    )
    .addSubcommand((s) => s.setName('list').setDescription('List saved playlists'))
    .addSubcommand((s) =>
      s.setName('delete').setDescription('Delete a saved playlist').addStringOption((o) => o.setName('name').setDescription('Playlist name').setRequired(true)),
    ),

  async execute(interaction) {
    if (!cfg('modules.playlists', false)) {
      return interaction.reply({ embeds: [warn('The Playlists module is off — enable it in the dashboard.')], ephemeral: true });
    }
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;
    const djOnly = Boolean(cfg('playlists.djOnly', false));
    const manage = !djOnly || isDJ(interaction.member);

    if (sub === 'list') {
      const rows = playlists.list(gid);
      if (!rows.length) return interaction.reply({ embeds: [info('📚 Playlists', 'No saved playlists yet.')], ephemeral: true });
      const lines = rows.map((p) => `• **${p.name}** — ${p.count} track${p.count === 1 ? '' : 's'}`);
      return interaction.reply({ embeds: [info('📚 Saved playlists').setDescription(lines.join('\n'))], ephemeral: true });
    }

    if (sub === 'save') {
      if (!manage) return interaction.reply({ embeds: [err('Only DJs can save playlists here.')], ephemeral: true });
      const name = cleanName(interaction.options.getString('name'));
      if (!name) return interaction.reply({ embeds: [err('Give the playlist a name.')], ephemeral: true });

      const player = manager.get(gid);
      const live = [];
      if (player) {
        if (player.current) live.push(player.current);
        live.push(...player.queue);
      }
      if (!live.length) return interaction.reply({ embeds: [err('Nothing is playing — queue some tracks first.')], ephemeral: true });

      const max = Number(cfg('playlists.maxPerGuild', 25));
      if (!playlists.exists(gid, name) && playlists.count(gid) >= max) {
        return interaction.reply({ embeds: [err(`This server has reached its ${max}-playlist limit.`)], ephemeral: true });
      }
      const tracks = live.map((t) => ({ title: t.title, url: t.url, duration: t.duration, durationSec: t.durationSec }));
      playlists.save(gid, name, tracks);
      return interaction.reply({ embeds: [ok(`Saved **${name}** with ${tracks.length} track${tracks.length === 1 ? '' : 's'}.`)], ephemeral: true });
    }

    if (sub === 'delete') {
      if (!manage) return interaction.reply({ embeds: [err('Only DJs can delete playlists here.')], ephemeral: true });
      const name = cleanName(interaction.options.getString('name'));
      const removed = playlists.remove(gid, name);
      return interaction.reply({ embeds: [removed ? ok(`Deleted **${name}**.`) : warn(`No playlist named **${name}**.`)], ephemeral: true });
    }

    // load
    const name = cleanName(interaction.options.getString('name'));
    const stored = playlists.get(gid, name);
    if (!stored || !stored.length) return interaction.reply({ embeds: [err(`No playlist named **${name}**.`)], ephemeral: true });

    const voice = interaction.member.voice?.channel;
    if (!voice) return interaction.reply({ embeds: [err('Join a voice channel first.')], ephemeral: true });
    const me = interaction.guild.members.me;
    const perms = voice.permissionsFor(me);
    if (!perms?.has(PermissionFlagsBits.Connect) || !perms?.has(PermissionFlagsBits.Speak)) {
      return interaction.reply({ embeds: [err('I need permission to **Connect** and **Speak** in that channel.')], ephemeral: true });
    }

    await interaction.deferReply();
    const player = manager.getOrCreate(gid, interaction.channel);
    if (!player.connection) player.connect(voice);

    let added = 0;
    for (const t of stored) {
      const res = await player.enqueue({ ...t, requestedBy: interaction.user.toString() });
      if (!res.ok) break; // queue full
      added += 1;
    }
    return interaction.editReply({ embeds: [ok(`Loaded **${name}** — queued ${added} of ${stored.length} track${stored.length === 1 ? '' : 's'}.`)] });
  },
};
