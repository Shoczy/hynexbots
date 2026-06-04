# Hynex Tickets Bot

A ready-made **ticket / support** bot from the Hynex catalog. It pulls its
settings **live** from the customer's Hynex dashboard — staff roles, the panel,
ticket categories, claiming, transcripts and limits — and applies them without a
restart. Config is keyed by the bot's own **Discord Application ID**.

## What it does

| Area | Driven by dashboard setting |
| --- | --- |
| **Panel** | `tickets.panel` — title, description, button label (or a topic menu when categories exist) |
| **Topics** | `tickets.categories` — `[{ label, emoji }]` shown as a select menu |
| **Routing** | `tickets.staffRoleIds` + `tickets.categoryId` — who gets access, where channels are created |
| **Claiming** | `tickets.claiming` — adds a "Claim" button for staff |
| **Transcripts** | `tickets.transcripts` — posts a `.txt` log to a channel on close |
| **Limits** | `tickets.maxOpenPerUser` — open-ticket cap per member |
| **Copy** | `tickets.openMessage` — first message inside a new ticket |
| **Basics** | `basics` — prefix, embed color, nickname |

### Commands

`/ticket-panel` (admin) `/ticket` `/close` `/add` `/remove`
`/help` `/ping` `/serverinfo` `/userinfo` `/avatar`

Tickets are also openable from the **panel button / topic menu**, and the same
commands work with the configured **prefix** (default `!`), e.g. `!ticket`, `!close`.

## Setup

1. Register it on the main Hynex bot: `/register-bot app_id:<id> name:"…" type:tickets`.
2. `cp .env.example .env` and fill in `DISCORD_TOKEN`, `CONFIG_API_URL`, `CONFIG_BOT_KEY`.
3. `npm install` then `npm run deploy` (add `DEV_GUILD_ID=<id>` for instant testing).
4. `npm start`, then run `/ticket-panel` in the channel where you want the panel.

Enable the **Message Content Intent** in the Developer Portal (for prefix
commands). Invite with `bot` + `applications.commands` and the Manage Channels /
Manage Roles permissions so it can create and lock ticket channels.

See `src/lib/configClient.js` (bundled from `examples/bot-config-client`) for the
config contract.
