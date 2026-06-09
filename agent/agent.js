'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// ── Minimal .env loader (no dependencies) ─────────────
function loadEnv() {
  const file = path.join(__dirname, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv();

const FLEET_URL = (process.env.FLEET_URL || '').replace(/\/$/, '');
const FLEET_SECRET = process.env.FLEET_SECRET || '';
const NODE_ID = process.env.NODE_ID || os.hostname();
const INTERVAL_SEC = parseInt(process.env.INTERVAL_SEC || '30', 10);
const BOT_SOURCE = (process.env.BOT_SOURCE || 'pm2').toLowerCase();
const STATIC_BOTS = (process.env.BOTS || '').split(',').map((s) => s.trim()).filter(Boolean);

if (!FLEET_URL || !FLEET_SECRET) {
  console.error('✖ FLEET_URL and FLEET_SECRET are required. Copy .env.example to .env.');
  process.exit(1);
}

// ── CPU usage sampled across the interval ─────────────
function cpuSnapshot() {
  let idle = 0;
  let total = 0;
  for (const cpu of os.cpus()) {
    for (const t of Object.values(cpu.times)) total += t;
    idle += cpu.times.idle;
  }
  return { idle, total };
}
let lastCpu = cpuSnapshot();

function cpuPercent() {
  const now = cpuSnapshot();
  const idleDiff = now.idle - lastCpu.idle;
  const totalDiff = now.total - lastCpu.total;
  lastCpu = now;
  if (totalDiff <= 0) return 0;
  return Math.max(0, Math.min(100, 100 * (1 - idleDiff / totalDiff)));
}

// ── Discover bots ─────────────────────────────────────
function getBotsFromPm2() {
  return new Promise((resolve) => {
    exec('pm2 jlist', { timeout: 8000, maxBuffer: 4 * 1024 * 1024 }, (err, stdout) => {
      if (err) return resolve(null); // PM2 not installed / no daemon
      try {
        const list = JSON.parse(stdout);
        resolve(
          list.map((p) => ({
            id: p.pm_id ?? p.pm2_env?.pm_id ?? null, // PM2 process id, shown in /fleet
            name: p.name,
            status: p.pm2_env?.status || 'unknown',
            cpu: p.monit?.cpu ?? null,
            mem: p.monit?.memory ? Math.round(p.monit.memory / 1024 / 1024) : null, // MB
            restarts: p.pm2_env?.restart_time ?? null,
          })),
        );
      } catch {
        resolve(null);
      }
    });
  });
}

async function getBots() {
  if (BOT_SOURCE === 'pm2') {
    const bots = await getBotsFromPm2();
    if (bots) return bots;
    console.warn('⚠ PM2 not available — falling back to static BOTS list.');
  }
  return STATIC_BOTS.map((name) => ({ name, status: 'online' }));
}

// ── Build + send the heartbeat ────────────────────────
async function sendHeartbeat() {
  const payload = {
    id: NODE_ID,
    hostname: os.hostname(),
    cpu: cpuPercent(),
    mem: { used: os.totalmem() - os.freemem(), total: os.totalmem() },
    uptime: Math.round(os.uptime()),
    bots: await getBots(),
  };

  try {
    const res = await fetch(`${FLEET_URL}/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${FLEET_SECRET}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`✖ Heartbeat rejected (${res.status})`);
    } else {
      console.log(`✔ Heartbeat sent — ${payload.bots.length} bot(s), CPU ${payload.cpu.toFixed(0)}%`);
    }
  } catch (err) {
    console.error('✖ Heartbeat failed:', err.message);
  }
}

console.log(`Hynex agent "${NODE_ID}" → ${FLEET_URL} every ${INTERVAL_SEC}s (source: ${BOT_SOURCE})`);
// Prime CPU sample, then start reporting.
setTimeout(() => {
  sendHeartbeat();
  setInterval(sendHeartbeat, INTERVAL_SEC * 1000);
}, 1000);
