'use strict';

/**
 * Local fallback schema — mirrors the music-relevant slice of the main
 * service's defaultSettings() (bot/src/config-service/db.js).
 */
function messageBlock() {
  return {
    enabled: false,
    channelId: '',
    text: '',
    embed: { enabled: false, title: '', description: '', color: '#6366f1', image: '', footer: '' },
  };
}

function defaultSettings() {
  return {
    basics: { prefix: '!', embedColor: '#6366f1', nickname: '', language: 'en', logChannelId: '' },
    modules: { music: true, playlists: false, leveling: false, welcome: false },
    commands: {}, // { [name]: { enabled, roles[] } }
    messages: { welcome: messageBlock(), leave: messageBlock(), autoresponses: [], autoRoleIds: [] },
    playlists: { djOnly: false, maxPerGuild: 25 },
    leveling: {
      xpPerMessage: { min: 15, max: 25 },
      cooldownSec: 60,
      levelUp: { enabled: true, channelId: '', message: 'GG {user}, you reached level {level}! 🎉' },
      stackRewards: true,
      rewards: [],
      noXpRoleIds: [],
    },
    music: {
      defaultVolume: 50,
      maxQueueLength: 100,
      maxTrackMinutes: 0,
      djRoleIds: [],
      djOnly: false,
      voteSkip: { enabled: false, percent: 50 },
      autoLeaveSec: 60,
      stay247: false,
      allowFilters: true,
      announceNowPlaying: true,
    },
  };
}

module.exports = { defaultSettings };
