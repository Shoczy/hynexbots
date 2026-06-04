'use strict';

const { PermissionFlagsBits } = require('discord.js');
const { cfg } = require('../lib/state');
const { authorize, DENY_MESSAGE } = require('../lib/perms');
const { ok, err, info } = require('../lib/embeds');
const { manager, nowPlayingCard } = require('../lib/player');
const sources = require('../lib/sources');

const KNOWN = new Set(['play', 'p', 'skip', 's', 'stop', 'queue', 'q', 'volume', 'vol', 'pause', 'resume', 'nowplaying', 'np', 'help', 'ping']);
const ALIAS = { p: 'play', s: 'skip', q: 'queue', vol: 'volume', np: 'nowplaying' };
const DJ_CONTROL = new Set(['skip', 'stop', 'volume', 'pause', 'resume']);

const send = (message, embed) => message.channel.send({ embeds: [embed] }).catch(() => {});

/** Handle a prefix command. Returns true if recognised. */
async function handlePrefix(message) {
  if (!message.guild || message.author.bot || !message.member) return false;
  const prefix = cfg('basics.prefix', '!');
  if (!prefix || !message.content.startsWith(prefix)) return false;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  let name = (args.shift() || '').toLowerCase();
  if (!KNOWN.has(name)) return false;
  name = ALIAS[name] || name;

  const auth = authorize({ name, djControl: DJ_CONTROL.has(name) }, message.member);
  if (!auth.ok) {
    await send(message, err(DENY_MESSAGE[auth.reason] || 'Not allowed.'));
    return true;
  }

  const guild = message.guild;
  switch (name) {
    case 'play': {
      const query = args.join(' ');
      if (!query) return send(message, err(`Usage: \`${prefix}play <url or search>\``)), true;
      const voice = message.member.voice?.channel;
      if (!voice) return send(message, err('Join a voice channel first.')), true;
      const me = guild.members.me;
      const perms = voice.permissionsFor(me);
      if (!perms?.has(PermissionFlagsBits.Connect) || !perms?.has(PermissionFlagsBits.Speak)) {
        return send(message, err('I need permission to **Connect** and **Speak** in that channel.')), true;
      }
      let track;
      try {
        track = await sources.resolve(query, message.author.toString());
      } catch (e) {
        return send(message, err(`Search failed: ${e.message}`)), true;
      }
      if (!track) return send(message, err('No results.')), true;
      const player = manager.getOrCreate(guild.id, message.channel);
      if (!player.connection) player.connect(voice);
      const wasIdle = !player.current;
      const res = await player.enqueue(track);
      if (!res.ok) return send(message, err(res.reason === 'full' ? 'The queue is full.' : 'Could not queue that.')), true;
      return send(message, wasIdle ? ok(`▶️ Playing **${track.title}** \`${track.duration}\``) : info('➕ Added', `**${track.title}** \`${track.duration}\``)), true;
    }
    case 'skip': {
      const player = manager.get(guild.id);
      if (!player || !player.current) return send(message, err('Nothing is playing.')), true;
      const title = player.current.title;
      player.skip();
      return send(message, ok(`⏭️ Skipped **${title}**.`)), true;
    }
    case 'stop': {
      const player = manager.get(guild.id);
      if (!player) return send(message, err('Nothing is playing.')), true;
      player.stop();
      player.destroy();
      return send(message, ok('⏹️ Stopped and left.')), true;
    }
    case 'queue': {
      const player = manager.get(guild.id);
      if (!player || !player.current) return send(message, err('Nothing is playing.')), true;
      const up = player.list();
      const lines = up.slice(0, 10).map((t, i) => `**${i + 1}.** ${t.title} \`${t.duration}\``);
      const more = up.length > 10 ? `\n…and **${up.length - 10}** more` : '';
      return send(message, info('🎵 Queue', `**Now:** ${player.current.title}\n\n${lines.join('\n') || '*empty*'}${more}`)), true;
    }
    case 'volume': {
      const player = manager.get(guild.id);
      if (!player) return send(message, err('Nothing is playing.')), true;
      const pct = parseInt(args[0], 10);
      if (!Number.isFinite(pct)) return send(message, info('🔊 Volume', `Currently **${player.volume}%**.`)), true;
      return send(message, ok(`🔊 Volume set to **${player.setVolume(pct)}%**.`)), true;
    }
    case 'pause': {
      const player = manager.get(guild.id);
      if (!player || !player.current) return send(message, err('Nothing is playing.')), true;
      player.pause();
      return send(message, ok('⏸️ Paused.')), true;
    }
    case 'resume': {
      const player = manager.get(guild.id);
      if (!player || !player.current) return send(message, err('Nothing is playing.')), true;
      player.resume();
      return send(message, ok('▶️ Resumed.')), true;
    }
    case 'nowplaying': {
      const player = manager.get(guild.id);
      if (!player || !player.current) return send(message, err('Nothing is playing.')), true;
      return send(message, nowPlayingCard(player.current, player)), true;
    }
    case 'help': {
      const e = info('🎵 Music Commands').addFields(
        { name: 'Playback', value: `\`${prefix}play\` \`${prefix}pause\` \`${prefix}resume\` \`${prefix}skip\` \`${prefix}stop\`` },
        { name: 'Info', value: `\`${prefix}queue\` \`${prefix}nowplaying\` \`${prefix}volume\`` },
        { name: 'Slash', value: 'All of these also work as `/` commands (plus `/filter`).' },
      );
      return send(message, e), true;
    }
    case 'ping':
      return send(message, info('🏓 Pong', `**WebSocket:** ${Math.round(message.client.ws.ping)}ms`)), true;
    default:
      return false;
  }
}

module.exports = { handlePrefix };
