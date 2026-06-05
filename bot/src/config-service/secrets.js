'use strict';

/**
 * Encryption-at-rest for the most sensitive values we store in hynex.db —
 * principally the Discord bot tokens in `bot_process`. A DB-only leak (a stray
 * backup, the WAL file, a misconfigured volume) then yields ciphertext, not
 * live tokens.
 *
 * Key resolution, in order:
 *   1. TOKEN_ENCRYPTION_KEY env var (any string; stretched via scrypt). Preferred
 *      in production so the key lives outside the data directory entirely.
 *   2. An auto-generated 32-byte key file at bot/data/.tokenkey (mode 0600).
 *      bot/data/ is gitignored, so the key never lands in version control.
 *
 * Format of an encrypted value: `enc:v1:<base64(iv | authTag | ciphertext)>`.
 * Anything without that prefix is treated as legacy plaintext and returned
 * as-is, so the switch-over is seamless and reversible.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PREFIX = 'enc:v1:';
const ALGO = 'aes-256-gcm';
const IV_LEN = 12;

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const KEY_FILE = path.join(DATA_DIR, '.tokenkey');

let cachedKey = null;

function resolveKey() {
  if (cachedKey) return cachedKey;

  const envKey = process.env.TOKEN_ENCRYPTION_KEY;
  if (envKey && envKey.trim()) {
    // Stretch an arbitrary passphrase to a 32-byte key. Static salt is fine here:
    // the goal is at-rest confidentiality, not password storage.
    cachedKey = crypto.scryptSync(envKey.trim(), 'hynex-token-salt', 32);
    return cachedKey;
  }

  // Fall back to a locally-persisted random key.
  try {
    if (fs.existsSync(KEY_FILE)) {
      cachedKey = Buffer.from(fs.readFileSync(KEY_FILE, 'utf8').trim(), 'hex');
      if (cachedKey.length === 32) return cachedKey;
    }
  } catch {
    /* fall through to regenerate */
  }

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  cachedKey = crypto.randomBytes(32);
  fs.writeFileSync(KEY_FILE, cachedKey.toString('hex'), { mode: 0o600 });
  try {
    fs.chmodSync(KEY_FILE, 0o600);
  } catch {
    /* best-effort on platforms without POSIX perms */
  }
  return cachedKey;
}

/** Encrypt a plaintext string. Returns the `enc:v1:` envelope. */
function encrypt(plaintext) {
  if (plaintext == null) return plaintext;
  const key = resolveKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ct]).toString('base64');
}

/** Decrypt an `enc:v1:` value; pass through anything that isn't encrypted. */
function decrypt(stored) {
  if (typeof stored !== 'string' || !stored.startsWith(PREFIX)) return stored;
  const raw = Buffer.from(stored.slice(PREFIX.length), 'base64');
  const iv = raw.subarray(0, IV_LEN);
  const tag = raw.subarray(IV_LEN, IV_LEN + 16);
  const ct = raw.subarray(IV_LEN + 16);
  const decipher = crypto.createDecipheriv(ALGO, resolveKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

/** True if a stored value is already in encrypted form. */
function isEncrypted(stored) {
  return typeof stored === 'string' && stored.startsWith(PREFIX);
}

module.exports = { encrypt, decrypt, isEncrypted };
