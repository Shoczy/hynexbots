'use strict';

const { Events } = require('discord.js');
const config = require('../config');
const { ConfigClient } = require('../lib/configClient');
const { setSettings, cfg } = require('../lib/state');
const statusBoard = require('../fivem/statusBoard');
const restartScheduler = require('../fivem/restartScheduler');
const intake = require('../fivem/intake');

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

    // Boot the FiveM subsystems (each is a no-op until its module is enabled).
    statusBoard.start(client);
    restartScheduler.start(client);
    intake.start(client);

    let nickTimer = null;
    let lastRefreshSec = cfg('fivem.status.refreshSec', 60);
    configClient.onChange((next) => {
      setSettings(next);
      console.log('⚙ Config updated from dashboard.');
      clearTimeout(nickTimer);
      nickTimer = setTimeout(() => applyNickname(client), 500);
      // Re-time the status board if the refresh interval changed; refresh now either way.
      const refreshSec = cfg('fivem.status.refreshSec', 60);
      if (refreshSec !== lastRefreshSec) {
        lastRefreshSec = refreshSec;
        statusBoard.reschedule();
      }
      statusBoard.tick().catch(() => {});
    });

    await applyNickname(client);

    for (const guild of client.guilds.cache.values()) {
      configClient.syncGuild(guild).catch(() => {});
    }

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

    console.log(`✔ Hynex FiveM bot online as ${client.user.tag} (app ${appId}) in ${client.guilds.cache.size} server(s).`);
  },
};
