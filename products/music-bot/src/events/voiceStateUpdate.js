'use strict';

const { Events } = require('discord.js');
const { manager } = require('../lib/player');
const { music } = require('../lib/state');

/**
 * Auto-leave when the bot is left alone in its voice channel. Respects
 * music.autoLeaveSec (0 = never leave for being alone).
 */
module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const guild = oldState.guild || newState.guild;
    const player = manager.get(guild.id);
    if (!player || !player.connection) return;

    const me = guild.members.me;
    const myChannel = me?.voice?.channel;
    if (!myChannel) return;

    const others = myChannel.members.filter((m) => !m.user.bot).size;
    const sec = music().autoLeaveSec || 0;
    if (others === 0 && sec > 0) {
      clearTimeout(player._aloneTimer);
      player._aloneTimer = setTimeout(() => {
        const still = me.voice?.channel?.members.filter((m) => !m.user.bot).size || 0;
        if (still === 0) player.destroy();
      }, sec * 1000);
    } else {
      clearTimeout(player._aloneTimer);
    }
  },
};
