'use strict';

const { Events } = require('discord.js');
const config = require('../config');
const { ConfigClient } = require('../lib/configClient');
const { setSettings, cfg } = require('../lib/state');

/** Debounced per-guild resync so a burst of role/channel edits = one sync. */
function makeSyncer(client) {
  const timers = new Map();
  return (guild) => {
    if (!guild || !client.cfg) return;
    clearTimeout(timers.get(guild.id));
    timers.set(
      guild.id,
      setTimeout(() => client.cfg.syncGuild(guild).catch(() => {}), 1500),
    );
  };
}

/** Apply the configured nickname to every guild (blank = clear). */
async function applyNickname(client) {
  const nick = cfg('basics.nickname', '');
  for (const guild of client.guilds.cache.values()) {
    try {
      await guild.members.me?.setNickname(nick || null);
    } catch {
      /* missing perms — ignore */
    }
  }
}

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    const appId = client.application.id;

    // Wire the live config client. setSettings() updates the shared state every poll.
    const configClient = new ConfigClient({
      baseUrl: config.api.baseUrl,
      botKey: config.api.botKey,
      appId,
      intervalSec: config.api.pollSec,
    });
    client.cfg = configClient;

    try {
      const first = await configClient.start();
      setSettings(first);
      console.log('✔ Loaded config from', config.api.baseUrl);
    } catch (err) {
      console.warn('⚠ Could not reach the config service yet — using defaults until it\'s up.', err.message);
    }

    let nickTimer = null;
    configClient.onChange((next) => {
      setSettings(next);
      console.log('⚙ Config updated from dashboard.');
      // Re-apply nickname (debounced) when basics change.
      clearTimeout(nickTimer);
      nickTimer = setTimeout(() => applyNickname(client), 500);
    });

    await applyNickname(client);

    // Report each guild's roles & channels so the dashboard shows real pick-lists.
    for (const guild of client.guilds.cache.values()) {
      configClient.syncGuild(guild).catch(() => {});
    }

    // Keep those pick-lists fresh as the server's structure changes.
    const resync = makeSyncer(client);
    for (const ev of ['roleCreate', 'roleDelete', 'roleUpdate']) {
      client.on(ev, (role) => resync(role.guild));
    }
    for (const ev of ['channelCreate', 'channelDelete', 'channelUpdate']) {
      client.on(ev, (ch) => resync(ch.guild));
    }
    client.on(Events.GuildCreate, (guild) => {
      resync(guild);
      guild.members.me?.setNickname(cfg('basics.nickname', '') || null).catch(() => {});
    });

    console.log(`✔ Hynex Tickets bot online as ${client.user.tag} (app ${appId}) in ${client.guilds.cache.size} server(s).`);
  },
};
