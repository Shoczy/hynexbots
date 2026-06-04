'use strict';

const { Events } = require('discord.js');
const { logEvent } = require('../lib/log');
const { info } = require('../lib/embeds');

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    // Nickname change
    if (oldMember.nickname !== newMember.nickname) {
      await logEvent(
        newMember.guild,
        'nicknameChange',
        info('✏️ Nickname Changed', `**User:** ${newMember.user.tag}\n**Before:** ${oldMember.nickname || '*(none)*'}\n**After:** ${newMember.nickname || '*(none)*'}`),
      );
    }

    // Role change
    const before = oldMember.roles.cache;
    const after = newMember.roles.cache;
    const added = after.filter((r) => !before.has(r.id)).map((r) => `<@&${r.id}>`);
    const removed = before.filter((r) => !after.has(r.id)).map((r) => `<@&${r.id}>`);
    if (added.length || removed.length) {
      const parts = [];
      if (added.length) parts.push(`**Added:** ${added.join(', ')}`);
      if (removed.length) parts.push(`**Removed:** ${removed.join(', ')}`);
      await logEvent(
        newMember.guild,
        'roleChange',
        info('🎭 Roles Updated', `**User:** ${newMember.user.tag}\n${parts.join('\n')}`),
      );
    }
  },
};
