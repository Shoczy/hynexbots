'use strict';

// Run an isolated DB for these tests before requiring the store.
const os = require('os');
const path = require('path');
const fs = require('fs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hynex-cfg-'));
process.env.HYNEX_DB_PATH = path.join(tmp, 'test.db');

const test = require('node:test');
const assert = require('node:assert');
const store = require('../src/config-service/db');
const { sanitizeSettings } = require('../src/config-service/validate');
const { resolveFeatures } = require('../src/config-service/products');
const { sanitizePermissions } = require('../src/config-service/permissions');

const APP = '100000000000000001';
const OWNER = '200000000000000001';
const MEMBER = '200000000000000002';

test('registerBot + getBot', () => {
  const r = store.registerBot({ appId: APP, name: 'Test', type: 'moderation', ownerId: OWNER, withKey: true });
  assert.equal(r.ok, true);
  assert.ok(r.key, 'a backup key is generated');
  const bot = store.getBot(APP);
  assert.equal(bot.owner_id, OWNER);
  // Duplicate registration is rejected.
  assert.equal(store.registerBot({ appId: APP, name: 'x', type: 'moderation' }).ok, false);
});

test('memberAccess: owner has all permissions', () => {
  const a = store.memberAccess(OWNER, APP);
  assert.equal(a.isOwner, true);
  assert.ok(a.permissions.includes('moderation') && a.permissions.includes('process'));
});

test('members: add, scope, update, remove', () => {
  store.addMember(APP, MEMBER, ['moderation', 'bogus-perm']);
  const a = store.memberAccess(MEMBER, APP);
  assert.equal(a.isOwner, false);
  assert.deepEqual(a.permissions, ['moderation'], 'unknown permission tokens are dropped');

  store.setMemberPermissions(APP, MEMBER, ['moderation', 'process']);
  assert.deepEqual(store.memberAccess(MEMBER, APP).permissions.sort(), ['moderation', 'process']);

  store.removeMember(APP, MEMBER);
  assert.equal(store.memberAccess(MEMBER, APP), null, 'removed member has no access');
});

test('sanitizePermissions drops unknown tokens + de-dupes', () => {
  assert.deepEqual(sanitizePermissions(['basics', 'basics', 'nope', 'process']).sort(), ['basics', 'process']);
  assert.deepEqual(sanitizePermissions('not-an-array'), []);
});

test('config: per-command settings survive save/load (regression)', () => {
  // Historically mergeSettings stripped the open-ended commands map on save.
  const features = resolveFeatures(store.getBot(APP));
  const incoming = sanitizeSettings({ commands: { ban: { enabled: false, roles: ['1'] } } }, features);
  const saved = store.setConfig(APP, incoming);
  assert.equal(saved.commands.ban.enabled, false);
  const reloaded = store.getConfig(APP);
  assert.equal(reloaded.commands.ban.enabled, false, 'command config persists across reload');
});

test('sanitizeSettings enforces product scope', () => {
  const features = resolveFeatures(store.getBot(APP)); // moderation product
  const saved = sanitizeSettings({ modules: { economy: true, moderation: true } }, features);
  assert.equal(saved.modules.economy, false, 'out-of-scope module forced off');
});

test('usage analytics aggregate correctly', () => {
  store.recordUsage(APP, 'ban', 3);
  store.recordUsage(APP, 'ban', 2);
  store.recordUsage(APP, 'kick', 1);
  const s = store.usageSummary(APP, 14);
  assert.equal(s.total, 6);
  assert.equal(s.perCommand.find((c) => c.command === 'ban').count, 5);
  assert.equal(s.perCommand[0].command, 'ban', 'sorted by count desc');
});

test('redeemKey claims an unowned bot', () => {
  const APP2 = '100000000000000002';
  const reg = store.registerBot({ appId: APP2, name: 'Keyed', type: 'tickets', ownerId: null, withKey: true });
  const claimer = '200000000000000099';
  const res = store.redeemKey(reg.key, claimer);
  assert.equal(res.ok, true);
  assert.equal(store.getBot(APP2).owner_id, claimer);
  // Re-redeem by a different user fails.
  assert.equal(store.redeemKey(reg.key, '200000000000000098').ok, false);
});

test('health: no heartbeats means no uptime data', () => {
  const s = store.healthSummary(APP, 14);
  assert.equal(s.uptimePct, null);
  assert.equal(s.lastSeen, null);
  assert.deepEqual(s.byDay, []);
});

test('health: a heartbeat reports 100% uptime and a recent last-seen', () => {
  store.recordHeartbeat(APP);
  const s = store.healthSummary(APP, 14);
  assert.equal(s.uptimePct, 100, 'just-seen bot is fully up');
  assert.ok(typeof s.lastSeen === 'number' && Date.now() - s.lastSeen < 5000, 'last seen is recent');
  assert.ok(s.byDay.length >= 1, 'has a per-day series');
  // Idempotent within a 5-minute slot: a second beat doesn't double-count.
  store.recordHeartbeat(APP);
  assert.equal(store.healthSummary(APP, 14).uptimePct, 100);
});

test('regenerateKey rotates the backup key', () => {
  const APP3 = '100000000000000003';
  const reg = store.registerBot({ appId: APP3, name: 'Rotate', type: 'music', ownerId: OWNER, withKey: true });
  const newKey = store.regenerateKey(APP3);
  assert.notEqual(newKey, reg.key, 'a fresh key is issued');
  assert.equal(store.getBotByKey(reg.key), undefined, 'old key stops working');
  assert.equal(store.getBotByKey(newKey).app_id, APP3, 'new key resolves the bot');
});

test('transferOwner hands the bot over and clears membership', () => {
  const APP4 = '100000000000000004';
  store.registerBot({ appId: APP4, name: 'Xfer', type: 'tickets', ownerId: OWNER, withKey: false });
  const NEW = '200000000000000050';
  store.addMember(APP4, NEW, ['basics']); // new owner was previously a member
  const updated = store.transferOwner(APP4, NEW);
  assert.equal(updated.owner_id, NEW);
  assert.equal(store.memberAccess(NEW, APP4).isOwner, true);
  assert.equal(store.listMembers(APP4).find((m) => m.userId === NEW), undefined, 'new owner dropped from team');
  assert.equal(store.memberAccess(OWNER, APP4), null, 'previous owner loses access');
});

test('bot incidents open (idempotently), resolve, and list newest-first', () => {
  const APP5 = '100000000000000005';
  store.registerBot({ appId: APP5, name: 'Inc', type: 'moderation', ownerId: OWNER, withKey: false });
  store.openBotIncident(APP5, 1000);
  store.openBotIncident(APP5, 1500); // no-op while one is already open
  assert.equal(store.listBotIncidents(APP5).length, 1);
  assert.equal(store.listBotIncidents(APP5)[0].ongoing, true);

  store.resolveBotIncident(APP5, 2000);
  const resolved = store.listBotIncidents(APP5)[0];
  assert.equal(resolved.ongoing, false);
  assert.equal(resolved.resolvedAt, 2000);
  assert.equal(resolved.durationMs, 1000);

  store.openBotIncident(APP5, 3000); // a new outage is a separate incident
  assert.equal(store.listBotIncidents(APP5).length, 2);
  assert.equal(store.listBotIncidents(APP5)[0].startedAt, 3000, 'newest first');
});
