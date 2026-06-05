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

test('moderation requests ban/kick; music requests connect/speak', () => {
  const mod = BigInt(permissionsFor('moderation'));
  assert.ok((mod & P.BanMembers) === P.BanMembers, 'moderation can ban');
  assert.ok((mod & P.KickMembers) === P.KickMembers, 'moderation can kick');

  const music = BigInt(permissionsFor('music'));
  assert.ok((music & P.Connect) === P.Connect, 'music can connect');
  assert.ok((music & P.Speak) === P.Speak, 'music can speak');
  assert.ok((music & P.BanMembers) !== P.BanMembers, 'music does not request ban');
});

test('unknown type falls back to the custom permission set', () => {
  assert.equal(permissionsFor('does-not-exist'), permissionsFor('custom'));
});
