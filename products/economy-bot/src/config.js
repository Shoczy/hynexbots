'use strict';

require('dotenv').config();

const config = {
  token: process.env.DISCORD_TOKEN,
  api: {
    baseUrl: process.env.CONFIG_API_URL || 'http://localhost:8787',
    botKey: process.env.CONFIG_BOT_KEY || '',
    pollSec: Number(process.env.CONFIG_POLL_SEC || 30),
  },
};

module.exports = config;
