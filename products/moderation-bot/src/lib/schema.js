'use strict';

/**
 * Local fallback schema — mirrors the moderation-relevant slice of the main
 * service's defaultSettings() (bot/src/config-service/db.js). Used before the
 * first successful config fetch and as a backstop if a field is ever missing,
 * so handlers can read settings without null-checking every path.
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
    modules: {
      moderation: true,
      verification: false,
      antinuke: false,
      welcome: false,
    },
    commands: {}, // { [name]: { enabled, roles[] } }
    messages: { welcome: messageBlock(), leave: messageBlock(), autoresponses: [], autoRoleIds: [] },
    verification: {
      channelId: '',
      roleId: '',
      title: 'Verify to continue',
      description: 'Click the button below to confirm you’re human and unlock the server.',
      buttonLabel: 'Verify',
      successMessage: 'You’re verified — welcome aboard! 🎉',
    },
    antiNuke: {
      punishment: 'strip',
      limits: {
        channelDelete: { enabled: true, max: 3, perSeconds: 30 },
        roleDelete: { enabled: true, max: 3, perSeconds: 30 },
        ban: { enabled: true, max: 5, perSeconds: 30 },
        kick: { enabled: true, max: 5, perSeconds: 30 },
      },
      whitelistUserIds: [],
      whitelistRoleIds: [],
      alertChannelId: '',
    },
    moderation: {
      automod: {
        enabled: false,
        antiSpam: { enabled: false, maxMessages: 5, intervalSec: 5 },
        antiInvites: false,
        antiLinks: false,
        massMention: { enabled: false, threshold: 5 },
        capsFilter: { enabled: false, percent: 70 },
        bannedWords: { enabled: false, words: [] },
      },
      antiRaid: {
        enabled: false,
        minAccountAgeDays: 0,
        joinRate: { enabled: false, joins: 10, perSeconds: 10 },
      },
      warnings: { expireDays: 0, escalations: [] },
      logging: {
        channelId: '',
        events: {
          memberJoinLeave: false,
          messageDelete: false,
          messageEdit: false,
          banKick: false,
          roleChange: false,
          nicknameChange: false,
        },
      },
      roles: { muteRoleId: '', modRoleIds: [] },
    },
  };
}

module.exports = { defaultSettings };
