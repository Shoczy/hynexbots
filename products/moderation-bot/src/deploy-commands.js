'use strict';

// Registers this bot's slash commands with Discord.
//   npm run deploy            → global (can take up to 1h to appear)
//   DEV_GUILD_ID=... npm run deploy → instant, scoped to one test guild
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const config = require('./config');
const { commandInScope } = require('./lib/scope');

if (!config.token) {
  console.error('✖ DISCORD_TOKEN is missing. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const commands = [];
const dir = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js') && !f.startsWith('_'))) {
  const cmd = require(path.join(dir, file));
  if (cmd.data) commands.push(cmd.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(config.token);

/**
 * Fetch this bot's product scope from the config service so we only register the
 * commands its product (Security vs Community) actually ships. Falls back to all
 * commands when the service can't be reached, so deploys never silently break.
 */
async function scopeFor(appId) {
  if (!config.api.baseUrl || !config.api.botKey) return null;
  try {
    const res = await fetch(`${config.api.baseUrl}/api/bot/config?appId=${encodeURIComponent(appId)}`, {
      headers: { Authorization: `Bearer ${config.api.botKey}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.features && typeof data.features === 'object' ? data.features : null;
  } catch {
    return null;
  }
}

(async () => {
  // Derive the application id from the token (no extra env needed).
  const app = await rest.get(Routes.oauth2CurrentApplication());
  const features = await scopeFor(app.id);
  const body = features ? commands.filter((c) => commandInScope(c.name, features)) : commands;
  const guildId = process.env.DEV_GUILD_ID;
  const route = guildId ? Routes.applicationGuildCommands(app.id, guildId) : Routes.applicationCommands(app.id);
  const data = await rest.put(route, { body });
  console.log(`✔ Registered ${data.length} commands ${guildId ? `to guild ${guildId}` : 'globally'}.`);
})().catch((err) => {
  console.error('✖ Failed to deploy commands:', err);
  process.exit(1);
});
