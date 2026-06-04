# Hynex Economy Bot

A ready-made **economy** bot from the Hynex catalog. It pulls its settings
**live** from the customer's Hynex dashboard — currency, rewards, the shop and
gambling — and applies them without a restart. Config is keyed by the bot's own
**Discord Application ID**. Balances are stored locally in `data/economy.db`.

## What it does

| Area | Driven by dashboard setting |
| --- | --- |
| **Currency** | `economy.currencyName`, `economy.currencySymbol`, `economy.startingBalance` |
| **Daily** | `economy.daily` — amount + streak bonus |
| **Work** | `economy.work` — min/max payout + cooldown |
| **Shop** | `economy.shop` — `[{ name, price, roleId, description }]` (buying grants the role) |
| **Leaderboard** | `economy.leaderboard` — on/off |
| **Gambling** | `economy.gambling` — unlocks `/coinflip` and `/slots` |
| **Basics** | `basics` — prefix, embed color, nickname |

### Commands

`/balance` `/daily` `/work` `/pay` `/shop` `/leaderboard` `/coinflip` `/slots`
`/help` `/ping` `/serverinfo` `/userinfo` `/avatar`

All also work with the configured **prefix** (default `!`), e.g. `!daily`,
`!pay @user 100`, `!shop`. (`/coinflip` & `/slots` only pay out when gambling is
enabled in the dashboard.)

## Setup

1. Register it on the main Hynex bot: `/register-bot app_id:<id> name:"…" type:economy`.
2. `cp .env.example .env` and fill in `DISCORD_TOKEN`, `CONFIG_API_URL`, `CONFIG_BOT_KEY`.
3. `npm install` then `npm run deploy` (add `DEV_GUILD_ID=<id>` for instant testing).
4. `npm start`.

Enable the **Message Content Intent** in the Developer Portal (for prefix
commands). If you use shop role-rewards, invite the bot with Manage Roles and
keep its role above the reward roles.

See `src/lib/configClient.js` (bundled from `examples/bot-config-client`) for the
config contract.
