const { ActivityType } = require('discord.js');
const config = require('../config');
const launcher = require('../launcher/manager');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    console.log(`✔ ${config.brand.name} online as ${client.user.tag}`);
    client.user.setPresence({
      activities: [{ name: `${config.brand.name} • /panel`, type: ActivityType.Watching }],
      status: 'online',
    });

    // Bring previously-registered managed bots back online (the config service
    // is already listening by now — started in index.js before login).
    launcher.relaunchAll().catch((err) => console.error('Relaunch failed:', err));
  },
};
