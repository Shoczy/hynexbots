const fs = require('fs');
const path = require('path');

/**
 * Tiny JSON-file store. No external DB needed for a shop of this size.
 * Persists the ticket counter and a registry of open tickets.
 */
const DATA_DIR = path.join(__dirname, '..', 'data');
// HYNEX_STORE_PATH lets tests point at a throwaway store file.
const FILE = process.env.HYNEX_STORE_PATH || path.join(DATA_DIR, 'store.json');

const defaults = {
  ticketCounter: 0,
  // channelId -> { ownerId, type, productId, createdAt, claimedBy }
  tickets: {},
  // userId -> timestamp of their last ticket (open-spam cooldown)
  cooldowns: {},
  // Join welcome message — configured live via /welcome.
  welcome: { enabled: false, channelId: null, ticketChannelId: null },
};

function ensure() {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify(defaults, null, 2));
}

function read() {
  ensure();
  try {
    return { ...defaults, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) };
  } catch {
    return { ...defaults };
  }
}

function write(data) {
  ensure();
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

/** Current welcome config (merged over defaults). */
function getWelcome() {
  return { ...defaults.welcome, ...(read().welcome || {}) };
}

/** Patch the welcome config and return the merged result. */
function setWelcome(patch) {
  let out;
  update((d) => {
    d.welcome = { ...defaults.welcome, ...(d.welcome || {}), ...patch };
    out = d.welcome;
  });
  return out;
}

module.exports = {
  read,
  write,
  getWelcome,
  setWelcome,
  update(mutator) {
    const data = read();
    mutator(data);
    write(data);
    return data;
  },
};
