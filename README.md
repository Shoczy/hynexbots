# Hynex Bots

> Premium Discord bots, shipped fast.

A complete Discord bot shop in three parts:

| Folder | What it is |
| --- | --- |
| [`bot/`](bot) | The **main Discord bot** — a ticket-based storefront, a `/fleet` command that monitors bots across all your VPSs, and a built-in **config service** (per-bot settings keyed by Application ID) that powers the customer dashboard. |
| [`agent/`](agent) | A **lightweight agent** you run on each VPS. It reports system + bot status back to the main bot via a secure heartbeat. |
| [`website/`](website) | The **storefront website** — Next.js + Tailwind + Framer Motion, sleek minimal dark, fully responsive. |
| [`dashboard/`](dashboard) | The **customer dashboard** — customers log in with Discord and customize the bot they bought (prefix, modules, and more). |
| [`examples/bot-config-client/`](examples/bot-config-client) | Drop-in module so a sold bot reads its live settings from the dashboard. |

---

## 1. Main bot (`bot/`)

discord.js v14. Posts a storefront panel; customers pick a ready-made bot from a
dropdown or click **Commission a Custom Bot** to open a modal. Either way a private
ticket channel is created with staff controls (claim / close + transcript).
Payments are handled **manually inside each ticket**.

### Setup

```bash
cd bot
npm install
cp .env.example .env      # then fill in the values
npm run deploy            # register slash commands to your server
npm start
```

Fill in `.env`:

- `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID` — from the [Discord Developer Portal](https://discord.com/developers/applications).
- `STAFF_ROLE_ID`, `TICKET_CATEGORY_ID`, `TRANSCRIPT_CHANNEL_ID` — optional ticket settings.
- `FLEET_PORT`, `FLEET_SECRET` — for the VPS monitor (see below).

> Enable the **Message Content Intent** in the Developer Portal → Bot.

### Commands

| Command | Who | Does |
| --- | --- | --- |
| `/panel` | Manage Server | Posts the storefront / ticket panel in the current channel. |
| `/fleet [node]` | Manage Server | Shows live status of every VPS + the bots running on each. |

---

## 2. VPS agent (`agent/`)

Run **one agent per VPS**. Each agent reports CPU, RAM, uptime, and the list of
running bots (auto-discovered via PM2, or a static list) to the main bot every
30 seconds. **Zero dependencies** — pure Node.js.

### Setup (on each VPS)

```bash
cd agent
cp .env.example .env      # set FLEET_URL, FLEET_SECRET, NODE_ID
node agent.js             # or run under pm2: pm2 start agent.js --name hynex-agent
```

- `FLEET_URL` → `http://<your-main-bot-host>:8787` (the machine running `bot/`).
- `FLEET_SECRET` → must match the main bot's `.env`.
- `BOT_SOURCE=pm2` reports all PM2 processes; `BOT_SOURCE=static` reports `BOTS=`.

Then run `/fleet` in Discord to see every node and bot at a glance.

> **Networking:** open the `FLEET_PORT` (default `8787`) on the main bot's host so
> agents can reach it. For production, put it behind HTTPS / a reverse proxy.

---

## 3. Website (`website/`)

Next.js 14 (App Router) · Tailwind CSS · Framer Motion · TypeScript.

```bash
cd website
npm install
npm run dev               # http://localhost:3000
npm run build && npm start
```

Edit content in [`website/lib/data.ts`](website/lib/data.ts) — bots, prices,
FAQ, stats, and your **Discord invite link** (`brand.discordInvite`) that every
"Open a ticket" button points to.

Deploy free on [Vercel](https://vercel.com): import the repo, set the root
directory to `website`, and ship.

---

## 4. Customer dashboard (`dashboard/`)

Where customers customize the bot they bought. Next.js 14 (App Router) with
**Discord OAuth login**. Each bot is identified by its **Discord Application
ID** — the unique identity of the actual bot you delivered (this also means
custom bots fit naturally, and a running bot can fetch its own config).

**The flow**

1. Customer opens a ticket; your team builds & delivers the bot, creating its
   Discord application (which has an **Application ID**).
2. Staff runs `/register-bot app_id:<id> name:"Aether" type:<kind> owner:@customer`.
   Pre-assigning the `owner` means the customer just logs in and the bot is
   **already there** — no key needed. A backup/transfer **key** is generated too.
3. Customer logs into the dashboard and edits settings — **Basics** (prefix,
   embed color, nickname, language, log channel) and **Modules** (toggle
   moderation, economy, music, etc.).

The buyer owns the bot and can invite admins to co-manage.

### Setup

```bash
cd dashboard
npm install
cp .env.local.example .env.local   # fill in Discord OAuth + API key
npm run dev                          # http://localhost:3001
```

In the [Discord Developer Portal](https://discord.com/developers/applications)
→ OAuth2, add the redirect URL `http://localhost:3001/api/auth/callback` (plus
your production URL). Only the `identify` scope is requested. Set
`DASHBOARD_API_KEY` to the **same value** as in the bot's `.env`.

### How settings reach the bot

1. Dashboard saves settings → bot's config service → **SQLite** (`bot/data/hynex.db`),
   keyed by the bot's Application ID.
2. A customer's running bot uses [`examples/bot-config-client`](examples/bot-config-client)
   with its own `client.application.id` to fetch settings over HTTP and re-poll
   for live changes.

> **Sessions** are stored in-memory for the MVP (simple, keeps Discord tokens out
> of the browser). For multi-instance production, swap the `Map` in
> `dashboard/lib/session.ts` for Redis.

### The flow

| Command | Who | Does |
| --- | --- | --- |
| `/register-bot` | Manage Server | Registers a delivered bot (App ID + name + type + owner) so the customer can customize it; returns a backup key. |

---

## Architecture at a glance

```
  Customers ──▶  Website  ──▶  Discord invite / ticket panel
                                      │
                                      ▼
                                 Main bot (bot/)
                                 ├─ Tickets (buy / commission)
                                 ├─ /fleet  ◀── heartbeats ── Agents (agent/) on each VPS
                                 └─ Config service (SQLite: bots + settings, by App ID)
                                         ▲                         │
                                         │ save (API key)          │ fetch own config (App ID)
                                         │                         ▼
                                    Dashboard (dashboard/)   Customer bots on VPSs
                                    Discord login + editor   (bot-config-client)
```

## Notes

- Secrets live only in `.env` files (git-ignored). Never commit real tokens.
- Ticket state persists to `bot/data/store.json` (also git-ignored).
