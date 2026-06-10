'use strict';

/**
 * Local fallback schema — mirrors the FiveM-relevant slice of the main service's
 * defaultSettings() (bot/src/config-service/db.js). Used before the first config
 * fetch and as a backstop if a field is ever missing, so handlers can read
 * settings without null-checking every path.
 *
 * The dashboard is the source of truth; this only needs to stay loosely in sync.
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
    modules: { fivem: true, welcome: false },
    commands: {}, // { [name]: { enabled, roles[] } }
    messages: { welcome: messageBlock(), leave: messageBlock(), autoresponses: [], autoRoleIds: [] },
    fivem: {
      server: { host: '', name: '' },
      status: { enabled: false, channelId: '', refreshSec: 60 },
      whitelist: { enabled: false, roleId: '', logChannelId: '' },
      reports: { enabled: false, channelId: '', pingRoleId: '' },
      restarts: { enabled: false, channelId: '', times: [], warnMinutes: [15, 5, 1] },
    },
  };
}

module.exports = { defaultSettings };
