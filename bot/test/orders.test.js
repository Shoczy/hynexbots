'use strict';

// Isolate the JSON store before requiring it.
const os = require('os');
const path = require('path');
const fs = require('fs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hynex-ord-'));
process.env.HYNEX_STORE_PATH = path.join(tmp, 'store.json');

const test = require('node:test');
const assert = require('node:assert');
const orders = require('../src/tickets/orders');

const product = { id: 'moderation', label: 'Moderation', price: '$49' };

test('createOrder starts pending with an id', () => {
  const o = orders.createOrder({ channelId: 'c1', ownerId: 'u1', product, botName: 'Aegis', payment: 'paypal' });
  assert.match(o.id, /^ORD-\d{4}$/);
  assert.equal(o.status, 'pending');
  assert.equal(o.productLabel, 'Moderation');
  assert.equal(orders.getByChannel('c1').id, o.id);
});

test('setStatus moves the order and rejects bad values', () => {
  const u = orders.setStatus('c1', 'paid', 'staff1');
  assert.equal(u.status, 'paid');
  assert.equal(u.updatedBy, 'staff1');
  assert.equal(orders.setStatus('c1', 'bogus'), null, 'invalid status rejected');
  assert.equal(orders.setStatus('no-such-channel', 'paid'), null, 'unknown channel rejected');
});

test('counts + list reflect orders', () => {
  orders.createOrder({ channelId: 'c2', ownerId: 'u2', product });
  const c = orders.counts();
  assert.equal(c.paid, 1);
  assert.equal(c.pending, 1);
  const list = orders.list();
  assert.equal(list.length, 2);
  assert.ok(list[0].number > list[1].number, 'newest first');
  assert.equal(orders.list('paid').length, 1, 'status filter works');
});
