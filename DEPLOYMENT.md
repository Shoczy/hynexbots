# Deployment

Production setup: the **main bot** runs on an **Ubuntu server** (it hosts and
supervises the sold "product" bots itself), and the **website + dashboard** run
on **Vercel** as one origin (the website proxies `/dashboard` to the dashboard).

```
            Customers
               │  https://yourdomain.com
               ▼
   ┌───────────────────────────┐         ┌──────────────────────────────┐
   │  Vercel                    │         │  Ubuntu 24 server            │
   │  • website  (yourdomain)   │         │  • main bot + config/fleet   │
   │    └─ proxies /dashboard ──┼──┐      │    API  (PM2, :8787)         │
   │  • dashboard (/dashboard)  │  │      │  • product bots (spawned)    │
   └───────────────┬───────────┘  │      │  • Caddy → api.yourdomain    │
                   │ CONFIG_API_URL│      └──────────────┬───────────────┘
                   └───────────────┴── https://api.yourdomain.com ──┘
```

> Replace `yourdomain.com` everywhere with your real domain.

---

## 1. Ubuntu server — the main bot

### Quick path

```bash
git clone <your-repo> hynex && cd hynex
bash deploy/setup-ubuntu.sh      # installs Node 22, Caddy, PM2; builds + starts the bot
```

The script stops after creating `bot/.env` so you can fill it in, then re-run it
(or `cd bot && pm2 start ecosystem.config.js`).

### What it does (manual equivalent)

```bash
# Node 22 (Ubuntu 24 ships 18; node:sqlite needs ≥22.5)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs
cd bot && npm ci
cp .env.example .env             # fill it in (see below), then:
npm i -g pm2
pm2 start ecosystem.config.js
pm2 save && pm2 startup          # survive reboots (run the printed command)
```

### `bot/.env` (server secrets — never commit)

| Variable | Value |
| --- | --- |
| `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID` | Main bot identity + dev guild for instant slash deploys |
| `NODE_ENV` | `production` |
| `FLEET_SECRET` | Random — auth for VPS heartbeat agents |
| `DASHBOARD_API_KEY` | Random — **must match** the dashboard's Vercel env |
| `CONFIG_BOT_KEY` | Random — secret a sold bot uses to fetch its config (defaults to `FLEET_SECRET`) |
| `TOKEN_ENCRYPTION_KEY` | `openssl rand -hex 32` — encrypts stored product-bot tokens |
| `DASHBOARD_URL` | `https://yourdomain.com` (used in onboarding DMs; the bot appends `/dashboard`) |

> The bot **refuses to start in production with placeholder `change-me…` secrets.**

### HTTPS for the bot API (Caddy)

Remote agents + the public status page hit the bot's API over TLS. Keep `:8787`
bound to localhost; only Caddy is public.

```bash
# edit the domain in deploy/Caddyfile → api.yourdomain.com
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

DNS: `A  api.yourdomain.com → server IP`. Open ports **80 + 443**.

### Product bots

You don't deploy them separately — register each via the main bot in Discord
(`/register-bot type:<type> token:<bot-token> owner:@customer`, or `/bots host`).
The bot installs their deps, **deploys their slash commands**, and supervises the
process; it relaunches them on reboot. Enable **Server Members** + **Message
Content** intents on each product bot's application in the Developer Portal.

---

## 2. Vercel — website + dashboard (one origin)

Create **two projects** from the same repo, different root directories.

### Website project (root: `website`)

| Env | Value |
| --- | --- |
| `DASHBOARD_ORIGIN` | the dashboard deployment URL, e.g. `https://hynex-dashboard.vercel.app` |
| `NEXT_PUBLIC_FLEET_STATUS_URL` | `https://api.yourdomain.com/public/status` |
| `NEXT_PUBLIC_DISCORD_INVITE` | your Discord invite |
| `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_STAT_*` | branding / headline figures |

Attach your domain `yourdomain.com` here. The website's `next.config.mjs` rewrites
`/dashboard/*` → `DASHBOARD_ORIGIN`, so customers reach the dashboard at
`https://yourdomain.com/dashboard` — one origin, one cookie.

### Dashboard project (root: `dashboard`)

Mounted under `/dashboard` (basePath). No custom domain needed — the website
proxies to it.

| Env | Value |
| --- | --- |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | OAuth app credentials |
| `DISCORD_REDIRECT_URI` | `https://yourdomain.com/dashboard/api/auth/callback` |
| `SESSION_SECRET` | `openssl rand -hex 32` — **required in production** |
| `DASHBOARD_API_KEY` | **same value** as the bot's |
| `CONFIG_API_URL` | `https://api.yourdomain.com` (the Ubuntu bot via Caddy) |

### Discord Developer Portal → OAuth2 → Redirects

Add exactly: `https://yourdomain.com/dashboard/api/auth/callback`

---

## Database backups

All persistent state is snapshotted automatically — `hynex.db` (licenses, config,
team members, encrypted tokens) + `store.json` (tickets/orders) + `incidents.json`.
One backup on boot, then every 24h, into `bot/data/backups/` (last `DB_BACKUP_KEEP`
kept). Manual: `cd bot && npm run backup`. **Treat `bot/data/` as secret and back
it up off-box.**

---

## Go-live checklist

- [ ] `bot/.env` filled, real secrets, `NODE_ENV=production`
- [ ] `pm2 status` shows `hynex-bot` online; `pm2 save && pm2 startup` done
- [ ] `api.yourdomain.com` resolves + serves HTTPS (`curl https://api.yourdomain.com/public/status`)
- [ ] Vercel website live at `yourdomain.com`; `/dashboard` loads (proxy works)
- [ ] OAuth redirect URI registered; login round-trips
- [ ] Each product bot registered/hosted via `/register-bot` or `/bots host`, with intents enabled
