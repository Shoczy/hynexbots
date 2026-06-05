const { ActivityType } = require('discord.js');
const config = require('../config');
const launcher = require('../launcher/manager');
const store = require('../config-service/db');

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

    // Bring previously-registered managed bots back online (the config service
    // is already listening by now — started in index.js before login).
    launcher.relaunchAll().catch((err) => console.error('Relaunch failed:', err));
  },
};
