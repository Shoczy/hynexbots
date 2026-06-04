# Hynex Music Bot

A ready-made **music** bot from the Hynex catalog. It pulls its settings
**live** from the customer's Hynex dashboard — DJ roles, default volume, queue
limit, auto-leave, filters and now-playing announcements — and applies them
without a restart. Config is keyed by the bot's own **Discord Application ID**.

## What it does

| Area | Driven by dashboard setting |
| --- | --- |
| **Volume** | `music.defaultVolume` (0-200) |
| **Queue** | `music.maxQueueLength` |
| **DJ control** | `music.djOnly` + `music.djRoleIds` — limit skip/stop/volume/pause/resume/filter to DJs |
| **Auto-leave** | `music.autoLeaveSec` — leave when idle / left alone (0 = never) |
| **Filters** | `music.allowFilters` — unlocks `/filter` (bassboost, nightcore, vaporwave, treble, 8d) |
| **Announce** | `music.announceNowPlaying` — post a "Now Playing" card |
| **Basics** | `basics` — prefix, embed color, nickname |

### Commands

`/play` `/pause` `/resume` `/skip` `/stop` `/queue` `/nowplaying` `/volume` `/filter`
`/help` `/ping` `/serverinfo` `/userinfo` `/avatar`

Most also work with the configured **prefix** (default `!`), e.g. `!play lofi`,
`!skip`, `!volume 80`.

## Audio stack

Uses **@discordjs/voice** with `play-dl` (YouTube search/stream), `ffmpeg-static`,
`libsodium-wrappers` (encryption) and `opusscript` — **no native build step**.
Audio sourcing is isolated in `src/lib/sources.js` so it can be swapped.

> ⚠️ **YouTube extraction is maintenance-prone.** If playback stops working after
> a YouTube-side change, updating `play-dl` is usually the fix. Live voice
> playback must be tested with a real token in a real voice channel — it can't be
> verified headlessly.

## Setup

1. Register it on the main Hynex bot: `/register-bot app_id:<id> name:"…" type:music`.
2. `cp .env.example .env` and fill in `DISCORD_TOKEN`, `CONFIG_API_URL`, `CONFIG_BOT_KEY`.
3. `npm install` then `npm run deploy` (add `DEV_GUILD_ID=<id>` for instant testing).
4. `npm start`.

Enable the **Message Content Intent** in the Developer Portal (for prefix
commands). Invite the bot with `bot` + `applications.commands` and the **Connect**
+ **Speak** voice permissions. `ffmpeg-static` ships the FFmpeg binary, so no
system FFmpeg install is required.

See `src/lib/configClient.js` (bundled from `examples/bot-config-client`) for the
config contract.
