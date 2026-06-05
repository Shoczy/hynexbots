'use strict';

const test = require('node:test');
const assert = require('node:assert');
const secrets = require('../src/config-service/secrets');

test('encrypt → decrypt roundtrip', () => {
  const token = 'MTAxfake.token.value-abcDEF123456';
  const enc = secrets.encrypt(token);
  assert.ok(enc.startsWith('enc:v1:'), 'uses the versioned envelope');
  assert.notEqual(enc, token, 'ciphertext differs from plaintext');
  assert.equal(secrets.decrypt(enc), token, 'decrypts back to the original');
});

test('isEncrypted detects the envelope', () => {
  assert.equal(secrets.isEncrypted(secrets.encrypt('x')), true);
  assert.equal(secrets.isEncrypted('plain-legacy'), false);
});

test('decrypt passes through legacy plaintext', () => {
  assert.equal(secrets.decrypt('legacy-plaintext-token'), 'legacy-plaintext-token');
});

test('two encryptions of the same value differ (random IV)', () => {
  assert.notEqual(secrets.encrypt('same'), secrets.encrypt('same'));
});
