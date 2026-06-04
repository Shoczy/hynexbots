# Hynex Moderation Bot

A ready-made **moderation** bot from the Hynex catalog. It pulls its settings
**live** from the customer's Hynex dashboard — auto-mod, anti-raid, warnings &
escalations, event logging, mod roles — and applies them without a restart.

Config is keyed by the bot's own **Discord Application ID**, so there's nothing
to wire up beyond a token and the shared config key. The bot also reports its
server's roles & channels back to the dashboard, so customers pick from real
drop-downs instead of pasting IDs.

## What it does

| Area | Driven by dashboard setting |
| --- | --- |
| **Auto-mod** | `moderation.automod` — anti-spam, anti-invite, anti-link, mass-mention, caps filter, banned words |
| **Anti-raid** | `moderation.antiRaid` — minimum account age, join-rate spike protection |
| **Warnings** | `moderation.warnings` — auto-escalation (timeout → mute → kick → ban), expiry window |
| **Logging** | `moderation.logging` — joins/leaves, deletes, edits, bans/kicks, role & nickname changes |
| **Roles** | `moderation.roles` — mute role + extra mod roles |
| **Basics** | `basics` — command prefix, embed color, nickname, log channel |
| **Commands** | `commands` — per-command enable + role restrictions |

### Commands

`/ban` `/kick` `/mute` `/unmute` `/warn` `/warnings` `/purge` `/lockdown`
`/help` `/ping` `/serverinfo` `/userinfo` `/avatar`

Every command also works as a **prefix command** using the configured prefix
(default `!`), e.g. `!ban @user spamming`.

## Setup

1. **Register the bot** in the Hynex system so it has a config record:
   ```
   /register-bot app_id:<this bot's application id> name:"Acme Mod" type:moderation
   ```
   (run on the main Hynex bot — this also generates the customer's license key).

2. **Configure** the bot:
   ```bash
   cp .env.example .env
   ```
   Fill in:
   - `DISCORD_TOKEN` — this bot's token (Discord Developer Portal).
   - `CONFIG_API_URL` — where the main Hynex bot's API runs (e.g. `http://host:8787`).
   - `CONFIG_BOT_KEY` — must match `CONFIG_BOT_KEY` / `FLEET_SECRET` on the main bot.

3. **Install & register slash commands:**
   ```bash
   npm install
   npm run deploy            # global; or: DEV_GUILD_ID=<id> npm run deploy for instant testing
   ```

4. **Run:**
   ```bash
   npm start
   ```

### Required Discord settings

In the Developer Portal → **Bot**, enable the **Server Members Intent** and
**Message Content Intent** (used for anti-raid, logging, auto-mod and prefix
commands). Invite the bot with the `bot` + `applications.commands` scopes and the
Ban / Kick / Moderate Members / Manage Messages / Manage Channels permissions.

## How config reaches the bot

```
Dashboard  ──save──▶  Main Hynex bot (config-service :8787)  ◀──poll──  this bot
                                   ▲                                       │
                                   └────────── guild roles/channels ◀──sync┘
```

The bot polls `GET /api/bot/config` every `CONFIG_POLL_SEC` seconds and pushes
its guild structure to `POST /api/bot/sync`. See `src/lib/configClient.js`
(bundled from `examples/bot-config-client`).
