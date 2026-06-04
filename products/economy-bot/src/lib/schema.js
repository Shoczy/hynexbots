'use strict';

/**
 * Local fallback schema — mirrors the economy-relevant slice of the main
 * service's defaultSettings() (bot/src/config-service/db.js).
 */
function defaultSettings() {
  return {
    basics: { prefix: '!', embedColor: '#6366f1', nickname: '', language: 'en', logChannelId: '' },
    modules: { economy: true },
    commands: {}, // { [name]: { enabled, roles[] } }
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
