# Deployment

Running Hynex Bots 24/7 in production. The **main bot** hosts and supervises the
sold "product" bots itself, so you only need a process manager for the one main
process — it relaunches its managed children on startup.

## Environment

Set these in `bot/.env` (never commit it):

| Variable | Purpose |
| --- | --- |
| `DISCORD_TOKEN` | Main bot token |
| `CLIENT_ID`, `GUILD_ID` | App id + dev guild for instant slash-command deploys |
| `FLEET_SECRET` | Auth for VPS heartbeat agents |
| `DASHBOARD_API_KEY` | Shared secret for the Next.js dashboard → config API |
| `CONFIG_BOT_KEY` | Secret a sold bot uses to fetch its config |
| `TOKEN_ENCRYPTION_KEY` | **Recommended.** Encrypts stored bot tokens at rest. If unset, a key is auto-generated at `bot/data/.tokenkey` |
| `DB_BACKUP_KEEP` | Snapshots to retain (default 14) |

> The bot **refuses to start in `NODE_ENV=production` with default/placeholder
> secrets** (`change-me…`). Set real values first.

## Process manager

### PM2 (cross-platform, recommended)

```bash
cd bot
npm ci
npm i -g pm2
pm2 start ecosystem.config.js
pm2 save        # remember the process list
pm2 startup     # generate the boot script (follow its printed instructions)
```

Useful: `pm2 logs hynex-bot`, `pm2 restart hynex-bot`, `pm2 status`.

### NSSM (Windows service alternative)

```powershell
nssm install HynexBot "C:\Program Files\nodejs\node.exe" "C:\path\to\bot\src\index.js"
nssm set HynexBot AppDirectory "C:\path\to\bot"
nssm set HynexBot AppEnvironmentExtra NODE_ENV=production
nssm start HynexBot
```

## Database backups

`hynex.db` (licenses, customer config, team members, encrypted tokens) is
snapshotted automatically: one backup on boot, then every 24h, into
`bot/data/backups/` (last `DB_BACKUP_KEEP` kept). Manual snapshot:

```bash
cd bot && npm run backup
```

Treat `bot/data/` as secret and back it up off-box too.

## Website & dashboard

Both are Next.js apps deployed to Vercel (or any Node host):

```bash
cd website && npm ci && npm run build && npm start
cd dashboard && npm ci && npm run build && npm start
```

Point the dashboard's `CONFIG_API_URL` + `DASHBOARD_API_KEY` and the website's
`NEXT_PUBLIC_FLEET_STATUS_URL` at the main bot's public host (HTTPS).
