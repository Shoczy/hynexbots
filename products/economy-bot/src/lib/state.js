'use strict';

const { defaultSettings } = require('./schema');

/** Process-wide holder for the live config, updated by the ConfigClient. */
const state = { settings: defaultSettings() };

function setSettings(next) {
  if (next && typeof next === 'object') state.settings = next;
}

function getSettings() {
  return state.settings;
}

/** Dot-path getter with fallback, e.g. cfg('basics.prefix', '!'). */
function cfg(path, fallback) {
  const v = path.split('.').reduce((acc, k) => (acc && k in acc ? acc[k] : undefined), state.settings);
  return v ?? fallback;
}

/** The economy settings section (always an object). */
function eco() {
  return state.settings.economy || defaultSettings().economy;
}

/** Format an amount with the configured currency symbol/name. */
function money(amount) {
  const e = eco();
  return `${e.currencySymbol || '🪙'} **${Number(amount).toLocaleString()}** ${e.currencyName || 'coins'}`;
}

module.exports = { setSettings, getSettings, cfg, eco, money };
