'use strict';

/**
 * Process manager for locally-hosted sold bots. When a bot is registered with
 * its token, the main host spawns the matching `products/<type>-bot` process,
 * supervises it (logs + crash-restart) and relaunches it on startup.
 *
 * Each child gets its config wiring injected via env, so it talks to THIS host's
 * config service with no per-bot .env needed:
 *   DISCORD_TOKEN, CONFIG_API_URL (→ this host's :PORT), CONFIG_BOT_KEY.
 */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const config = require('../config');
const store = require('../config-service/db');

const PRODUCTS_DIR = path.join(__dirname, '..', '..', '..', 'products');
const TYPE_DIR = {
  moderation: 'moderation-bot',
  tickets: 'tickets-bot',
  economy: 'economy-bot',
  music: 'music-bot',
};

const MAX_RESTARTS = 5;
const LOG_CAP = 500; // lines kept per bot for the dashboard log viewer
const procs = new Map(); // appId -> { child, type, name, startedAt, restarts, stopping }
const logBuffers = new Map(); // appId -> [{ t, line, level }]

// Optional callback fired when a bot crash-loops past MAX_RESTARTS. The main bot
// wires this on ready to DM the owner (keeps the launcher free of discord.js).
let crashNotifier = null;
function onCrash(fn) {
  crashNotifier = typeof fn === 'function' ? fn : null;
}

/** Append output to a bot's rolling log buffer (one entry per line). */
function pushLog(appId, chunk, level = 'out') {
  const buf = logBuffers.get(appId) || [];
  for (const raw of String(chunk).split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line) continue;
    buf.push({ t: Date.now(), line: line.slice(0, 1000), level });
  }
  if (buf.length > LOG_CAP) buf.splice(0, buf.length - LOG_CAP);
  logBuffers.set(appId, buf);
}

/** A system note (start/stop/exit) in the log stream. */
function noteLog(appId, line) {
  pushLog(appId, line, 'sys');
}

/** Recent log lines for a bot (oldest first). */
function getLogs(appId) {
  return logBuffers.get(String(appId)) || [];
}

/** Catalog types that ship a runnable product (custom builds don't). */
function isManaged(type) {
  return Boolean(TYPE_DIR[type]);
}

function productDir(type) {
  const d = TYPE_DIR[type];
  return d ? path.join(PRODUCTS_DIR, d) : null;
}

function childEnv(token) {
  return {
    ...process.env,
    DISCORD_TOKEN: token,
    CONFIG_API_URL: `http://localhost:${config.fleet.port}`,
    CONFIG_BOT_KEY: config.api.botKey,
    CONFIG_POLL_SEC: process.env.CONFIG_POLL_SEC || '30',
  };
}

/** Run a command to completion, capturing combined output. */
function run(cmd, args, opts) {
  return new Promise((resolve) => {
    let out = '';
    const c = spawn(cmd, args, opts);
    c.stdout?.on('data', (d) => (out += d));
    c.stderr?.on('data', (d) => (out += d));
    c.on('error', (e) => resolve({ code: -1, out: out + String(e) }));
    c.on('exit', (code) => resolve({ code, out }));
  });
}

async function ensureDeps(dir) {
  if (fs.existsSync(path.join(dir, 'node_modules'))) return true;
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const res = await run(npm, ['install', '--no-audit', '--no-fund'], { cwd: dir, shell: process.platform === 'win32' });
  return res.code === 0;
}

/** Deploy the product's slash commands (instantly to `guildId` when given). */
async function deployCommands(dir, token, guildId) {
  const env = childEnv(token);
  if (guildId) env.DEV_GUILD_ID = String(guildId);
  const res = await run('node', ['src/deploy-commands.js'], { cwd: dir, env });
  return res.code === 0;
}

