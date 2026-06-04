'use strict';

/**
 * Local fallback schema — mirrors the music-relevant slice of the main
 * service's defaultSettings() (bot/src/config-service/db.js).
 */
function defaultSettings() {
  return {
    basics: { prefix: '!', embedColor: '#6366f1', nickname: '', language: 'en', logChannelId: '' },
    modules: { music: true },
    commands: {}, // { [name]: { enabled, roles[] } }
    music: {
      defaultVolume: 50,
      maxQueueLength: 100,
      djRoleIds: [],
      djOnly: false,
      autoLeaveSec: 60,
      allowFilters: true,
      announceNowPlaying: true,
    },
  };
}

module.exports = { defaultSettings };
