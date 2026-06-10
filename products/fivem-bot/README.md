# Hynex FiveM Bot

A ready-made Discord bot for FiveM servers. It pulls its configuration live from
the Hynex dashboard — there's nothing to edit in code.

## Features

| Module | What it does | Needs the in-game resource? |
| --- | --- | --- |
| **Live status** | Auto-updating embed + `/status` & `/players` with the live player count | No — queries your server's public JSON endpoints |
| **Whitelist** | `/whitelist add\|remove\|list` grants a Discord role and tracks in-game ids | Role management: no · In-game enforcement: yes |
| **Reports** | In-game `/report` calls forwarded to a Discord channel | Yes |
| **Restarts** | Scheduled restart announcements with countdown warnings | No |

## Setup

1. Copy `.env.example` to `.env` and fill in `DISCORD_TOKEN` + `CONFIG_BOT_KEY`.
2. In the Discord Developer Portal → **Bot → Privileged Gateway Intents**, enable
   **Message Content Intent** and **Server Members Intent**.
3. `npm install` then `npm run deploy` (registers slash commands) and `npm start`.
4. Configure everything (server address, channels, whitelist role, restart times)
   in your Hynex dashboard.

## In-game resource (reports + whitelist enforcement)

These two features need your FiveM server to talk to the bot. Set
`FIVEM_INGRESS_PORT` and `FIVEM_INGRESS_SECRET` in `.env`, then drop this into a
server-side resource (`server.lua`):

```lua
local BOT = "http://YOUR_BOT_HOST:PORT"   -- matches FIVEM_INGRESS_PORT
local SECRET = "YOUR_SECRET"               -- matches FIVEM_INGRESS_SECRET

-- Forward /report to Discord
RegisterCommand("report", function(src, args)
  local reason = table.concat(args, " ")
  PerformHttpRequest(BOT .. "/report", function() end, "POST",
    json.encode({ player = GetPlayerName(src), reason = reason, id = GetPlayerIdentifier(src, 0) }),
    { ["Content-Type"] = "application/json", ["x-secret"] = SECRET })
end, false)

-- Enforce the whitelist on connect
AddEventHandler("playerConnecting", function(name, setReason, deferrals)
  local src = source
  deferrals.defer()
  local id = GetPlayerIdentifier(src, 0) or ""
  deferrals.update("Checking whitelist…")
  PerformHttpRequest(BOT .. "/whitelist/check?identifier=" .. id .. "&secret=" .. SECRET,
    function(status, body)
      local ok = status == 200 and json.decode(body or "{}").allowed
      if ok then deferrals.done() else deferrals.done("You are not whitelisted. Join our Discord.") end
    end, "GET")
end)
```

Leave `FIVEM_INGRESS_PORT` blank to disable the HTTP intake — status, whitelist
management and restart announcements all still work without it.
