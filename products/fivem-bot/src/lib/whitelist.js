'use strict';

const { fivem } = require('./state');
const { ok, err, info, make } = require('./embeds');
const store = require('./store');

/** Post a whitelist action to the configured log channel (best-effort). */
async function log(guild, text) {
  const chId = fivem().whitelist.logChannelId;
  if (!chId) return;
  const ch = guild.channels.cache.get(chId);
  if (ch?.isTextBased?.()) await ch.send({ embeds: [info('Whitelist', text)] }).catch(() => {});
}

/** Grant the whitelist role and record the member (+ optional in-game id). */
async function add(guild, member, identifier, actor) {
  const wl = fivem().whitelist;
  if (!wl.enabled) return { ok: false, embed: err('The whitelist module is disabled. Enable it in your dashboard.') };
  if (!wl.roleId) return { ok: false, embed: err('No whitelist role is set. Pick one in your dashboard → FiveM → Whitelist.') };

  const role = guild.roles.cache.get(wl.roleId);
  if (!role) return { ok: false, embed: err('The configured whitelist role no longer exists.') };

  try {
    await member.roles.add(role, `Whitelisted by ${actor.tag}`);
  } catch {
    return { ok: false, embed: err('Couldn\'t assign the whitelist role — make sure my role is **above** it.') };
  }
  store.addWhitelist(guild.id, member.id, identifier || '', actor.id);
  await log(guild, `✅ ${member.user.tag} whitelisted by ${actor.tag}${identifier ? ` (\`${identifier}\`)` : ''}.`);
  return { ok: true, embed: ok(`Whitelisted **${member.user.tag}**${identifier ? ` with identifier \`${identifier}\`` : ''}.`) };
}

/** Revoke the whitelist role and forget the member. */
async function remove(guild, member, actor) {
  const wl = fivem().whitelist;
  if (!wl.enabled) return { ok: false, embed: err('The whitelist module is disabled. Enable it in your dashboard.') };

  if (wl.roleId) {
    const role = guild.roles.cache.get(wl.roleId);
    if (role) await member.roles.remove(role, `Un-whitelisted by ${actor.tag}`).catch(() => {});
  }
  const existed = store.removeWhitelist(guild.id, member.id);
  await log(guild, `❌ ${member.user.tag} removed from the whitelist by ${actor.tag}.`);
  return {
    ok: true,
    embed: existed || true ? ok(`Removed **${member.user.tag}** from the whitelist.`) : info('Whitelist', 'Nothing to remove.'),
  };
}

/** A summary embed of the current whitelist. */
function listEmbed(guild) {
  const total = store.countWhitelist(guild.id);
  const rows = store.listWhitelist(guild.id, 40);
  if (!total) return info('Whitelist', '_No members are whitelisted yet._');
  const body = rows
    .map((r) => `• <@${r.userId}>${r.identifier ? ` — \`${r.identifier}\`` : ''}`)
    .join('\n')
    .slice(0, 4000);
  const extra = total > rows.length ? `\n…and **${total - rows.length}** more.` : '';
  return make({ title: `🎫 Whitelist — ${total} member${total === 1 ? '' : 's'}`, description: body + extra });
}

module.exports = { add, remove, listEmbed };
