'use strict';

// Isolate config + the incidents file before requiring the store. An offline
// threshold of 0 minutes makes a node count as offline the instant its last
// heartbeat is in the past, so we can drive transitions deterministically.
const os = require('os');
const path = require('path');
const fs = require('fs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hynex-fleet-'));
process.env.HYNEX_INCIDENTS_PATH = path.join(tmp, 'incidents.json');
process.env.FLEET_OFFLINE_AFTER_MIN = '0';

const test = require('node:test');
const assert = require('node:assert');
const fleet = require('../src/fleet/store');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test('first heartbeat is a baseline, not an incident', () => {
  fleet.record({ id: 'node-a' });
  assert.equal(fleet.recentIncidents().length, 0, 'a node coming online for the first time logs nothing');
});

test('a node going quiet opens an ongoing incident', async () => {
  await wait(5); // let the last heartbeat age past the 0-minute threshold
  fleet.evaluate();
  const incidents = fleet.recentIncidents();
  assert.equal(incidents.length, 1);
  assert.equal(incidents[0].node, 'node-a');
  assert.equal(incidents[0].ongoing, true);
  assert.equal(incidents[0].resolvedAt, null);
});

test('a returning heartbeat resolves the incident', () => {
  fleet.record({ id: 'node-a' });
  const incidents = fleet.recentIncidents();
  assert.equal(incidents.length, 1, 'still one incident, now resolved');
  assert.equal(incidents[0].ongoing, false);
  assert.ok(incidents[0].resolvedAt >= incidents[0].startedAt);
});

test('incidents persist to disk', () => {
  const saved = JSON.parse(fs.readFileSync(process.env.HYNEX_INCIDENTS_PATH, 'utf8'));
  assert.equal(saved.length, 1);
  assert.equal(saved[0].node, 'node-a');
});
