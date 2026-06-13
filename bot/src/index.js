const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const config = require('./config');
const { startFleetServer } = require('./fleet/server');
const { startBackupSchedule } = require('./backup');

if (!config.token) {
  console.error('✖ DISCORD_TOKEN is missing. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

// ── Guard against shipping insecure default secrets ──
// These default to "change-me" placeholders in config.js. Running with them in
// production would leave the fleet + dashboard APIs effectively unauthenticated.
const INSECURE = ['change-me', 'change-me-dashboard-key'];
const secretChecks = [
  ['FLEET_SECRET', config.fleet.secret],
  ['DASHBOARD_API_KEY', config.api.dashboardKey],
  ['CONFIG_BOT_KEY', config.api.botKey],
];
const weakSecrets = secretChecks.filter(([, v]) => !v || INSECURE.includes(v)).map(([k]) => k);
if (weakSecrets.length) {
  const msg = `Using insecure default secret(s): ${weakSecrets.join(', ')}. Set them in .env.`;
  if (process.env.NODE_ENV === 'production') {
    console.error(`✖ ${msg}`);
    process.exit(1);
  }
  console.warn(`⚠ ${msg}`);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers, // privileged — for the join welcome message
  ],
  partials: [Partials.Channel, Partials.GuildMember],
});

// ── Load slash commands ──────────────────────────────
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`⚠ Skipping ${file}: missing "data" or "execute".`);
  }
}

// ── Load event handlers ──────────────────────────────
const eventsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsPath).filter((f) => f.endsWith('.js'))) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// ── Start the fleet heartbeat server alongside the bot ──
startFleetServer(client);

// ── Nightly DB snapshots (immediate one on boot, then every 24h) ──
startBackupSchedule();

client.login(config.token);

process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
