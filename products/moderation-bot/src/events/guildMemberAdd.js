'use strict';

const { Events } = require('discord.js');
const { handleMemberAdd } = require('../antiraid');
const { logEvent } = require('../lib/log');
const { info } = require('../lib/embeds');
const { cfg } = require('../lib/state');
const { buildMessagePayload } = require('../lib/messages');

/** Welcome module: assign auto-roles and post the welcome message on join. */
async function handleWelcome(member) {
  if (!cfg('modules.welcome', false)) return;

  // Auto-roles.
  const autoRoleIds = cfg('messages.autoRoleIds', []) || [];
  for (const id of autoRoleIds) {
    try {
      await member.roles.add(id, 'Auto-role on join');
    } catch {
      /* role above the bot or missing perms — skip */
    }
  }

  // Welcome message.
  const block = cfg('messages.welcome', null);
  const payload = buildMessagePayload(block, member);
  if (payload && block.channelId) {
    const ch = member.guild.channels.cache.get(block.channelId);
    if (ch?.isTextBased?.()) {
      try {
        await ch.send(payload);
      } catch {
        /* missing perms — ignore */
      }
    }
  }
}

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    try {
      const acted = await handleMemberAdd(member);
      if (acted) return; // anti-raid removed them — skip welcome + the normal join log

      await handleWelcome(member);

      await logEvent(
        member.guild,
        'memberJoinLeave',
        info('📥 Member Joined', `${member.user.tag} (\`${member.id}\`)\nAccount created <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`),
      );
    } catch (e) {
      console.error('guildMemberAdd handler error:', e);
    }
  },
};
