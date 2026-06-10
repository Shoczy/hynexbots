'use strict';

const { defaultSettings } = require('./schema');

/**
 * Process-wide holder for the live config. The ConfigClient updates this on
 * every poll, so every handler reads the freshest settings without threading
 * the object through call sites. Falls back to schema defaults before the first
 * fetch (or if the service is briefly unreachable).
 */
const state = {
  settings: defaultSettings(),
};

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

/** The fivem settings section (always an object). */
function fivem() {
  return state.settings.fivem || defaultSettings().fivem;
}

module.exports = { setSettings, getSettings, cfg, fivem };
