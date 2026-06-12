'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const store = require('../lib/store');
const { ok, err, make } = require('../lib/embeds');
const { parseDuration } = require('./_helpers');

const MAX_MS = 365 * 86_400_000;

module.exports = {
  name: 'temprole',
  requiredPerm: PermissionFlagsBits.ManageRoles,
  data: new SlashCommandBuilder()
    .setName('temprole')
    .setDescription('Give a member a role for a limited time.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((s) =>
      s
        .setName('add')
        .setDescription('Grant a role that auto-removes after a duration.')
        .addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true))
        .addRoleOption((o) => o.setName('role').setDescription('Role to grant').setRequired(true))
        .addStringOption((o) => o.setName('duration').setDescription('e.g. 30m, 2h, 7d').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('remove')
        .setDescription('Remove a temp role now.')
        .addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true))
        .addRoleOption((o) => o.setName('role').setDescription('Role').setRequired(true)),
    )
    .addSubcommand((s) =>
      s.setName('list').setDescription("List a member's active temp roles.").addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true)),
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (sub === 'add') {
      const member = interaction.options.getMember('user');
      const role = interaction.options.getRole('role');
      const ms = parseDuration(interaction.options.getString('duration'));
      if (!member) return interaction.reply({ embeds: [err("That user isn't in this server.")], flags: MessageFlags.Ephemeral });
      if (!ms || ms < 60_000) return interaction.reply({ embeds: [err('Use a duration of at least 1 minute, e.g. `2h`.')], flags: MessageFlags.Ephemeral });
      if (ms > MAX_MS) return interaction.reply({ embeds: [err('The maximum duration is 365 days.')], flags: MessageFlags.Ephemeral });
      if (role.managed || role.id === guild.id) return interaction.reply({ embeds: [err("I can't assign that role.")], flags: MessageFlags.Ephemeral });
      if (guild.members.me.roles.highest.comparePositionTo(role) <= 0) {
        return interaction.reply({ embeds: [err('That role sits above my highest role — move mine above it first.')], flags: MessageFlags.Ephemeral });
      }
      try {
        await member.roles.add(role, `Temp-role by ${interaction.user.tag}`);
      } catch {
        return interaction.reply({ embeds: [err('Failed to add the role — check my permissions and role position.')], flags: MessageFlags.Ephemeral });
      }
      const expires = Date.now() + ms;
      store.addTempRole(guild.id, member.id, role.id, expires);
      const ts = Math.floor(expires / 1000);
      return interaction.reply({ embeds: [ok(`Gave ${member} the **${role.name}** role — auto-removed <t:${ts}:R> (<t:${ts}:f>).`)] });
    }

    if (sub === 'remove') {
      const member = interaction.options.getMember('user');
      const role = interaction.options.getRole('role');
      if (!member) return interaction.reply({ embeds: [err("That user isn't in this server.")], flags: MessageFlags.Ephemeral });
      const had = store.removeTempRole(guild.id, member.id, role.id);
      await member.roles.remove(role.id, `Temp-role removed by ${interaction.user.tag}`).catch(() => {});
      return interaction.reply({ embeds: [ok(`Removed **${role.name}** from ${member}${had ? '' : ' (no active timer was set).'}`)] });
    }

    // list
    const user = interaction.options.getUser('user');
    const rows = store.listTempRoles(guild.id, user.id);
    if (!rows.length) return interaction.reply({ embeds: [make({ title: '⏳ Temp roles', description: `**${user.tag}** has no active temp roles.` })] });
    const lines = rows.map((r) => `• <@&${r.role_id}> — expires <t:${Math.floor(r.expires_at / 1000)}:R>`).join('\n');
    return interaction.reply({ embeds: [make({ title: `⏳ Temp roles — ${user.tag}`, description: lines })] });
  },
};
