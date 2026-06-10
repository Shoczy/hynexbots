'use strict';

require('dotenv').config();

const config = {
  token: process.env.DISCORD_TOKEN,
  api: {
    baseUrl: process.env.CONFIG_API_URL || 'http://localhost:8787',
    botKey: process.env.CONFIG_BOT_KEY || '',
    pollSec: Number(process.env.CONFIG_POLL_SEC || 30),
  },
  // Optional HTTP intake for in-game reports + whitelist checks. Disabled when
  // no port is set (the Discord-side features don't need it).
  ingress: {
    port: Number(process.env.FIVEM_INGRESS_PORT || 0),
    secret: process.env.FIVEM_INGRESS_SECRET || '',
  },
};

module.exports = config;
