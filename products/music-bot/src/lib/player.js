'use strict';

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  StreamType,
} = require('@discordjs/voice');
const prism = require('prism-media');
const sources = require('./sources');
const { music } = require('./state');
const { make, info } = require('./embeds');
const { commandEmbed } = require('./commandEmbed');

// Point prism/ffmpeg at the bundled static binary.
try {
  process.env.FFMPEG_PATH = process.env.FFMPEG_PATH || require('ffmpeg-static');
} catch {
  /* ffmpeg-static missing — prism will look on PATH */
}

// ffmpeg -af presets for /filter (only used when music.allowFilters is on).
const FILTERS = {
  none: '',
  bassboost: 'bass=g=15',
  nightcore: 'aresample=48000,asetrate=48000*1.25',
  vaporwave: 'aresample=48000,asetrate=48000*0.85',
  treble: 'treble=g=10',
  '8d': 'apulsator=hz=0.09',
};
const FILTER_NAMES = Object.keys(FILTERS);

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** The premium "now playing" card, shared by the announcer and /nowplaying. */
function nowPlayingCard(track, player) {
  const custom = commandEmbed('nowplaying', { title: track.title, url: track.url, duration: track.duration, requester: track.requestedBy || '' });
  if (custom) return custom;
  return make({
    author: { name: 'Now Playing' },
    title: track.title,
    url: track.url,
    thumbnail: track.thumbnail || undefined,
    fields: [
      { name: 'Duration', value: `\`${track.duration}\``, inline: true },
      track.requestedBy ? { name: 'Requested by', value: track.requestedBy, inline: true } : null,
      player ? { name: 'Volume', value: `${player.volume}%${player.filter !== 'none' ? ` · ${player.filter}` : ''}`, inline: true } : null,
    ].filter(Boolean),
  });
}

const players = new Map(); // guildId -> GuildPlayer

class GuildPlayer {
  constructor(guildId, textChannel) {
    this.guildId = guildId;
    this.textChannel = textChannel;
    this.queue = [];
    this.current = null;
    this.volume = music().defaultVolume || 50;
    this.filter = 'none';
    this.resource = null;
    this.connection = null;
    this.destroyed = false;
    this._idleTimer = null;

    this.player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
    this.player.on(AudioPlayerStatus.Idle, () => this._advance());
    this.player.on('error', (e) => {
      console.error('Audio player error:', e.message);
      this._advance();
    });
  }

  connect(voiceChannel) {
    this.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: this.guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });
    this.connection.subscribe(this.player);
  }

  /** Add a track; starts playback if idle. Returns { ok, reason? }. */
  async enqueue(track) {
    const max = music().maxQueueLength || 100;
    if (this.queue.length >= max) return { ok: false, reason: 'full' };
    this.queue.push(track);
    if (!this.current) await this._advance();
    return { ok: true };
  }

  async _advance() {
    clearTimeout(this._idleTimer);
    const next = this.queue.shift();
    if (!next) {
      this.current = null;
      this._scheduleLeave();
      return;
    }
    this.current = next;
    try {
      this.resource = await this._buildResource(next);
      this.player.play(this.resource);
      this._announce(next);
    } catch (e) {
      console.error('Failed to play track:', e.message);
      if (this.textChannel) this.textChannel.send({ embeds: [info('⚠️ Skipped', `Couldn't play **${next.title}** — ${e.message}`)] }).catch(() => {});
      await this._advance();
    }
  }

  async _buildResource(track) {
    const src = await sources.open(track.url);
    const af = music().allowFilters ? FILTERS[this.filter] : '';
    let resource;
    if (af) {
      const ffmpeg = new prism.FFmpeg({
        args: ['-analyzeduration', '0', '-loglevel', '0', '-i', 'pipe:0', '-f', 's16le', '-ar', '48000', '-ac', '2', '-af', af],
      });
      src.stream.pipe(ffmpeg);
      resource = createAudioResource(ffmpeg, { inputType: StreamType.Raw, inlineVolume: true });
    } else {
      resource = createAudioResource(src.stream, { inputType: src.type, inlineVolume: true });
    }
    resource.volume?.setVolume(this.volume / 100);
    return resource;
  }

  skip() {
    this.player.stop(true); // → Idle → _advance
  }

  stop() {
    this.queue = [];
    this.player.stop(true);
  }

  pause() {
    return this.player.pause();
  }

  resume() {
    return this.player.unpause();
  }

  setVolume(v) {
    this.volume = clamp(Math.round(v), 0, 200);
    this.resource?.volume?.setVolume(this.volume / 100);
    return this.volume;
  }

  setFilter(name) {
    if (FILTERS[name] === undefined) return false;
    this.filter = name;
    return true;
  }

  _announce(track) {
    if (!music().announceNowPlaying || !this.textChannel) return;
    this.textChannel.send({ embeds: [nowPlayingCard(track, this)] }).catch(() => {});
  }

  _scheduleLeave() {
    const sec = music().autoLeaveSec || 0;
    if (!sec) return;
    clearTimeout(this._idleTimer);
    this._idleTimer = setTimeout(() => this.destroy(), sec * 1000);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    clearTimeout(this._idleTimer);
    try {
      this.player.stop(true);
    } catch {
      /* ignore */
    }
    try {
      this.connection?.destroy();
    } catch {
      /* ignore */
    }
    players.delete(this.guildId);
  }
}

const manager = {
  get: (guildId) => players.get(guildId),
  getOrCreate(guildId, textChannel) {
    let p = players.get(guildId);
    if (!p) {
      p = new GuildPlayer(guildId, textChannel);
      players.set(guildId, p);
    } else if (textChannel) {
      p.textChannel = textChannel;
    }
    return p;
  },
  destroy(guildId) {
    players.get(guildId)?.destroy();
  },
};

module.exports = { manager, FILTER_NAMES, nowPlayingCard };
