'use strict';

const { Events } = require('discord.js');
const config = require('../config');
const { ConfigClient } = require('../lib/configClient');
const { setSettings, cfg } = require('../lib/state');
const { buildMessagePayload } = require('../lib/messages');
const statusBoard = require('../fivem/statusBoard');
const restartScheduler = require('../fivem/restartScheduler');
const intake = require('../fivem/intake');
const monitor = require('../fivem/monitor');
const playtime = require('../fivem/playtime');
const application = require('../fivem/application');
const history = require('../fivem/history');
const announcements = require('../announcements');

/** Run a dashboard-dispatched action (see config-service DISPATCH_ACTIONS). */
async function runDashboardCommand(client, action, payload) {
  if (action === 'fivem_post_status') {
    await statusBoard.tick();
  } else if (action === 'fivem_announce_restart') {
    if (!cfg('fivem.restarts.channelId', '')) return;
    await restartScheduler.manualAnnounce(Math.max(0, Number(payload?.minutes) || 0));
  } else if (action === 'fivem_post_whitelist_panel') {
    const chId = cfg('fivem.whitelist.application.panelChannelId', '');
    const ch = chId ? await client.channels.fetch(chId).catch(() => null) : null;
    if (ch?.isTextBased?.()) await ch.send(application.panelPayload()).catch(() => {});
  } else if (action === 'welcome_test') {
    if (!cfg('modules.welcome', false)) return;
    const block = cfg('messages.welcome', null);
    const ch = block?.channelId ? await client.channels.fetch(block.channelId).catch(() => null) : null;
    if (!ch?.isTextBased?.()) return;
    const member = { id: client.user.id, user: client.user, displayName: client.user.username, guild: ch.guild };
    const out = buildMessagePayload(block, member);
    if (out) await ch.send(out).catch(() => {});
  }
}

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
    monitor.start(client);
    playtime.start();
    history.start();
    announcements.start(client);

    // Execute actions the customer triggers from the dashboard (post status,
    // announce a restart, …) without needing to run a slash command.
    configClient.startCommands((action, payload) => runDashboardCommand(client, action, payload));

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
