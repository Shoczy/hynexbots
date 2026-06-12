# hynex_chat — Discord ↔ in-game chat bridge

Relays chat both ways between your FiveM server and a Discord channel, through the
Hynex FiveM bot's intake server.

## Requirements
The Hynex FiveM bot must have its **intake server** enabled (set on the bot host):

```
FIVEM_INGRESS_PORT=8090
FIVEM_INGRESS_SECRET=<a long random secret>
```

The intake port must be reachable from your FiveM server (open the port / reverse
proxy it). The same `/report` and `/whitelist/check` intake powers reports and the
in-game whitelist check.

## Install
1. Copy the `hynex_chat` folder into your server's `resources/`.
2. In your `server.cfg`:
   ```
   set hynex_intake_url    "http://YOUR_BOT_HOST:8090"
   set hynex_intake_secret "YOUR_FIVEM_INGRESS_SECRET"
   ensure hynex_chat
   ```
3. In the dashboard: **FiveM → In-game ↔ Discord chat bridge** → enable it and pick
   the Discord channel.

## How it works
- **In-game → Discord:** the resource forwards each chat line (POST `/chat`) to the
  bot, which posts it in the bridge channel (no pings).
- **Discord → in-game:** the resource polls `/chat/pending` every 2s and prints new
  messages in-game as `[Discord] <name>: <message>`.

Secrets live only in `server.cfg` — never commit them.
