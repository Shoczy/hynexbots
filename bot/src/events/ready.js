const { ActivityType } = require('discord.js');
const config = require('../config');
const launcher = require('../launcher/manager');
const store = require('../config-service/db');
const fleetStore = require('../fleet/store');
const { setHostedBots } = require('../fleet/hostedBots');
const health = require('../config-service/health');

/**
 * Build public profiles (name + avatar) for the hosted product bots so the
 * /status page can show which bots are live. Resolves each bot's Discord user
 * by its application id (cached by discord.js); falls back to the process name.
 */
async function refreshHostedBots(client) {
  const recs = launcher.statusList();
  const profiles = await Promise.all(
    recs.map(async (r) => {
      let name = r.name;
      let avatar = null;
      try {
        const user = await client.users.fetch(r.appId);
        name = user.username || name;
        avatar = user.displayAvatarURL({ size: 64, extension: 'png' });
      } catch {
        /* keep the process name + no avatar */
      }
      return { id: r.appId, name, avatar, type: r.type, online: launcher.isRunning(r.appId) };
    }),
  );
  setHostedBots(profiles);
}

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    console.log(`✔ ${config.brand.name} online as ${client.user.tag}`);
    client.user.setPresence({
      activities: [{ name: `${config.brand.name} • /panel`, type: ActivityType.Watching }],
      status: 'online',
    });

    // DM the owner when one of their hosted bots crash-loops and the launcher
    // gives up, so a dead bot doesn't fail silently.
    launcher.onCrash(async ({ appId, name, restarts, lastCode }) => {
      try {
        const bot = store.getBot(appId);
        if (!bot?.owner_id) return;
        const user = await client.users.fetch(bot.owner_id);
        await user.send(
          `⚠️ **${name || bot.name}** keeps crashing and has been stopped after ${restarts} restart attempts ` +
            `(last exit code ${lastCode}). Check the **Logs** tab in your dashboard, then use **Start** to bring it back online once the issue is fixed.`,
        );
      } catch (err) {
        console.error('Failed to notify owner of crash:', err?.message || err);
      }
    });

    // ── Downtime alerts ────────────────────────────────
    // Post node/bot up·down events to a staff channel (if configured) and DM the
    // affected bot's owner, so an outage is noticed without watching dashboards.
    async function postAlert(content) {
      if (!config.fleet.alertChannelId) return;
      try {
        const ch = await client.channels.fetch(config.fleet.alertChannelId);
        if (ch?.isTextBased?.()) await ch.send({ content, allowedMentions: { parse: [] } });
      } catch (err) {
        console.error('Failed to post fleet alert:', err?.message || err);
      }
    }

    // VPS node up/down → staff channel only (nodes aren't owned by a customer).
    fleetStore.onTransition(({ node, online }) => {
      postAlert(online ? `🟢 Node **${node}** has recovered.` : `🔴 Node **${node}** has gone **offline**.`);
    });

    // Customer bot up/down → staff channel + a DM to the bot's owner.
    health.onTransition(async ({ appId, online }) => {
      const bot = store.getBot(appId);
      const label = bot?.name || appId;
      postAlert(online ? `🟢 Bot **${label}** is back online.` : `🔴 Bot **${label}** appears to be **offline**.`);
      if (!bot?.owner_id) return;
      try {
        const user = await client.users.fetch(bot.owner_id);
        await user.send(
          online
            ? `🟢 Good news — your bot **${label}** is back online.`
            : `🔴 Heads up: your bot **${label}** has stopped responding and looks offline. ` +
                `Check the **Analytics** tab in your dashboard for its uptime and recent incidents.`,
        );
      } catch {
        /* owner has DMs closed — the channel alert still fired */
      }
    });

    // Start watching customer-bot heartbeats for outages.
    health.start();

    // Bring previously-registered managed bots back online (the config service
    // is already listening by now — started in index.js before login).
    launcher.relaunchAll().catch((err) => console.error('Relaunch failed:', err));

    // Publish hosted-bot profiles for the public /status page (after relaunch
    // settles), then refresh periodically so it tracks start/stop.
    setTimeout(() => refreshHostedBots(client).catch(() => {}), 8000);
    const hostedTimer = setInterval(() => refreshHostedBots(client).catch(() => {}), 60_000);
    if (hostedTimer.unref) hostedTimer.unref();
  },
};
