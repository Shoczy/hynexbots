'use strict';

const { make, COLORS } = require('./embeds');

/** A simple 10-segment fill bar for the player count. */
function playerBar(players, max) {
  if (!max || max <= 0) return '';
  const filled = Math.round((Math.min(players, max) / max) * 10);
  return '▰'.repeat(filled) + '▱'.repeat(10 - filled);
}

/** The live "server status" embed shared by the board and the /status command. */
function statusEmbed(snapshot, displayName) {
  const name = displayName || snapshot.hostname || 'FiveM Server';
  if (!snapshot.configured) {
    return make({
      title: '🎮 Server status',
      description: 'No server address configured yet. Add it in your Hynex dashboard → FiveM → Server address.',
      color: COLORS.warning,
    });
  }
  if (!snapshot.online) {
    return make({ title: `🔴 ${name}`, description: 'The server is **offline** or unreachable.', color: COLORS.danger });
  }
  const max = snapshot.maxPlayers ? `/${snapshot.maxPlayers}` : '';
  const bar = playerBar(snapshot.players, snapshot.maxPlayers);
  const fields = [{ name: 'Players', value: `**${snapshot.players}**${max}\n${bar}`, inline: true }];
  if (snapshot.gametype) fields.push({ name: 'Game type', value: snapshot.gametype, inline: true });
  if (snapshot.mapname) fields.push({ name: 'Map', value: snapshot.mapname, inline: true });
  return make({ title: `🟢 ${name}`, description: 'The server is **online**.', color: COLORS.success, fields });
}

/** The /players list embed. */
function playersEmbed(snapshot, displayName) {
  const name = displayName || snapshot.hostname || 'FiveM Server';
  if (!snapshot.configured) {
    return make({ title: '🎮 Players', description: 'No server address configured yet — set it in your dashboard.', color: COLORS.warning });
  }
  if (!snapshot.online) {
    return make({ title: `🔴 ${name}`, description: 'The server is offline or unreachable.', color: COLORS.danger });
  }
  const names = snapshot.list.map((p) => p.name).filter(Boolean);
  const shown = names.slice(0, 60);
  const body = names.length ? shown.map((n) => `• ${n}`).join('\n') : '_No players online right now._';
  const extra = names.length > shown.length ? `\n…and **${names.length - shown.length}** more.` : '';
  const max = snapshot.maxPlayers ? `/${snapshot.maxPlayers}` : '';
  return make({ title: `👥 Players online — ${snapshot.players}${max}`, description: (body + extra).slice(0, 4000) });
}

module.exports = { statusEmbed, playersEmbed, playerBar };