function spawnChild(appId, type, token, name) {
  const dir = productDir(type);
  const child = spawn('node', ['src/index.js'], { cwd: dir, env: childEnv(token) });
  const prev = procs.get(appId);
  const rec = { child, type, name, token, startedAt: Date.now(), restarts: prev?.restarts || 0, stopping: false };
  procs.set(appId, rec);

  const tag = `[${type}:${name || appId}]`;
  noteLog(appId, '── process started ──');
  child.stdout.on('data', (d) => {
    process.stdout.write(`${tag} ${d}`);
    pushLog(appId, d, 'out');
  });
  child.stderr.on('data', (d) => {
    process.stderr.write(`${tag} ${d}`);
    pushLog(appId, d, 'err');
  });

  child.on('exit', (code) => {
    const r = procs.get(appId);
    if (!r || r.child !== child) return; // superseded by a newer spawn
    if (r.stopping) {
      procs.delete(appId);
      console.log(`${tag} stopped.`);
      noteLog(appId, '── stopped ──');
      return;
    }
    console.warn(`${tag} exited (code ${code}).`);
    noteLog(appId, `── exited (code ${code}) ──`);
    if (r.restarts < MAX_RESTARTS) {
      r.restarts++;
      const delay = Math.min(30_000, 3000 * r.restarts);
      console.log(`${tag} restarting in ${delay / 1000}s (attempt ${r.restarts}/${MAX_RESTARTS}).`);
      noteLog(appId, `── restarting in ${delay / 1000}s (attempt ${r.restarts}/${MAX_RESTARTS}) ──`);
      setTimeout(() => {
        if (procs.get(appId) === r) spawnChild(appId, type, token, name);
      }, delay);
    } else {
      console.error(`${tag} gave up after ${MAX_RESTARTS} restarts.`);
      noteLog(appId, `── gave up after ${MAX_RESTARTS} restarts ──`);
      procs.delete(appId);
      if (crashNotifier) {
        try {
          crashNotifier({ appId, type, name, restarts: MAX_RESTARTS, lastCode: code });
        } catch (e) {
          console.error('crash notifier failed:', e);
        }
      }
    }
  });
  return rec;
}

/**
 * Install deps (first run), deploy commands, then start & supervise the process.
 * Returns { ok, reason?, deployed? }.
 */
async function launch({ appId, type, token, name, guildId, persist = true }) {
  if (!isManaged(type)) return { ok: false, reason: 'no_product' };
  const dir = productDir(type);
  if (!dir || !fs.existsSync(dir)) return { ok: false, reason: 'no_product' };

  if (procs.has(appId)) await stop(appId);

  if (!(await ensureDeps(dir))) return { ok: false, reason: 'install_failed' };
  const deployed = await deployCommands(dir, token, guildId);

  if (persist) store.setProcess({ appId, type, token, guildId, autostart: true });
  spawnChild(appId, type, token, name);
  return { ok: true, deployed };
}

async function stop(appId) {
  const r = procs.get(appId);
  if (!r) return false;
  r.stopping = true;
  try {
    r.child.kill();
  } catch {
    /* already gone */
  }
  procs.delete(appId);
  return true;
}

/** Restart from persisted process info. */
async function restart(appId) {
  const info = store.getProcess(appId);
  if (!info) return { ok: false, reason: 'unknown' };
  const bot = store.getBot(appId);
  return launch({ appId, type: info.type, token: info.token, name: bot?.name, guildId: info.guild_id, persist: true });
}

function statusList() {
  const out = [];
  for (const [appId, r] of procs) {
    out.push({ appId, type: r.type, name: r.name, pid: r.child.pid, uptimeMs: Date.now() - r.startedAt, restarts: r.restarts });
  }
  return out;
}

function isRunning(appId) {
  return procs.has(appId);
}

/** Relaunch every autostart-enabled managed bot (called on main-bot startup). */
async function relaunchAll() {
  const rows = store.listAutostart();
  if (!rows.length) return;
  console.log(`↻ Relaunching ${rows.length} managed bot(s)…`);
  for (const row of rows) {
    const bot = store.getBot(row.app_id);
    if (!bot || bot.status !== 'active') continue;
    launch({ appId: row.app_id, type: row.type, token: row.token, name: bot.name, guildId: row.guild_id, persist: false }).then(
      (r) => {
        if (!r.ok) console.warn(`Could not relaunch ${bot.name} (${row.app_id}): ${r.reason}`);
      },
    );
  }
}

// Kill children when the main bot exits so we don't orphan processes.
function killAll() {
  for (const r of procs.values()) {
    r.stopping = true;
    try {
      r.child.kill();
    } catch {
      /* ignore */
    }
  }
}
process.on('exit', killAll);
process.on('SIGINT', () => {
  killAll();
  process.exit(0);
});
process.on('SIGTERM', () => {
  killAll();
  process.exit(0);
});

module.exports = { launch, stop, restart, relaunchAll, statusList, isManaged, isRunning, getLogs, onCrash };
