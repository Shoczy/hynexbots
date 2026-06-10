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
const { resolveFeatures, featuresFromModules } = require('../src/config-service/products');
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
  const features = resolveFeatures(store.getBot(APP)); // moderation (Security) product
  const saved = sanitizeSettings({ modules: { fivem: true, moderation: true } }, features);
  assert.equal(saved.modules.fivem, false, 'out-of-scope module forced off');
});

test('module toggles persist across save/reload (regression)', () => {
  // Historically defaultSettings().modules listed only a few keys, so mergeSettings
  // dropped the rest on save — toggling antinuke/verification ON silently reverted.
  const features = resolveFeatures(store.getBot(APP)); // moderation (Security)
  const incoming = sanitizeSettings(
    { modules: { moderation: true, antinuke: true, verification: true, welcome: true } },
    features,
  );
  store.setConfig(APP, incoming);
  const back = store.getConfig(APP);
  assert.equal(back.modules.antinuke, true, 'antinuke persists');
  assert.equal(back.modules.verification, true, 'verification persists');
  assert.equal(back.modules.welcome, true, 'welcome persists');
});

test('sanitizeLeveling clamps values and keeps only valid role rewards', () => {
  const saved = sanitizeSettings({
    leveling: {
      xpPerMessage: { min: 40, max: 10 }, // max < min → clamped up to min
      cooldownSec: 99999, // over the 3600 cap
      levelUp: { enabled: true, channelId: '123', message: 'Level {level}!' },
      stackRewards: false,
      rewards: [
        { level: 5, roleId: '111111111111111111' }, // valid
        { level: 10, roleId: 'not-a-snowflake' }, // dropped: no roleId
      ],
      noXpRoleIds: ['222222222222222222', 'bad'],
    },
  });
  const lv = saved.leveling;
  assert.equal(lv.xpPerMessage.max, 40, 'max is raised to at least min');
  assert.equal(lv.cooldownSec, 3600, 'cooldown clamped to max');
  assert.equal(lv.rewards.length, 1, 'reward without a valid role is dropped');
  assert.ok(lv.rewards[0].id, 'reward gets a generated id');
  assert.deepEqual(lv.noXpRoleIds, ['222222222222222222'], 'non-snowflake role ids dropped');
});

test('moderation product is now a multi-module guardian', () => {
  const APP6 = '100000000000000006';
  store.registerBot({ appId: APP6, name: 'Guardian', type: 'moderation', ownerId: OWNER, withKey: false });
  const f = resolveFeatures(store.getBot(APP6));
  assert.ok(f.modules.includes('verification') && f.modules.includes('welcome'), 'bundles verification + welcome');
  assert.ok(f.tabs.includes('verification') && f.tabs.includes('modules'), 'exposes verification + modules tabs');
  // The bundled modules can actually be enabled (not clamped off as out-of-scope).
  const saved = sanitizeSettings({ modules: { welcome: true, verification: true, fivem: true } }, f);
  assert.equal(saved.modules.welcome, true, 'welcome is in scope');
  assert.equal(saved.modules.verification, true, 'verification is in scope');
  assert.equal(saved.modules.fivem, false, 'fivem stays out of scope');
});

test('security bot bundles only security-relevant modules', () => {
  const APP7 = '100000000000000007';
  store.registerBot({ appId: APP7, name: 'Guardian2', type: 'moderation', ownerId: OWNER, withKey: false });
  const f = resolveFeatures(store.getBot(APP7));
  for (const m of ['moderation', 'verification', 'antinuke', 'welcome']) {
    assert.ok(f.modules.includes(m), `bundles ${m}`);
  }
  // Reaction roles + leveling are NOT part of the security scope.
  assert.ok(!f.modules.includes('reactionroles'), 'no reaction roles');
  assert.ok(!f.modules.includes('leveling'), 'no leveling');
  const saved = sanitizeSettings({ modules: { antinuke: true, reactionroles: true, leveling: true } }, f);
  assert.equal(saved.modules.antinuke, true);
  assert.equal(saved.modules.reactionroles, false, 'reaction roles forced off (out of scope)');
  assert.equal(saved.modules.leveling, false, 'leveling forced off (out of scope)');
});

