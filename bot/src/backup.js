'use strict';

/**
 * Nightly snapshots of hynex.db — the single file holding licenses, customer
 * config, team members and (encrypted) tokens. Uses SQLite's `VACUUM INTO`, which
 * produces a consistent copy even while the DB is in use (WAL mode), so backups
 * are safe to take from the running process. Keeps the most recent N snapshots.
 *
 * Runs automatically (startBackupSchedule, wired in index.js) and can also be
 * invoked manually: `npm run backup` (see package.json).
 */
const fs = require('fs');
const path = require('path');
const { db } = require('./config-service/db');

const BACKUP_DIR = path.join(__dirname, '..', 'data', 'backups');
const KEEP = parseInt(process.env.DB_BACKUP_KEEP || '14', 10);

function prune() {
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('hynex-') && f.endsWith('.db'))
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

/** Take one snapshot now. Returns the snapshot path. */
function runBackup() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(BACKUP_DIR, `hynex-${stamp}.db`);
  // VACUUM INTO writes a clean, consistent copy. Escape single quotes for SQL.
  db.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
  prune();
  return dest;
}

/** Back up now, then every `intervalMs` (default 24h). Failures never crash the bot. */
function startBackupSchedule(intervalMs = 24 * 60 * 60 * 1000) {
  const tick = () => {
    try {
      const p = runBackup();
      console.log(`✔ DB backup written: ${path.basename(p)}`);
    } catch (e) {
      console.error('✖ DB backup failed:', e?.message || e);
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
    console.log('Backup written:', runBackup());
  } catch (e) {
    console.error('Backup failed:', e);
    process.exit(1);
  }
}
