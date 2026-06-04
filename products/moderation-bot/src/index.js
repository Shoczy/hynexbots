'use strict';

const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const config = require('./config');

if (!config.token) {
  console.error('✖ DISCORD_TOKEN is missing. Copy .env.example to .env and fill it in.');
  process.exit(1);
}
if (!config.api.botKey) {
  console.error('✖ CONFIG_BOT_KEY is missing — the bot can\'t reach the Hynex config service. Fill in .env.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // privileged — for auto-mod & prefix commands
    GatewayIntentBits.GuildMembers, // privileged — for anti-raid & join/leave logs
    GatewayIntentBits.GuildModeration, // for ban logs
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember, Partials.User],
});

// ── Load slash commands ──────────────────────────────
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js') && !f.startsWith('_'))) {
  const command = require(path.join(commandsPath, file));
  if (command.data && command.execute) client.commands.set(command.data.name, command);
}

// ── Load event handlers ──────────────────────────────
const eventsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsPath).filter((f) => f.endsWith('.js'))) {
  const event = require(path.join(eventsPath, file));
  if (event.once) client.once(event.name, (...args) => event.execute(...args, client));
  else client.on(event.name, (...args) => event.execute(...args, client));
}

client.login(config.token);

process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
