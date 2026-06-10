'use strict';

const { PermissionFlagsBits } = require('discord.js');
const { cfg, fivem } = require('../lib/state');
const { authorize, DENY_MESSAGE } = require('../lib/perms');
const { info, err, ok } = require('../lib/embeds');
const { queryServer } = require('../lib/fivem');
const { statusEmbed, playersEmbed } = require('../lib/render');
const whitelist = require('../lib/whitelist');

// Native permission each privileged prefix command requires (mirrors the slash twins).
const REQUIRED_PERM = {
  whitelist: PermissionFlagsBits.ManageRoles,
  restart: PermissionFlagsBits.ManageGuild,
};

const KNOWN = new Set(['status', 'players', 'whitelist', 'restart', 'help', 'ping', 'serverinfo', 'userinfo', 'avatar']);
const ID_RE = /^(?:<@!?)?(\d{17,20})>?$/;

const send = (message, embed) => message.channel.send({ embeds: [embed] }).catch(() => {});

async function resolveMember(message, token) {
  const m = ID_RE.exec(token || '');
  if (!m) return null;
  return message.guild.members.fetch(m[1]).catch(() => null);
}

/** Handle a prefix command. Returns true if a command was recognised. */
async function handlePrefix(message) {
  if (!message.guild || message.author.bot || !message.member) return false;
  const prefix = cfg('basics.prefix', '!');
  if (!prefix || !message.content.startsWith(prefix)) return false;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const name = (args.shift() || '').toLowerCase();
  if (!name || !KNOWN.has(name)) return false;

  const auth = authorize({ name, requiredPerm: REQUIRED_PERM[name] }, message.member);
  if (!auth.ok) {
    await send(message, err(DENY_MESSAGE[auth.reason] || 'Not allowed.'));
    return true;
  }
  message.client.cfg?.recordCommand(name);

  switch (name) {
    case 'status': {
      const snapshot = await queryServer(fivem().server.host);
      return send(message, statusEmbed(snapshot, fivem().server.name)), true;
    }
    case 'players': {
      const snapshot = await queryServer(fivem().server.host);
      return send(message, playersEmbed(snapshot, fivem().server.name)), true;
    }
    case 'whitelist': {
      const sub = (args.shift() || '').toLowerCase();
      if (sub === 'list') return send(message, whitelist.listEmbed(message.guild)), true;
      if (sub !== 'add' && sub !== 'remove') {
        return send(message, info('Usage', `\`${prefix}whitelist add @user [identifier]\`\n\`${prefix}whitelist remove @user\`\n\`${prefix}whitelist list\``)), true;
      }
      const member = await resolveMember(message, args[0]);
      if (!member) return send(message, err(`Usage: \`${prefix}whitelist ${sub} @user\``)), true;
      const result =
        sub === 'add'
          ? await whitelist.add(message.guild, member, args[1] || '', message.author)
          : await whitelist.remove(message.guild, member, message.author);
      return send(message, result.embed), true;
    }
    case 'restart': {
      const rs = fivem().restarts;
      if (!rs.channelId) return send(message, err('No announcement channel is set — configure it in your dashboard.')), true;
      const channel = await message.client.channels.fetch(rs.channelId).catch(() => null);
      if (!channel?.isTextBased?.()) return send(message, err('The configured announcement channel is unavailable.')), true;
      const mins = parseInt(args[0], 10);
      const name2 = fivem().server.name || 'The server';
      const text = Number.isFinite(mins) && mins > 0
        ? `**${name2}** restarts in **${mins} minute${mins === 1 ? '' : 's'}**.`
        : `**${name2}** is restarting now. You may briefly lose connection.`;
      await channel.send({ embeds: [info('🔄 Server restart', text)] }).catch(() => {});
      return send(message, ok('Restart announcement posted.')), true;
    }
    case 'help': {
      const e = info('🎮 FiveM Bot — Commands').addFields(
        { name: 'Server', value: `\`${prefix}status\` \`${prefix}players\`` },
        { name: 'Whitelist', value: `\`${prefix}whitelist add @user\` \`${prefix}whitelist remove @user\` \`${prefix}whitelist list\`` },
        { name: 'Utility', value: `\`${prefix}ping\` \`${prefix}serverinfo\` \`${prefix}userinfo\` \`${prefix}avatar\`` },
        { name: 'Slash', value: 'All of these also work as `/` commands.' },
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
      const member = (await resolveMember(message, args[0])) || message.member;
      const user = member.user;
      const e = info(user.tag).setThumbnail(user.displayAvatarURL({ size: 256 })).addFields(
        { name: 'ID', value: user.id, inline: true },
        { name: 'Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
      );
      if (member.joinedTimestamp) e.addFields({ name: 'Joined', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true });
      return send(message, e), true;
    }
    case 'avatar': {
      const member = (await resolveMember(message, args[0])) || message.member;
      return send(message, info(`${member.user.username}'s avatar`).setImage(member.user.displayAvatarURL({ size: 1024 }))), true;
    }
    default:
      return false;
  }
}

module.exports = { handlePrefix };
