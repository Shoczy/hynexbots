'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { err } = require('../lib/embeds');
const whitelist = require('../lib/whitelist');

module.exports = {
  name: 'whitelist',
  // Privileged: needs ManageRoles (or admin) — enforced in interactionCreate via authorize().
  requiredPerm: PermissionFlagsBits.ManageRoles,
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Manage the FiveM server whitelist.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((s) =>
      s
        .setName('add')
        .setDescription('Whitelist a member.')
        .addUserOption((o) => o.setName('member').setDescription('The member to whitelist').setRequired(true))
        .addStringOption((o) => o.setName('identifier').setDescription('Optional in-game id (steam:…, license:…)').setRequired(false)),
    )
    .addSubcommand((s) =>
      s
        .setName('remove')
        .setDescription('Remove a member from the whitelist.')
        .addUserOption((o) => o.setName('member').setDescription('The member to remove').setRequired(true)),
    )
    .addSubcommand((s) => s.setName('list').setDescription('Show the current whitelist.')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'list') {
      return interaction.reply({ embeds: [whitelist.listEmbed(interaction.guild)] });
    }

    const user = interaction.options.getUser('member', true);
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ embeds: [err('That member isn\'t in this server.')], flags: MessageFlags.Ephemeral });

    const result =
      sub === 'add'
        ? await whitelist.add(interaction.guild, member, interaction.options.getString('identifier') || '', interaction.user)
        : await whitelist.remove(interaction.guild, member, interaction.user);

    return interaction.reply({ embeds: [result.embed], flags: result.ok ? undefined : MessageFlags.Ephemeral });
  },
};
