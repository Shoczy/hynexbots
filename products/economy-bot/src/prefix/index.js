'use strict';

const { cfg } = require('../lib/state');
const { authorize, DENY_MESSAGE } = require('../lib/perms');
const { err, info } = require('../lib/embeds');
const e = require('../lib/economy');

const ID_RE = /^(?:<@!?)?(\d{17,20})>?$/;
const KNOWN = new Set([
  'balance', 'bal', 'daily', 'work', 'pay', 'shop', 'leaderboard', 'lb',
  'coinflip', 'cf', 'slots', 'help', 'ping', 'serverinfo', 'userinfo', 'avatar',
]);

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
  let name = (args.shift() || '').toLowerCase();
  if (!KNOWN.has(name)) return false;
  // Aliases
  name = { bal: 'balance', lb: 'leaderboard', cf: 'coinflip' }[name] || name;

  // Gate on the canonical command name.
  const auth = authorize({ name }, message.member);
  if (!auth.ok) {
    await send(message, err(DENY_MESSAGE[auth.reason] || 'Not allowed.'));
    return true;
  }

  const g = message.guild;
  const author = message.author;
  switch (name) {
    case 'balance': {
      const user = (await resolveUser(message, args[0])) || author;
      return send(message, e.balanceEmbed(g, user)), true;
    }
    case 'daily':
      return send(message, e.claimDaily(g, author).embed), true;
    case 'work':
      return send(message, e.doWork(g, author).embed), true;
    case 'pay': {
      const to = await resolveUser(message, args[0]);
      const amount = parseInt(args[1], 10);
      if (!to || !amount) return send(message, err('Usage: `pay @user <amount>`')), true;
      return send(message, e.pay(g, author, to, amount).embed), true;
    }
    case 'shop': {
      if (!args.length) return send(message, e.shopEmbed()), true;
      const res = await e.buy(g, message.member, args.join(' '));
      return send(message, res.embed), true;
    }
    case 'leaderboard':
      return send(message, e.leaderboardEmbed(g)), true;
    case 'coinflip': {
      const amount = parseInt(args[0], 10);
      if (!amount) return send(message, err('Usage: `coinflip <amount> [heads|tails]`')), true;
      const side = ['heads', 'tails'].includes((args[1] || '').toLowerCase()) ? args[1].toLowerCase() : null;
      return send(message, e.coinflip(g, author, amount, side).embed), true;
    }
    case 'slots': {
      const amount = parseInt(args[0], 10);
      if (!amount) return send(message, err('Usage: `slots <amount>`')), true;
      return send(message, e.slots(g, author, amount).embed), true;
    }
    case 'help': {
      const emb = info('💰 Economy Commands').addFields(
        { name: 'Earn', value: `\`${prefix}daily\` \`${prefix}work\`` },
        { name: 'Wallet', value: `\`${prefix}balance\` \`${prefix}pay @user <amt>\` \`${prefix}leaderboard\`` },
        { name: 'Shop', value: `\`${prefix}shop\` · \`${prefix}shop <item>\` to buy` },
      );
      emb.addFields({ name: 'Gambling', value: `\`${prefix}coinflip <amt>\` \`${prefix}slots <amt>\` (if enabled)` });
      return send(message, emb), true;
    }
    case 'ping':
      return send(message, info('🏓 Pong', `**WebSocket:** ${Math.round(message.client.ws.ping)}ms`)), true;
    case 'serverinfo':
      return send(message, info(g.name).addFields(
        { name: 'Owner', value: `<@${g.ownerId}>`, inline: true },
        { name: 'Members', value: String(g.memberCount), inline: true },
      )), true;
    case 'userinfo': {
      const user = (await resolveUser(message, args[0])) || author;
      return send(message, info(user.tag).setThumbnail(user.displayAvatarURL({ size: 256 })).addFields(
        { name: 'ID', value: user.id, inline: true },
        { name: 'Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
      )), true;
    }
    case 'avatar': {
      const user = (await resolveUser(message, args[0])) || author;
      return send(message, info(`${user.username}'s avatar`).setImage(user.displayAvatarURL({ size: 1024 }))), true;
    }
    default:
      return false;
  }
}

module.exports = { handlePrefix };
