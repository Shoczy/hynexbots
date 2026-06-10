'use strict';

/**
 * Tiny FiveM server query helper. FiveM/CitizenFX servers expose a few JSON
 * endpoints over HTTP on their game port:
 *   /info.json     → { vars: { sv_hostname, ... }, ... }
 *   /players.json  → [ { id, name, ping, identifiers[] }, ... ]
 *   /dynamic.json  → { hostname, clients, sv_maxclients, mapname, gametype }
 * We read dynamic + players for a fast, reliable status snapshot. No deps.
 */

/** Normalise a configured host into a base URL (defaults to the FiveM port). */
function baseUrl(host) {
  let h = String(host || '').trim();
  if (!h) return null;
  h = h.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  if (!/:\d+$/.test(h)) h += ':30120'; // default FiveM game port
  return `http://${h}`;
}

async function getJson(url, timeoutMs = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'HynexFiveM/1.0' } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Query a FiveM server. Returns:
 *   { online, hostname, players, maxPlayers, mapname, gametype, list[] }
 * `online: false` when the server can't be reached or no host is configured.
 */
async function queryServer(host) {
  const base = baseUrl(host);
  if (!base) return { online: false, configured: false };

  const [dynamic, players] = await Promise.all([getJson(`${base}/dynamic.json`), getJson(`${base}/players.json`)]);
  if (!dynamic && !players) return { online: false, configured: true };

  const list = Array.isArray(players)
    ? players.map((p) => ({ id: p.id, name: String(p.name || 'Unknown'), ping: p.ping })).slice(0, 1000)
    : [];

  return {
    online: true,
    configured: true,
    hostname: stripColors(dynamic?.hostname || ''),
    players: dynamic?.clients ?? list.length,
    maxPlayers: dynamic?.sv_maxclients ?? null,
    mapname: dynamic?.mapname || '',
    gametype: dynamic?.gametype || '',
    list,
  };
}

/** Strip FiveM/console color codes (^1, ^2, …) from a hostname for clean embeds. */
function stripColors(s) {
  return String(s || '').replace(/\^\d/g, '').trim();
}

module.exports = { queryServer, baseUrl, stripColors };
