'use strict';

/**
 * Local fallback schema — mirrors the economy-relevant slice of the main
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
    modules: { economy: true, leveling: false, giveaways: false, welcome: false },
    commands: {}, // { [name]: { enabled, roles[] } }
    messages: { welcome: messageBlock(), leave: messageBlock(), autoresponses: [], autoRoleIds: [] },
    giveaways: { managerRoleIds: [], requireRoleId: '' },
    leveling: {
      xpPerMessage: { min: 15, max: 25 },
      cooldownSec: 60,
      levelUp: { enabled: true, channelId: '', message: 'GG {user}, you reached level {level}! 🎉' },
      stackRewards: true,
      rewards: [],
      noXpRoleIds: [],
    },
    economy: {
      currencyName: 'coins',
      currencySymbol: '🪙',
      startingBalance: 100,
      daily: { enabled: true, amount: 250, streakBonus: 50 },
      work: { enabled: true, min: 50, max: 200, cooldownSec: 3600 },
      gambling: false,
      leaderboard: true,
      shop: [], // [{ id, name, price, roleId, description }]
    },
  };
}

module.exports = { defaultSettings };
