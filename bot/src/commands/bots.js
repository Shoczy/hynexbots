const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const store = require('../config-service/db');
const launcher = require('../launcher/manager');
const { V2_EPHEMERAL, text, sep, container } = require('../lib/components');

function uptime(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ${m % 60}m` : `${Math.floor(h / 24)}d ${h % 24}h`;
}

/** Confirm a bot token is valid and return the application id it belongs to. */
async function verifyToken(token) {
  try {
    const res = await fetch('https://discord.com/api/v10/applications/@me', { headers: { Authorization: `Bot ${token}` } });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return { ok: true, appId: data.id };
  } catch {
    return { ok: false };
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bots')
    .setDescription('Manage the bots this host runs for customers.')
    .addSubcommand((s) => s.setName('list').setDescription('Show every locally-hosted bot and its status.'))
    .addSubcommand((s) =>
      s
        .setName('restart')
        .setDescription('Restart (or start) a hosted bot.')
        .addStringOption((o) => o.setName('app_id').setDescription('The bot’s Application ID').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('stop')
        .setDescription('Stop a hosted bot (won’t relaunch until restarted).')
        .addStringOption((o) => o.setName('app_id').setDescription('The bot’s Application ID').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('host')
        .setDescription('Bring an already-registered bot online with its token.')
        .addStringOption((o) => o.setName('app_id').setDescription('The bot’s Application ID').setRequired(true))
        .addStringOption((o) => o.setName('token').setDescription('The bot’s token').setRequired(true)),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'list') {
      const running = new Map(launcher.statusList().map((r) => [r.appId, r]));
      const records = store.listAutostart();
      const seen = new Set();
      const lines = [];

      for (const r of launcher.statusList()) {
        seen.add(r.appId);
        lines.push(`🟢 **${r.name || r.appId}** · ${r.type} · up ${uptime(r.uptimeMs)}${r.restarts ? ` · ${r.restarts} restart(s)` : ''}\n\`${r.appId}\``);
      }
      for (const rec of records) {
        if (seen.has(rec.app_id)) continue;
        const bot = store.getBot(rec.app_id);
        lines.push(`🔴 **${bot?.name || rec.app_id}** · ${rec.type} · offline\n\`${rec.app_id}\``);
      }

      const body = lines.length ? lines.join('\n\n') : 'No hosted bots yet. Register one with a token via `/register-bot`.';
      return interaction.reply({
        flags: V2_EPHEMERAL,
        components: [container(config.brand.color, [text('### Hosted bots'), sep(), text(body)])],
      });
    }

    // ── Host an already-registered bot with its token ──
    if (sub === 'host') {
      const appId = interaction.options.getString('app_id').trim();
      const token = interaction.options.getString('token').trim();
      const bot = store.getBot(appId);
      if (!bot) {
        return interaction.reply({
          flags: V2_EPHEMERAL,
          components: [container(config.brand.danger, [text('### Not registered\nRegister it first with `/register-bot`, then host it here.')])],
        });
      }
      if (!launcher.isManaged(bot.type)) {
        return interaction.reply({
          flags: V2_EPHEMERAL,
          components: [container(config.brand.warning, [text('### Can’t host this type\nCustom bots have no bundled process — run yours yourself.')])],
        });
      }
      const v = await verifyToken(token);
      if (!v.ok) {
        return interaction.reply({
          flags: V2_EPHEMERAL,
          components: [container(config.brand.danger, [text('### Invalid token\nThat bot token didn’t work. Check it in the Developer Portal.')])],
        });
      }
      if (v.appId !== appId) {
        return interaction.reply({
          flags: V2_EPHEMERAL,
          components: [container(config.brand.danger, [text(`### Token / App ID mismatch\nThat token belongs to \`${v.appId}\`, not \`${appId}\`.`)])],
        });
      }

      await interaction.reply({
        flags: V2_EPHEMERAL,
        components: [container(config.brand.warning, [text('### Bringing it online…\nInstalling dependencies, deploying its commands and starting it. Up to a minute on first run.')])],
      });
      const res = await launcher.launch({ appId, type: bot.type, token, name: bot.name, guildId: interaction.guildId, persist: true });
      const view = res.ok
        ? container(config.brand.success, [
            text('### 🟢 Hosted'),
            sep(),
            text(`**${bot.name}** is starting. Commands ${res.deployed ? 'were deployed to this server.' : 'deploy had an issue — check host logs.'}\nMake sure the bot is **invited here** and its **privileged intents** are enabled in the Developer Portal, then its roles/channels will sync to the dashboard.`),
          ])
        : container(config.brand.danger, [text(`### Couldn’t host\n${res.reason}`)]);
      return interaction.followUp({ flags: V2_EPHEMERAL, components: [view] });
    }

    const appId = interaction.options.getString('app_id').trim();
    if (!store.getProcess(appId)) {
      return interaction.reply({
        flags: V2_EPHEMERAL,
        components: [container(config.brand.danger, [text('### Not found\nNo hosted process for that Application ID. Register it with a token first.')])],
      });
    }

    if (sub === 'stop') {
      await launcher.stop(appId);
      store.setAutostart(appId, false);
      return interaction.reply({
        flags: V2_EPHEMERAL,
        components: [container(config.brand.warning, [text(`### Stopped\n\`${appId}\` is offline and won’t relaunch until you restart it.`)])],
      });
    }

    // restart
    await interaction.reply({
      flags: V2_EPHEMERAL,
      components: [container(config.brand.warning, [text('### Restarting…\nDeploying commands and starting the process.')])],
    });
    const res = await launcher.restart(appId);
    const view = res.ok
      ? container(config.brand.success, [text(`### 🟢 Restarted\n\`${appId}\` is starting and will connect shortly.`)])
      : container(config.brand.danger, [text(`### Couldn’t restart\n${res.reason}`)]);
    return interaction.followUp({ flags: V2_EPHEMERAL, components: [view] });
  },
};
