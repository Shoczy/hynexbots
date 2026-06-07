'use strict';

/**
 * Nightly snapshots of all persistent state:
 *   - hynex.db        — licenses, customer config, team members, encrypted tokens
 *   - store.json      — tickets + the order/invoice pipeline
 *   - incidents.json  — fleet incident history
 *
 * The DB is copied with SQLite's `VACUUM INTO`, which produces a consistent copy
 * even while in use (WAL mode); the JSON stores are plain file copies. Keeps the
 * most recent N snapshots of each.
 *
 * Runs automatically (startBackupSchedule, wired in index.js) and can also be
 * invoked manually: `npm run backup` (see package.json).
 */
const fs = require('fs');
const path = require('path');
const { db } = require('./config-service/db');

const DATA_DIR = path.join(__dirname, '..', 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const KEEP = parseInt(process.env.DB_BACKUP_KEEP || '14', 10);

// Companion JSON stores to snapshot alongside the DB. Honour the same env
// overrides the stores themselves use, so backups follow relocated files.
const JSON_STORES = [
  { src: process.env.HYNEX_STORE_PATH || path.join(DATA_DIR, 'store.json'), prefix: 'store' },
  { src: process.env.HYNEX_INCIDENTS_PATH || path.join(DATA_DIR, 'incidents.json'), prefix: 'incidents' },
];

/** Keep only the newest KEEP snapshots for a given prefix/extension. */
function prunePrefix(prefix, ext) {
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith(`${prefix}-`) && f.endsWith(ext))
    .sort(); // ISO timestamps sort chronologically
  while (files.length > KEEP) {
    const old = files.shift();
    try {
      fs.unlinkSync(path.join(BACKUP_DIR, old));
    } catch {
      /* ignore */
    }
  }
}

function prune() {
  prunePrefix('hynex', '.db');
  for (const { prefix } of JSON_STORES) prunePrefix(prefix, '.json');
}

/** Take one snapshot now. Returns the list of snapshot paths written. */
function runBackup() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const written = [];

  const dbDest = path.join(BACKUP_DIR, `hynex-${stamp}.db`);
  // VACUUM INTO writes a clean, consistent copy. Escape single quotes for SQL.
  db.exec(`VACUUM INTO '${dbDest.replace(/'/g, "''")}'`);
  written.push(dbDest);

  // Plain copies of the JSON stores (skip any that don't exist yet).
  for (const { src, prefix } of JSON_STORES) {
    if (!fs.existsSync(src)) continue;
    const dest = path.join(BACKUP_DIR, `${prefix}-${stamp}.json`);
    fs.copyFileSync(src, dest);
    written.push(dest);
  }

  prune();
  return written;
}

/** Back up now, then every `intervalMs` (default 24h). Failures never crash the bot. */
function startBackupSchedule(intervalMs = 24 * 60 * 60 * 1000) {
  const tick = () => {
    try {
      const written = runBackup();
      console.log(`✔ Backup written: ${written.map((p) => path.basename(p)).join(', ')}`);
    } catch (e) {
      console.error('✖ Backup failed:', e?.message || e);
    }
  };
  tick();
  const t = setInterval(tick, intervalMs);
  if (t.unref) t.unref();
  return t;
}

module.exports = { runBackup, startBackupSchedule };

// Allow `node src/backup.js` for a manual one-off snapshot.
if (require.main === module) {
  try {
    console.log('Backup written:', runBackup().join(', '));
  } catch (e) {
    console.error('Backup failed:', e);
    process.exit(1);
  }
}
