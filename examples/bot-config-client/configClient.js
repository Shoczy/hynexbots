'use strict';

/**
 * Hynex config client — drop this into any bot you sell so it can read the
 * settings a customer saves in the dashboard. Zero dependencies (Node 18+).
 *
 * Config is keyed by the bot's Discord Application ID, which a running bot
 * already knows (client.application.id) — so there's nothing else to wire up.
 *
 *   const { ConfigClient } = require('./configClient');
 *   client.once('clientReady', async () => {
 *     const cfg = new ConfigClient({
 *       baseUrl: process.env.CONFIG_API_URL,  // http://your-main-host:8787
 *       botKey:  process.env.CONFIG_BOT_KEY,   // matches CONFIG_BOT_KEY/FLEET_SECRET
 *       appId:   client.application.id,        // this bot's own identity
 *     });
 *     await cfg.start();
 *     if (cfg.isModuleEnabled('economy')) enableEconomy();
 *     const prefix = cfg.get('basics.prefix', '!');
 *   });
 */
class ConfigClient {
  constructor({ baseUrl, botKey, appId, intervalSec = 30 }) {
    if (!baseUrl || !botKey || !appId) {
      throw new Error('ConfigClient: baseUrl, botKey and appId are required');
    }
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.botKey = botKey;
    this.appId = String(appId);
    this.intervalSec = intervalSec;
    this.settings = null;
    this._timer = null;
    this._listeners = new Set();
  }

  async fetchOnce() {
    const url = `${this.baseUrl}/api/bot/config?appId=${encodeURIComponent(this.appId)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${this.botKey}` } });
    if (!res.ok) throw new Error(`config fetch failed: ${res.status}`);
    const data = await res.json();
    return data.settings;
  }

  /** Fetch immediately, then poll. Returns the first settings object. */
  async start() {
    await this.refresh();
    this._timer = setInterval(() => this.refresh().catch(() => {}), this.intervalSec * 1000);
    if (this._timer.unref) this._timer.unref();
    return this.settings;
  }

  stop() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  }

  async refresh() {
    const next = await this.fetchOnce();
    const changed = JSON.stringify(next) !== JSON.stringify(this.settings);
    this.settings = next;
    if (changed) for (const fn of this._listeners) fn(this.settings);
    return this.settings;
  }

  /** Subscribe to live config changes. Returns an unsubscribe fn. */
  onChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  /** Dot-path getter with a fallback, e.g. get('basics.prefix', '!'). */
  get(path, fallback = undefined) {
    return path.split('.').reduce((acc, k) => (acc && k in acc ? acc[k] : undefined), this.settings) ?? fallback;
  }

  isModuleEnabled(name) {
    return Boolean(this.settings?.modules?.[name]);
  }

  /**
   * Report this guild's roles & channels to the dashboard so the customer can
   * pick from real lists instead of pasting IDs. Pass a discord.js Guild, or a
   * pre-built payload. Call on `guildCreate`, `roleUpdate`, `channelUpdate`, etc.
   *
   *   client.on('roleUpdate', (r) => cfg.syncGuild(r.guild).catch(() => {}));
   */
  async syncGuild(guildOrPayload) {
    const payload = guildOrPayload?.roles?.cache ? ConfigClient.guildPayload(guildOrPayload) : guildOrPayload;
    const res = await fetch(`${this.baseUrl}/api/bot/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.botKey}` },
      body: JSON.stringify({ appId: this.appId, ...payload }),
    });
    if (!res.ok) throw new Error(`guild sync failed: ${res.status}`);
    return true;
  }

  /** Map a discord.js Guild to a sync payload (drops @everyone). */
  static guildPayload(guild) {
    const roles = [...guild.roles.cache.values()]
      .filter((r) => r.id !== guild.id)
      .map((r) => ({ id: r.id, name: r.name, color: r.color, position: r.position, managed: r.managed }));
    const channels = [...guild.channels.cache.values()].map((c) => ({ id: c.id, name: c.name, type: c.type }));
    return { guildId: guild.id, guildName: guild.name, roles, channels };
  }
}

module.exports = { ConfigClient };
