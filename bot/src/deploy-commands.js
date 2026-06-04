const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const config = require('./config');

if (!config.token || !config.clientId) {
  console.error('✖ DISCORD_TOKEN and CLIENT_ID are required in .env.');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  if (command.data) commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    console.log(`Deploying ${commands.length} command(s)…`);
    if (config.guildId) {
      // Guild commands update instantly — best for development & a single shop server.
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
      console.log(`✔ Deployed to guild ${config.guildId}.`);
    } else {
      // Global commands can take up to ~1h to propagate.
      await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
      console.log('✔ Deployed globally (may take up to 1 hour to appear).');
    }
  } catch (err) {
    console.error('Deploy failed:', err);
    process.exit(1);
  }
})();
