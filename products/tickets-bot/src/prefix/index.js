'use strict';

const { cfg } = require('../lib/state');
const { authorize, DENY_MESSAGE } = require('../lib/perms');
const { err, info } = require('../lib/embeds');
const manager = require('../lib/manager');

const ID_RE = /^(?:<@!?)?(\d{17,20})>?$/;
const KNOWN = new Set(['ticket', 'close', 'claim', 'add', 'remove', 'help', 'ping', 'serverinfo', 'userinfo', 'avatar']);

// Commands that require ticket staff (mirrors the slash flags).
const STAFF_ONLY = new Set(['add', 'remove']);

async function resolveUser(message, token) {
  const m = ID_RE.exec(token || '');
  if (!m) return null;
  return message.client.users.fetch(m[1]).catch(() => null);
}

const send = (message, embed) => message.channel.send({ embeds: [embed] }).catch(() => {});

/** Handle a prefix command. Returns true if recognised. */
async function handlePrefix(message) {
  if (!message.guild || message.author.bot || !message.member) return false;
  const prefix = cfg('basics.prefix', '!');
  if (!prefix || !message.content.startsWith(prefix)) return false;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const name = (args.shift() || '').toLowerCase();
  if (!KNOWN.has(name)) return false;

  const auth = authorize({ name, staffOnly: STAFF_ONLY.has(name) }, message.member);
  if (!auth.ok) {
    await send(message, err(DENY_MESSAGE[auth.reason] || 'Not allowed.'));
    return true;
  }

  const ctx = manager.ctxFromMessage(message);
  switch (name) {
    case 'ticket':
      await manager.openTicket(ctx);
      return true;
    case 'close':
      await manager.closeTicket(ctx);
      return true;
    case 'claim':
      await manager.claim(ctx);
      return true;
    case 'add': {
      const user = await resolveUser(message, args[0]);
      if (!user) return send(message, err('Usage: `add @user`')), true;
      const res = await manager.addUser(message.channel, user);
      return send(message, res.embed), true;
    }
    case 'remove': {
      const user = await resolveUser(message, args[0]);
      if (!user) return send(message, err('Usage: `remove @user`')), true;
      const res = await manager.removeUser(message.channel, user);
      return send(message, res.embed), true;
    }
    case 'help': {
      const e = info('🎫 Ticket Commands').addFields(
        { name: 'For everyone', value: `\`${prefix}ticket\` / \`/ticket\` — open a ticket` },
        { name: 'In a ticket', value: `\`${prefix}close\` \`${prefix}claim\` \`${prefix}add @user\` \`${prefix}remove @user\`` },
        { name: 'Utility', value: `\`${prefix}ping\` \`${prefix}serverinfo\` \`${prefix}userinfo\` \`${prefix}avatar\`` },
      );
      return send(message, e), true;
    }
    case 'ping':
      return send(message, info('🏓 Pong', `**WebSocket:** ${Math.round(message.client.ws.ping)}ms`)), true;
    case 'serverinfo': {
      const g = message.guild;
      return send(message, info(g.name).addFields(
        { name: 'Owner', value: `<@${g.ownerId}>`, inline: true },
        { name: 'Members', value: String(g.memberCount), inline: true },
        { name: 'Created', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`, inline: true },
      )), true;
    }
    case 'userinfo': {
      const user = (await resolveUser(message, args[0])) || message.author;
      const member = message.guild.members.cache.get(user.id);
      const e = info(user.tag).setThumbnail(user.displayAvatarURL({ size: 256 })).addFields(
        { name: 'ID', value: user.id, inline: true },
        { name: 'Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
      );
      if (member?.joinedTimestamp) e.addFields({ name: 'Joined', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true });
      return send(message, e), true;
    }
    case 'avatar': {
      const user = (await resolveUser(message, args[0])) || message.author;
      return send(message, info(`${user.username}'s avatar`).setImage(user.displayAvatarURL({ size: 1024 }))), true;
    }
    default:
      return false;
  }
}

module.exports = { handlePrefix };
