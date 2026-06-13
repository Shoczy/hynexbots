'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { fivem } = require('../lib/state');
const { queryServer } = require('../lib/fivem');
const store = require('../lib/store');
const { make } = require('../lib/embeds');

const BLOCKS = '▁▂▃▄▅▆▇█';

/** A unicode sparkline of average player counts across `buckets` of the window. */
function sparkline(samples, buckets = 24, windowMs = 24 * 3_600_000) {
  if (!samples.length) return '▁'.repeat(buckets);
  const start = Date.now() - windowMs;
  const size = windowMs / buckets;
  const sums = new Array(buckets).fill(0);
  const counts = new Array(buckets).fill(0);
  for (const s of samples) {
    const idx = Math.floor((s.ts - start) / size);
    if (idx >= 0 && idx < buckets) {
      sums[idx] += s.count;
      counts[idx] += 1;
    }
  }
  const avgs = sums.map((v, i) => (counts[i] ? v / counts[i] : 0));
  const max = Math.max(1, ...avgs);
  return avgs.map((a) => BLOCKS[Math.min(7, Math.round((a / max) * 7))]).join('');
}

module.exports = {
  name: 'serverstats',
  data: new SlashCommandBuilder().setName('serverstats').setDescription('Player-count history, peaks and a 24h trend for the FiveM server.'),

  async execute(interaction) {
    await interaction.deferReply();
    const now = Date.now();
    const s24 = store.samplesSince(now - 24 * 3_600_000);
    const s7 = store.samplesSince(now - 7 * 86_400_000);
    const live = await queryServer(fivem().server.host);

    const peak24 = s24.length ? Math.max(...s24.map((x) => x.count)) : 0;
    const peak7 = s7.length ? Math.max(...s7.map((x) => x.count)) : 0;
    const avg24 = s24.length ? Math.round(s24.reduce((a, x) => a + x.count, 0) / s24.length) : 0;
    const maxP = live.maxPlayers || s24.at(-1)?.maxc || 0;

    const lines = [
      `**Now:** ${live.online ? `${live.players}${maxP ? `/${maxP}` : ''} online` : 'offline'}`,
      `**Peak (24h):** ${peak24}`,
      `**Peak (7d):** ${peak7}`,
      `**Average (24h):** ${avg24}`,
      '',
      `**Last 24h**\n\`${sparkline(s24)}\``,
    ];
    if (!fivem().stats?.enabled) lines.push('\n-# Enable “Player stats” in the dashboard to record history.');

    return interaction.editReply({ embeds: [make({ title: `📈 ${fivem().server.name || 'Server'} stats`, description: lines.join('\n') })] });
  },
};
