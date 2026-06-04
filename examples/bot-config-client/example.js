'use strict';

// Minimal demo of using the config client inside a sold bot.
// Run:  CONFIG_API_URL=http://localhost:8787 CONFIG_BOT_KEY=yourkey \
//       APP_ID=100000000000000001 node example.js
//
// In a real bot, pass client.application.id as appId after the bot is ready.
const { ConfigClient } = require('./configClient');

async function main() {
  const cfg = new ConfigClient({
    baseUrl: process.env.CONFIG_API_URL || 'http://localhost:8787',
    botKey: process.env.CONFIG_BOT_KEY || 'change-me',
    appId: process.env.APP_ID || '100000000000000001',
    intervalSec: 15,
  });

  await cfg.start();

  console.log('Prefix:', cfg.get('basics.prefix', '!'));
  console.log('Embed color:', cfg.get('basics.embedColor'));
  console.log('Moderation enabled:', cfg.isModuleEnabled('moderation'));
  console.log('Economy enabled:', cfg.isModuleEnabled('economy'));

  // React to live changes made in the dashboard.
  cfg.onChange((s) => {
    console.log('⚙ Config updated — new prefix:', s.basics.prefix);
  });

  console.log('Watching for changes… (edit settings in the dashboard to see updates)');
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
