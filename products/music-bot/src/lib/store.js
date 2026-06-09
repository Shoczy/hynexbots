'use strict';

// Silence the harmless "SQLite is experimental" warning from node:sqlite.
const _emitWarning = process.emitWarning.bind(process);
process.emitWarning = (warning, ...rest) => {
  const opts = rest[0];
  const isExperimentalSqlite =
    (typeof warning === 'string' && warning.includes('SQLite is an experimental')) ||
    (opts && (opts.type === 'ExperimentalWarning' || opts === 'ExperimentalWarning'));
  if (isExperimentalSqlite) return;
  return _emitWarning(warning, ...rest);
};

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'music.db'));
db.exec('PRAGMA journal_mode = WAL;');

module.exports = { db };
