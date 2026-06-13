'use strict';

const { cfg } = require('../lib/state');
const { authorize, DENY_MESSAGE, PermissionFlagsBits } = require('../lib/perms');
const { commandInScope } = require('../lib/scope');
const { ok, err, info } = require('../lib/embeds');
const actions = require('../lib/actions');
const { parseDuration } = require('../commands/_helpers');

// Map prefix command names to the native permission their slash twin requires,
// so the same authorization rules apply to both interfaces.
const REQUIRED_PERM = {
  ban: PermissionFlagsBits.BanMembers,
  kick: PermissionFlagsBits.KickMembers,
  mute: PermissionFlagsBits.ModerateMembers,
  unmute: PermissionFlagsBits.ModerateMembers,
  warn: PermissionFlagsBits.ModerateMembers,
  warnings: PermissionFlagsBits.ModerateMembers,
  purge: PermissionFlagsBits.ManageMessages,
  lockdown: PermissionFlagsBits.ManageChannels,
};

const ID_RE = /^(?:<@!?)?(\d{17,20})>?$/;

async function resolveUser(message, token) {
  const m = ID_RE.exec(token || '');
  if (!m) return null;
  return message.client.users.fetch(m[1]).catch(() => null);
}

async function resolveMember(message, token) {
  const m = ID_RE.exec(token || '');
  if (!m) return null;
  return message.guild.members.fetch(m[1]).catch(() => null);
}

const send = (message, embed) => message.channel.send({ embeds: [embed] }).catch(() => {});
// Send an action result: a custom Components V2 reply when present, else its embed.
const sendRes = (message, res) => message.channel.send(res.reply || { embeds: [res.embed] }).catch(() => {});

/** Handle a prefix command. Returns true if a command was recognised. */
async function handlePrefix(message) {
  if (!message.guild || message.author.bot || !message.member) return false;
  const prefix = cfg('basics.prefix', '!');
  if (!prefix || !message.content.startsWith(prefix)) return false;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const name = (args.shift() || '').toLowerCase();
  if (!name) return false;

  const command = { name, requiredPerm: REQUIRED_PERM[name] };
  const auth = authorize(command, message.member);
  // Only surface a denial for commands we actually own.
  const known = KNOWN.has(name);
  if (!known) return false;
  // Out of this bot's product scope (e.g. a Community bot ignoring !ban).
  if (!commandInScope(name, message.client.features)) return false;
  if (!auth.ok) {
    await send(message, err(DENY_MESSAGE[auth.reason] || 'Not allowed.'));
    return true;
  }

  const mod = message.member;
  switch (name) {
    case 'ban': {
      const user = await resolveUser(message, args[0]);
      if (!user) return reply(message, 'Usage: `ban @user [duration] [reason]`');
      const maybeDur = parseDuration(args[1]);
      const reason = (maybeDur ? args.slice(2) : args.slice(1)).join(' ') || 'No reason provided';
      const res = await actions.doBan(message.guild, user, { moderator: message.author, reason, durationMs: maybeDur });
      return sendRes(message, res), true;
    }
    case 'kick': {
      const member = await resolveMember(message, args[0]);
      if (!member) return reply(message, 'Usage: `kick @user [reason]`');
      const res = await actions.doKick(message.guild, member, { moderator: message.author, reason: args.slice(1).join(' ') || 'No reason provided' });
      return sendRes(message, res), true;
    }
    case 'mute': {
      const member = await resolveMember(message, args[0]);
      if (!member) return reply(message, 'Usage: `mute @user [duration] [reason]`');
      const maybeDur = parseDuration(args[1]);
      const reason = (maybeDur ? args.slice(2) : args.slice(1)).join(' ') || 'No reason provided';
      const res = await actions.doMute(message.guild, member, { moderator: message.author, durationMs: maybeDur, reason });
      return sendRes(message, res), true;
    }
    case 'unmute': {
      const member = await resolveMember(message, args[0]);
      if (!member) return reply(message, 'Usage: `unmute @user`');
      const res = await actions.doUnmute(message.guild, member, { moderator: message.author });
      return sendRes(message, res), true;
    }
    case 'warn': {
      const member = await resolveMember(message, args[0]);
      if (!member) return reply(message, 'Usage: `warn @user [reason]`');
      if (member.user.bot) return reply(message, 'You can\'t warn a bot.');
      const res = await actions.doWarn(message.guild, member, { moderator: message.author, reason: args.slice(1).join(' ') || 'No reason provided' });
      return sendRes(message, res), true;
    }
    case 'warnings': {
      const user = await resolveUser(message, args[0]);
      if (!user) return reply(message, 'Usage: `warnings @user [clear]`');
      if ((args[1] || '').toLowerCase() === 'clear') {
        const n = actions.clearWarnings(message.guild, user.id);
        return send(message, ok(`🧹 Cleared **${n}** warning(s) for **${user.tag}**.`)), true;
      }
      const list = actions.listWarnings(message.guild, user.id);
      if (!list.length) return send(message, info('Warnings', `**${user.tag}** has no active warnings.`)), true;
      const lines = list.slice(0, 15).map((w, i) => `**${i + 1}.** ${w.reason} — <t:${Math.floor(w.created_at / 1000)}:R>`).join('\n');
      return send(message, info(`Warnings — ${user.tag} (${list.length})`, lines)), true;
    }
    case 'purge': {
      const amount = parseInt(args[0], 10);
      if (!amount) return reply(message, 'Usage: `purge <1-100> [@user]`');
      const target = await resolveUser(message, args[1]);
      await message.delete().catch(() => {});
      const res = await actions.doPurge(message.channel, amount, { filterUserId: target?.id });
      const m = await message.channel.send({ embeds: [res.ok ? ok(`🧹 Deleted **${res.count}** message(s).`) : err('Failed to purge.')] }).catch(() => {});
      if (m) setTimeout(() => m.delete().catch(() => {}), 4000);
      return true;
    }
    case 'lockdown': {
      const unlock = (args[0] || '').toLowerCase() === 'unlock';
      const res = await actions.doLockdown(message.channel, { lock: !unlock, moderator: message.author });
      return sendRes(message, res), true;
    }
    case 'help': {
      const e = info('🛡️ Moderation Commands').addFields(
        { name: 'Moderation', value: `\`${prefix}ban\` \`${prefix}kick\` \`${prefix}mute\` \`${prefix}unmute\` \`${prefix}warn\` \`${prefix}warnings\` \`${prefix}purge\` \`${prefix}lockdown\`` },
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
      const user = (await resolveUser(message, args[0])) || message.author;
      const member = message.guild.members.cache.get(user.id);
      const warns = actions.listWarnings(message.guild, user.id).length;
      const e = info(user.tag).setThumbnail(user.displayAvatarURL({ size: 256 })).addFields(
        { name: 'ID', value: user.id, inline: true },
        { name: 'Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Warnings', value: String(warns), inline: true },
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

const KNOWN = new Set([
  'ban', 'kick', 'mute', 'unmute', 'warn', 'warnings', 'purge', 'lockdown',
  'help', 'ping', 'serverinfo', 'userinfo', 'avatar',
]);

function reply(message, text) {
  send(message, err(text));
  return true;
}

module.exports = { handlePrefix };
