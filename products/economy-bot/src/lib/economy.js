'use strict';

const { eco, money } = require('./state');
const { make, ok, err, info } = require('./embeds');
const { commandEmbed } = require('./commandEmbed');
const store = require('./store');

const DAY = 86_400_000;

function start() {
  return eco().startingBalance || 0;
}

/** Currency context shared by every custom-embed variable set. */
function cur() {
  const e = eco();
  return { currency: e.currencyName, symbol: e.currencySymbol };
}

function balanceEmbed(guild, user) {
  const acc = store.getAccount(guild.id, user.id, start());
  return (
    commandEmbed('balance', { user: user.username, balance: acc.balance.toLocaleString(), server: guild.name, ...cur() }) ||
    make({
      author: { name: user.username, iconURL: user.displayAvatarURL({ size: 128 }) },
      title: 'Wallet',
      description: money(acc.balance),
      thumbnail: user.displayAvatarURL({ size: 256 }),
    })
  );
}

function claimDaily(guild, user) {
  const e = eco();
  if (!e.daily?.enabled) return { ok: false, embed: err('Daily rewards are disabled on this server.') };
  const acc = store.getAccount(guild.id, user.id, start());
  const now = Date.now();
  const since = now - acc.last_daily;
  if (acc.last_daily && since < DAY) {
    return { ok: false, embed: err(`You already claimed your daily. Come back <t:${Math.floor((acc.last_daily + DAY) / 1000)}:R>.`) };
  }
  // Continue the streak if the last claim was within the last 48h, else reset.
  const streak = acc.last_daily && since < 2 * DAY ? acc.streak + 1 : 1;
  const reward = (e.daily.amount || 0) + (streak - 1) * (e.daily.streakBonus || 0);
  const bal = store.addBalance(guild.id, user.id, reward, start());
  store.recordDaily(guild.id, user.id, streak, now);
  const custom = commandEmbed('daily', {
    user: user.username,
    amount: reward.toLocaleString(),
    streak,
    balance: bal.toLocaleString(),
    ...cur(),
  });
  return {
    ok: true,
    embed: custom || ok(`🎁 You claimed ${money(reward)}!\n**Streak:** ${streak} day(s)\n**Balance:** ${money(bal)}`),
  };
}

function doWork(guild, user) {
  const e = eco();
  if (!e.work?.enabled) return { ok: false, embed: err('Working is disabled on this server.') };
  const acc = store.getAccount(guild.id, user.id, start());
  const now = Date.now();
  const cd = (e.work.cooldownSec || 0) * 1000;
  if (acc.last_work && now - acc.last_work < cd) {
    return { ok: false, embed: err(`You're tired. You can work again <t:${Math.floor((acc.last_work + cd) / 1000)}:R>.`) };
  }
  const min = e.work.min || 0;
  const max = Math.max(min, e.work.max || 0);
  const earn = Math.floor(min + Math.random() * (max - min + 1));
  const bal = store.addBalance(guild.id, user.id, earn, start());
  store.recordWork(guild.id, user.id, now);
  const jobs = ['delivered packages', 'wrote some code', 'walked dogs', 'fixed a server', 'sold lemonade', 'streamed for tips'];
  const custom = commandEmbed('work', { user: user.username, amount: earn.toLocaleString(), balance: bal.toLocaleString(), ...cur() });
  return {
    ok: true,
    embed: custom || ok(`💼 You ${jobs[Math.floor(Math.random() * jobs.length)]} and earned ${money(earn)}.\n**Balance:** ${money(bal)}`),
  };
}

function pay(guild, from, to, amount) {
  if (to.bot) return { ok: false, embed: err('You can\'t pay a bot.') };
  if (from.id === to.id) return { ok: false, embed: err('You can\'t pay yourself.') };
  const amt = Math.round(amount);
  if (!Number.isFinite(amt) || amt <= 0) return { ok: false, embed: err('Enter a positive amount.') };
  const acc = store.getAccount(guild.id, from.id, start());
  if (acc.balance < amt) return { ok: false, embed: err(`You only have ${money(acc.balance)}.`) };
  store.addBalance(guild.id, from.id, -amt, start());
  store.addBalance(guild.id, to.id, amt, start());
  const custom = commandEmbed('pay', { user: from.username, target: to.username, amount: amt.toLocaleString(), ...cur() });
  return { ok: true, embed: custom || ok(`💸 You sent ${money(amt)} to ${to}.`) };
}

function shopEmbed() {
  const e = eco();
  const items = e.shop || [];
  if (!items.length) return info('🛒 Shop', 'The shop is empty. The owner can add items in the Hynex dashboard.');
  const lines = items
    .slice(0, 25)
    .map((it) => `**${it.name}** — ${money(it.price)}${it.roleId ? ` → <@&${it.roleId}>` : ''}${it.description ? `\n${it.description}` : ''}`)
    .join('\n\n');
  return info('🛒 Shop', `${lines}\n\nBuy with \`/shop buy:<item name>\`.`);
}

