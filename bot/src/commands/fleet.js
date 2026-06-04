const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const { V2, V2_EPHEMERAL, text, sep, container } = require('../lib/components');
const fleetStore = require('./../fleet/store');

function fmtUptime(seconds = 0) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return [d && `${d}d`, h && `${h}h`, `${m}m`].filter(Boolean).join(' ');
}

function bar(pct = 0, size = 10) {
  const filled = Math.round((Math.min(100, Math.max(0, pct)) / 100) * size);
  return '█'.repeat(filled) + '░'.repeat(size - filled);
}

const fmtPct = (n) => (typeof n === 'number' ? `${n.toFixed(0)}%` : 'n/a');

function statusEmoji(s) {
  const map = { online: '🟢', running: '🟢', stopped: '🔴', errored: '🟠', restarting: '🟡' };
  return map[(s || '').toLowerCase()] || '⚪';
}

function nodeBlock(node) {
  const dot = node.online ? '🟢' : '🔴';
  const memPct = node.mem?.total ? (node.mem.used / node.mem.total) * 100 : null;
  const title = `${dot} **${node.id}**${node.hostname && node.hostname !== node.id ? ` · ${node.hostname}` : ''}`;

  let body = `${title}\n`;
  if (node.online) {
    body += `\`CPU\` ${bar(node.cpu)} ${fmtPct(node.cpu)}\n`;
    if (memPct !== null) body += `\`RAM\` ${bar(memPct)} ${fmtPct(memPct)}\n`;
    body += `\`up \` ${fmtUptime(node.uptime)}`;
  } else {
    const ago = Math.round((Date.now() - node.lastSeen) / 60000);
    body += `_offline — last seen ${ago}m ago_`;
  }

  if (node.bots?.length) {
    body +=
      '\n' +
      node.bots
        .slice(0, 12)
        .map((b) => {
          const extras = [];
          if (typeof b.cpu === 'number') extras.push(`${b.cpu.toFixed(0)}%`);
          if (typeof b.restarts === 'number') extras.push(`↻${b.restarts}`);
          const tail = extras.length ? `  \`${extras.join(' ')}\`` : '';
          return `${statusEmoji(b.status)} ${b.name}${tail}`;
        })
        .join('\n');
  } else if (node.online) {
    body += '\n_no bots reported_';
  }
  return body;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fleet')
    .setDescription('Show the status of bots running across your VPSs.')
    .addStringOption((o) =>
      o.setName('node').setDescription('Filter to a single VPS id/hostname').setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    let nodes = fleetStore.all();
    const filter = interaction.options.getString('node');
    if (filter) {
      nodes = nodes.filter(
        (n) => n.id?.toLowerCase() === filter.toLowerCase() || n.hostname?.toLowerCase() === filter.toLowerCase(),
      );
    }

    if (nodes.length === 0) {
      return interaction.reply({
        flags: V2_EPHEMERAL,
        components: [
          container(config.brand.warning, [
            text(
              '### Fleet — no nodes reporting\n' +
                'No VPS has sent a heartbeat yet. Install the **Hynex agent** on each VPS and point it at ' +
                `this bot (port \`${config.fleet.port}\`).`,
            ),
          ]),
        ],
      });
    }

    const onlineCount = nodes.filter((n) => n.online).length;
    const totalBots = nodes.reduce((acc, n) => acc + (n.bots?.length || 0), 0);
    const runningBots = nodes.reduce(
      (acc, n) =>
        acc + (n.bots?.filter((b) => ['online', 'running'].includes((b.status || '').toLowerCase())).length || 0),
      0,
    );

    const children = [
      text(`## Fleet\n**${onlineCount}/${nodes.length}** VPS online · **${runningBots}/${totalBots}** bots running`),
    ];
    for (const node of nodes) {
      children.push(sep());
      children.push(text(nodeBlock(node)));
    }

    return interaction.reply({ flags: V2, components: [container(config.brand.color, children)] });
  },
};
