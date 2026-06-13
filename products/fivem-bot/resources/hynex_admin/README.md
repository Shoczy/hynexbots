# hynex_admin — Discord-driven kick/ban

Lets staff kick and ban players on your FiveM server straight from Discord with
`/fivem-admin`, and blocks banned players when they try to reconnect. Talks to
the Hynex FiveM bot's intake server (the same one the chat bridge uses).

## Requirements
The Hynex FiveM bot must have its intake enabled (on the bot host):

```
FIVEM_INGRESS_PORT=8090
FIVEM_INGRESS_SECRET=<a long random secret>
```

The intake port must be reachable from your FiveM server.

## Install
1. Copy the `hynex_admin` folder into your server's `resources/`.
2. In `server.cfg`:
   ```
   set hynex_intake_url    "http://YOUR_BOT_HOST:8090"
   set hynex_intake_secret "YOUR_FIVEM_INGRESS_SECRET"
   ensure hynex_admin
   ```
3. In the dashboard: **FiveM → In-game admin actions** → enable it.

## Usage (Discord)
- `/fivem-admin kick player:<name|id> reason:<…>`
- `/fivem-admin ban  player:<name|id> reason:<…>` — kicks now and blocks them on reconnect.
- `/fivem-admin unban identifier:<license:…>` — lift a ban.
- `/fivem-admin bans` — list active bans.

## How it works
- The resource polls `/admin/pending` every ~3s and executes queued kicks/bans
  (`DropPlayer`). For a ban it reports the player's identifiers to the bot, which
  stores them.
- On `playerConnecting`, the resource checks each identifier against the bot's
  ban list and refuses entry if banned.

Secrets live only in `server.cfg` — never commit them.