test('sanitizeReactionRoles drops roles without an id/label and caps panels', () => {
  const saved = sanitizeSettings({
    reactionRoles: {
      panels: [
        {
          channelId: '123456789012345678',
          title: '',
          roles: [
            { roleId: '111111111111111111', label: 'Gamer', emoji: '🎮' },
            { roleId: 'bad', label: 'Nope' }, // dropped — invalid role id
            { roleId: '222222222222222222', label: '' }, // dropped — no label
          ],
        },
      ],
    },
  });
  const p = saved.reactionRoles.panels[0];
  assert.equal(p.roles.length, 1, 'only the valid role survives');
  assert.ok(p.roles[0].id, 'role gets a generated id');
  assert.ok(p.title.length > 0, 'empty title falls back');
});

test('sanitizeAntiNuke clamps limits and validates punishment', () => {
  const saved = sanitizeSettings({
    antiNuke: {
      punishment: 'nuke-them', // invalid → default
      limits: { ban: { enabled: true, max: 999, perSeconds: 1 } },
      whitelistUserIds: ['709393455519891486', 'bad'],
    },
  });
  const a = saved.antiNuke;
  assert.equal(a.punishment, 'strip', 'invalid punishment falls back to default');
  assert.equal(a.limits.ban.max, 100, 'max clamped to 100');
  assert.equal(a.limits.ban.perSeconds, 5, 'perSeconds clamped up to the 5s floor');
  assert.deepEqual(a.whitelistUserIds, ['709393455519891486'], 'invalid ids dropped');
});

test('sanitizeVerification keeps valid ids and falls back on empty text', () => {
  const saved = sanitizeSettings({
    verification: { channelId: '123456789012345678', roleId: 'nope', title: '', buttonLabel: 'Unlock' },
  });
  const v = saved.verification;
  assert.equal(v.channelId, '123456789012345678', 'valid snowflake kept');
  assert.equal(v.roleId, '', 'invalid role id dropped');
  assert.ok(v.title.length > 0, 'empty title falls back to default');
  assert.equal(v.buttonLabel, 'Unlock', 'custom button label kept');
});

test('fivem product exposes its own scope', () => {
  const APP8 = '100000000000000008';
  store.registerBot({ appId: APP8, name: 'Convoy', type: 'fivem', ownerId: OWNER, withKey: false });
  const f = resolveFeatures(store.getBot(APP8));
  for (const m of ['fivem', 'welcome']) {
    assert.ok(f.modules.includes(m), `bundles ${m}`);
  }
  assert.ok(f.tabs.includes('fivem') && f.tabs.includes('modules'), 'exposes fivem + modules tabs');
  assert.ok(f.commandGroups.includes('fivem'), 'includes the fivem command group');
  const saved = sanitizeSettings({ modules: { fivem: true, welcome: true, moderation: true } }, f);
  assert.equal(saved.modules.fivem, true);
  assert.equal(saved.modules.welcome, true);
  assert.equal(saved.modules.moderation, false, 'out-of-scope module forced off');
});

test('sanitizeFivem clamps refresh, drops bad times, sorts warnings', () => {
  const saved = sanitizeSettings({
    fivem: {
      server: { host: '  1.2.3.4:30120 ', name: 'My RP' },
      status: { enabled: true, channelId: '123456789012345678', refreshSec: 5 }, // below the 30s floor
      whitelist: { enabled: true, roleId: 'nope' }, // invalid id dropped
      restarts: { enabled: true, channelId: '123456789012345678', times: ['04:00', '16:00', '25:99', 'xx'], warnMinutes: [5, 15, 1, 999] },
    },
  });
  const fv = saved.fivem;
  assert.equal(fv.server.host, '1.2.3.4:30120', 'host trimmed');
  assert.equal(fv.status.refreshSec, 30, 'refresh clamped up to the 30s floor');
  assert.equal(fv.whitelist.roleId, '', 'invalid whitelist role dropped');
  assert.deepEqual(fv.restarts.times, ['04:00', '16:00'], 'invalid times dropped');
  assert.deepEqual(fv.restarts.warnMinutes, [15, 5, 1], 'warnings filtered + sorted desc');
});

test('featuresFromModules surfaces each module’s settings tab', () => {
  const f = featuresFromModules(['fivem', 'leveling', 'welcome', 'bogus']);
  assert.ok(f.tabs.includes('fivem') && f.tabs.includes('leveling'), 'system tabs are surfaced');
  assert.ok(f.tabs.includes('messages'), 'welcome maps to the messages tab');
  assert.ok(!f.modules.includes('bogus'), 'unknown modules are dropped');
  assert.ok(f.commandGroups.includes('utility'), 'utility commands always included');
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
