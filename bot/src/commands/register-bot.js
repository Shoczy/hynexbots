const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const store = require('../config-service/db');
const { featuresFromModules } = require('../config-service/products');
const launcher = require('../launcher/manager');
const { V2_EPHEMERAL, text, sep, container } = require('../lib/components');

/** Confirm a bot token is valid and return the application id it belongs to. */
async function verifyToken(token) {
  try {
    const res = await fetch('https://discord.com/api/v10/applications/@me', {
      headers: { Authorization: `Bot ${token}` },
    });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return { ok: true, appId: data.id };
  } catch {
    return { ok: false };
  }
}

const LAUNCH_FAIL = {
  no_product: 'There’s no bundled process for this type, so it can’t be auto-started.',
  install_failed: 'Installing the bot’s dependencies failed — check the host logs and `npm install` it manually.',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('register-bot')
    .setDescription('Register a delivered bot so the customer can customize it in the dashboard.')
    .addStringOption((o) =>
      o.setName('app_id').setDescription("The delivered bot's Discord Application (client) ID").setRequired(true),
    )
    .addStringOption((o) =>
      o.setName('name').setDescription('Display name shown to the customer (e.g. "Aether")').setRequired(true),
    )
    .addStringOption((o) => {
      o.setName('type').setDescription('Which kind of bot this is').setRequired(true);
      for (const p of config.catalog.slice(0, 24)) o.addChoices({ name: p.label, value: p.id });
      o.addChoices({ name: 'Custom Bot', value: 'custom' });
      return o;
    })
    .addUserOption((o) =>
      o
        .setName('owner')
        .setDescription('The customer (pre-assigns the bot to their account). Omit to use the backup key only.')
        .setRequired(false),
    )
    .addStringOption((o) =>
      o
        .setName('token')
        .setDescription("The bot's token — provide it and Hynex will deploy its commands and bring it online for you.")
        .setRequired(false),
    )
    .addStringOption((o) =>
      o
        .setName('features')
        .setDescription('Custom bots only: modules it ships with, comma-separated (e.g. "moderation,tickets").')
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const appId = interaction.options.getString('app_id').trim();
    const name = interaction.options.getString('name').trim();
    const type = interaction.options.getString('type');
    const owner = interaction.options.getUser('owner');
    const token = interaction.options.getString('token')?.trim() || null;
    const featuresRaw = interaction.options.getString('features');

    // If a token is given, validate it up-front and make sure it matches app_id —
    // config is keyed by the bot's real application id, so a mismatch would break it.
    if (token) {
      const v = await verifyToken(token);
      if (!v.ok) {
        return interaction.reply({
          flags: V2_EPHEMERAL,
          components: [container(config.brand.danger, [text('### Invalid token\nThat bot token didn’t work. Double-check it in the Developer Portal.')])],
        });
      }
      if (v.appId !== appId) {
        return interaction.reply({
          flags: V2_EPHEMERAL,
          components: [
            container(config.brand.danger, [
              text(`### Token / App ID mismatch\nThat token belongs to application \`${v.appId}\`, not \`${appId}\`.\nUse that ID as **app_id**, or paste the matching token.`),
            ]),
          ],
        });
      }
    }

    // Per-bot scope only applies to custom builds; catalog types use their template.
    const features =
      type === 'custom' && featuresRaw
        ? featuresFromModules(featuresRaw.split(',').map((s) => s.trim().toLowerCase()))
        : null;

    const result = store.registerBot({ appId, name, type, ownerId: owner?.id || null, withKey: true, features });

    if (!result.ok) {
      const human = {
        invalid_app_id: 'That doesn’t look like a valid Discord Application ID (17–20 digits).',
        already_registered: 'A bot with that Application ID is already registered.',
      };
      return interaction.reply({
        flags: V2_EPHEMERAL,
        components: [
          container(config.brand.danger, [text(`### Couldn’t register\n${human[result.error] || result.error}`)]),
        ],
      });
    }

    const p = config.catalog.find((c) => c.id === type);
    const typeLabel = p ? `${p.emoji} ${p.label}` : '🛠️ Custom Bot';
    const intro = owner
      ? `<@${owner.id}> can log into the dashboard now — their bot is already waiting, no key needed.`
      : 'Give the customer the backup key below to claim their bot in the dashboard.';

    const view = container(config.brand.success, [
      text(`### Bot registered\n${intro}`),
      sep(),
      text(`**Name**  ${name}\n**Type**  ${typeLabel}\n**Application ID**  \`${appId}\``),
      text(`**Backup / transfer key**\n\`\`\`${result.key}\`\`\``),
    ]);

    await interaction.reply({ flags: V2_EPHEMERAL, components: [view] });

    // ── Auto-launch when a token was provided ──────────
    if (!token) return;

    if (!launcher.isManaged(type)) {
      return interaction.followUp({
        flags: V2_EPHEMERAL,
        components: [container(config.brand.warning, [text('### Auto-launch skipped\nCustom bots don’t have a bundled process to start automatically — run yours yourself.')])],
      });
    }

    await interaction.followUp({
      flags: V2_EPHEMERAL,
      components: [container(config.brand.warning, [text('### Bringing it online…\nInstalling dependencies (first run only), deploying its commands and starting the process. This can take up to a minute.')])],
    });

    const res = await launcher.launch({ appId, type, token, name, guildId: interaction.guildId, persist: true });

    const view2 = res.ok
      ? container(config.brand.success, [
          text('### 🟢 Bot is online'),
          sep(),
          text(`**${name}** has been started and will connect momentarily.\nSlash commands ${res.deployed ? 'were deployed to this server (available now).' : '— deploy reported an issue; check host logs.'}\nIt will auto-restart on crashes and relaunch when this host reboots.`),
        ])
      : container(config.brand.danger, [text(`### Couldn’t auto-launch\n${LAUNCH_FAIL[res.reason] || res.reason}\nThe bot is still registered — start it manually with \`npm start\`.`)]);

    return interaction.followUp({ flags: V2_EPHEMERAL, components: [view2] });
  },
};
