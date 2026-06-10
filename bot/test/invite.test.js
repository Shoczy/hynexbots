'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { PermissionFlagsBits: P } = require('discord.js');
const { inviteUrl, permissionsFor } = require('../src/config-service/invite');

test('inviteUrl includes client id, scopes and permissions', () => {
  const url = inviteUrl('123456789012345678', 'moderation');
  assert.match(url, /client_id=123456789012345678/);
  assert.match(url, /scope=bot%20applications.commands/);
  assert.match(url, /permissions=\d+/);
});

test('inviteUrl is null without an app id', () => {
  assert.equal(inviteUrl('', 'moderation'), null);
});

test('moderation requests ban/kick; fivem stays minimal (no ban)', () => {
  const mod = BigInt(permissionsFor('moderation'));
  assert.ok((mod & P.BanMembers) === P.BanMembers, 'moderation can ban');
  assert.ok((mod & P.KickMembers) === P.KickMembers, 'moderation can kick');

  const fivem = BigInt(permissionsFor('fivem'));
  assert.ok((fivem & P.ManageRoles) === P.ManageRoles, 'fivem can manage the whitelist role');
  assert.ok((fivem & P.BanMembers) !== P.BanMembers, 'fivem does not request ban');
  assert.ok((fivem & P.KickMembers) !== P.KickMembers, 'fivem does not request kick');
});

test('unknown type falls back to the custom permission set', () => {
  assert.equal(permissionsFor('does-not-exist'), permissionsFor('custom'));
});
