'use strict';

const { Events } = require('discord.js');
const antinuke = require('../antinuke');

module.exports = {
  name: Events.GuildRoleDelete,
  async execute(role) {
    try {
      await antinuke.onRoleDelete(role);
    } catch (e) {
      console.error('roleDelete handler error:', e);
    }
  },
};
