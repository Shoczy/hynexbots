const path = require('path');
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} = require('discord.js');
const config = require('../config');
const { V2, text, media, sep, container } = require('../lib/components');
const { parseEmoji } = require('../lib/emoji');
const fleetStore = require('../fleet/store');

const NODE_SELECT_ID = 'fleet_node_select';
const PAGE_PREFIX = 'fleet_page:'; // fleet_page:<nodeId>:<page>
const PAGE_SIZE = 5;

const FLEET_IMAGE_NAME = 'cluster.png';
const FLEET_IMAGE_PATH = path.join(__dirname, '..', '..', 'assets', FLEET_IMAGE_NAME);

function fmtUptime(seconds = 0) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return [d && `${d}d`, h && `${h}h`, `${m}m`].filter(Boolean).join(' ') || '0m';
}

const fmtPct = (n) => (typeof n === 'number' ? `${n.toFixed(0)}%` : 'n/a');

function statusEmoji(s) {
  const map = { online: '🟢', running: '🟢', stopped: '🔴', errored: '🟠', restarting: '🟡' };
  return map[(s || '').toLowerCase()] || '⚪';
}

function nodeHeader(node) {
  const dot = node.online ? '🟢' : '🔴';
  if (!node.online) {
    const ago = Math.round((Date.now() - node.lastSeen) / 60000);
    return `### ${dot} ${node.id}\n_offline — last seen ${ago}m ago_`;
  }
  const memPct = node.mem?.total ? (node.mem.used / node.mem.total) * 100 : null;
  return (
    `### ${dot} ${node.id}\n` +
    `\`CPU\` ${fmtPct(node.cpu)} \`RAM\` ${memPct != null ? fmtPct(memPct) : 'n/a'} \`up\` ${fmtUptime(node.uptime)}`
  );
}

/** Build the fleet panel view (initial, after a node pick, or a page flip). */
function buildFleetView({ nodeId = null, page = 0 } = {}) {
  const nodes = fleetStore.all();
  const file = new AttachmentBuilder(FLEET_IMAGE_PATH, { name: FLEET_IMAGE_NAME });
  const children = [media(`attachment://${FLEET_IMAGE_NAME}`)];

  if (!nodes.length) {
    children.push(text('## Fleet'));
    children.push(sep());
    children.push(
      text(
        'No VPS has sent a heartbeat yet. Install the **Hynex agent** on each VPS and point it at this bot ' +
          `(port \`${config.fleet.port}\`).`,
      ),
    );
    return { flags: V2, components: [container(null, children)], files: [file] };
  }

  const onlineCount = nodes.filter((n) => n.online).length;
  const totalBots = nodes.reduce((a, n) => a + (n.bots?.length || 0), 0);
  children.push(text(`## Fleet\n**${onlineCount}/${nodes.length}** VPS online · **${totalBots}** bots`));

  // Node / VPS dropdown.
  const selected = nodeId ? nodes.find((n) => n.id === nodeId) : null;
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(NODE_SELECT_ID)
    .setPlaceholder('Select a VPS / node…')
    .addOptions(
      nodes.slice(0, 25).map((n) => ({
        label: String(n.id).slice(0, 100),
        description: (n.online ? `online · ${n.bots?.length || 0} bots` : 'offline').slice(0, 100),
        value: String(n.id).slice(0, 100),
        emoji: parseEmoji(n.online ? '🟢' : '🔴'),
        default: Boolean(selected && n.id === selected.id),
      })),
    );
  children.push(sep());
  children.push(new ActionRowBuilder().addComponents(selectMenu));

  if (!selected) {
    children.push(text('-# Select a VPS from the dropdown to view its bots.'));
    return { flags: V2, components: [container(null, children)], files: [file] };
  }

  // Selected node → header + paginated bot list.
  children.push(sep());
  children.push(text(nodeHeader(selected)));

  const bots = selected.bots || [];
  if (!bots.length) {
    children.push(text('_No bots reported on this node._'));
    return { flags: V2, components: [container(null, children)], files: [file] };
  }

  const totalPages = Math.max(1, Math.ceil(bots.length / PAGE_SIZE));
  const p = Math.min(Math.max(0, page | 0), totalPages - 1);
  const slice = bots.slice(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE);

  const lines = slice.map((b, i) => {
    const id = b.id != null ? b.id : p * PAGE_SIZE + i + 1;
    return `${statusEmoji(b.status)} \`#${id}\` **${b.name}**`;
  });
  children.push(text(lines.join('\n')));
  children.push(text(`-# Page ${p + 1}/${totalPages} · ${bots.length} bot${bots.length === 1 ? '' : 's'}`));

  children.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${PAGE_PREFIX}${selected.id}:${p - 1}`)
        .setLabel('◀ Prev')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(p <= 0),
      new ButtonBuilder()
        .setCustomId(`${PAGE_PREFIX}${selected.id}:${p + 1}`)
        .setLabel('Next ▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(p >= totalPages - 1),
    ),
  );

  return { flags: V2, components: [container(null, children)], files: [file] };
}

module.exports = {
  NODE_SELECT_ID,
  PAGE_PREFIX,
  buildFleetView,
  data: new SlashCommandBuilder()
    .setName('fleet')
    .setDescription('Show the live status of your VPS fleet and the bots on each.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    // V2 component messages must be created fresh (channel.send), not via an
    // edited reply. Acknowledge privately, post the panel, confirm.
    await interaction.deferReply({ ephemeral: true });
    await interaction.channel.send(buildFleetView());
    await interaction.editReply({ content: 'Fleet panel posted.' });
  },
};
