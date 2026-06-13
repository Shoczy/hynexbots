'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { cfg } = require('../lib/state');
const { panelPayload } = require('../reactionroles');
const { ok, err } = require('../lib/embeds');

module.exports = {
  name: 'roles-panel',
  requiredPerm: PermissionFlagsBits.ManageGuild,
  data: new SlashCommandBuilder()
    .setName('roles-panel')
    .setDescription('Post your reaction-role panels to their channels.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!cfg('modules.reactionroles', false)) {
      return interaction.reply({ embeds: [err('Enable the Reaction Roles module in the dashboard first.')], flags: MessageFlags.Ephemeral });
    }
    const panels = (cfg('reactionRoles', {}).panels || []).filter((p) => (p.roles || []).some((r) => r.roleId));
    if (!panels.length) {
      return interaction.reply({ embeds: [err('No reaction-role panels are configured yet — add one in the dashboard.')], flags: MessageFlags.Ephemeral });
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    let posted = 0;
    for (const p of panels) {
      const channel = p.channelId ? await interaction.client.channels.fetch(p.channelId).catch(() => null) : interaction.channel;
      if (channel?.isTextBased?.()) {
        const sent = await channel.send(panelPayload(p)).catch(() => null);
        if (sent) posted += 1;
      }
    }
    return interaction.editReply({ embeds: [ok(`Posted **${posted}** panel(s).`)] });
  },
};
