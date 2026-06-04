const fs = require('fs');
const path = require('path');

/**
 * Tiny JSON-file store. No external DB needed for a shop of this size.
 * Persists the ticket counter and a registry of open tickets.
 */
const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'store.json');

const defaults = {
  ticketCounter: 0,
  // channelId -> { ownerId, type, productId, createdAt, claimedBy }
  tickets: {},
};

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
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

module.exports = {
  read,
  write,
  update(mutator) {
    const data = read();
    mutator(data);
    write(data);
    return data;
  },
};