async function buy(guild, member, query) {
  const e = eco();
  const items = e.shop || [];
  const q = String(query || '').toLowerCase().trim();
  const item = items.find((it) => it.id === query || it.name.toLowerCase() === q);
  if (!item) return { ok: false, embed: err('No shop item by that name. Use `/shop` to see what\'s available.') };

  if (item.roleId && member.roles.cache.has(item.roleId)) {
    return { ok: false, embed: err('You already own that.') };
  }
  const acc = store.getAccount(guild.id, member.id, start());
  if (acc.balance < item.price) return { ok: false, embed: err(`You need ${money(item.price)} but only have ${money(acc.balance)}.`) };

  if (item.roleId) {
    const role = guild.roles.cache.get(item.roleId);
    if (!role) return { ok: false, embed: err('That item\'s role no longer exists — tell an admin.') };
    try {
      await member.roles.add(role, 'Economy shop purchase');
    } catch {
      return { ok: false, embed: err('I couldn\'t assign the role — check my permissions and role position.') };
    }
  }
  store.addBalance(guild.id, member.id, -item.price, start());
  return { ok: true, embed: ok(`✅ You bought **${item.name}** for ${money(item.price)}.${item.roleId ? ` Role <@&${item.roleId}> added.` : ''}`) };
}

function leaderboardEmbed(guild) {
  const e = eco();
  if (!e.leaderboard) return info('🏆 Leaderboard', 'The leaderboard is disabled on this server.');
  const rows = store.top(guild.id, 10);
  if (!rows.length) return info('🏆 Leaderboard', 'No one has any ' + (e.currencyName || 'coins') + ' yet.');
  const medals = ['🥇', '🥈', '🥉'];
  const lines = rows.map((r, i) => `${medals[i] || `**${i + 1}.**`} <@${r.user_id}> — ${money(r.balance)}`).join('\n');
  return info(`🏆 ${guild.name} — Richest Members`, lines);
}

// ── Gambling (only when economy.gambling is enabled) ──
function coinflip(guild, user, amount, choice) {
  if (!eco().gambling) return { ok: false, embed: err('Gambling is disabled on this server.') };
  const amt = Math.round(amount);
  if (!Number.isFinite(amt) || amt <= 0) return { ok: false, embed: err('Enter a positive bet.') };
  const acc = store.getAccount(guild.id, user.id, start());
  if (acc.balance < amt) return { ok: false, embed: err(`You only have ${money(acc.balance)}.`) };
  const side = Math.random() < 0.5 ? 'heads' : 'tails';
  const win = !choice || choice === side;
  const bal = store.addBalance(guild.id, user.id, win ? amt : -amt, start());
  const custom = commandEmbed('coinflip', { user: user.username, amount: amt.toLocaleString(), result: win ? 'won' : 'lost', balance: bal.toLocaleString(), ...cur() });
  return {
    ok: true,
    embed: custom || (win ? ok : err)(`🪙 It landed **${side}**. You ${win ? `won ${money(amt)}` : `lost ${money(amt)}`}!\n**Balance:** ${money(bal)}`),
  };
}

function slots(guild, user, amount) {
  if (!eco().gambling) return { ok: false, embed: err('Gambling is disabled on this server.') };
  const amt = Math.round(amount);
  if (!Number.isFinite(amt) || amt <= 0) return { ok: false, embed: err('Enter a positive bet.') };
  const acc = store.getAccount(guild.id, user.id, start());
  if (acc.balance < amt) return { ok: false, embed: err(`You only have ${money(acc.balance)}.`) };
  const reel = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎'];
  const r = [0, 0, 0].map(() => reel[Math.floor(Math.random() * reel.length)]);
  let mult = 0;
  if (r[0] === r[1] && r[1] === r[2]) mult = r[0] === '💎' ? 10 : 5;
  else if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) mult = 2;
  const delta = mult > 0 ? amt * (mult - 1) : -amt;
  const bal = store.addBalance(guild.id, user.id, delta, start());
  const line = `[ ${r.join(' | ')} ]`;
  const custom = commandEmbed('slots', { user: user.username, amount: amt.toLocaleString(), result: mult > 0 ? 'won' : 'lost', balance: bal.toLocaleString(), ...cur() });
  return {
    ok: true,
    embed: custom || (mult > 0 ? ok : err)(`🎰 ${line}\n${mult > 0 ? `You won ${money(amt * mult)} (x${mult})!` : `You lost ${money(amt)}.`}\n**Balance:** ${money(bal)}`),
  };
}

module.exports = { balanceEmbed, claimDaily, doWork, pay, shopEmbed, buy, leaderboardEmbed, coinflip, slots };
