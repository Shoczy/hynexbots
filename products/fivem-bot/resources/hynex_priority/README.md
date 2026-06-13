# Queue priority — wiring guide

The Hynex FiveM bot can tell your queue how much **priority** a connecting player
should get, based on the Discord roles of the linked member.

There's no drop-in resource here because every queue script differs — instead the
bot exposes one endpoint your queue calls.

## Setup
1. In the dashboard: **FiveM → Queue priority by role** → enable it and add tiers
   (Discord role → priority number; higher = further up the queue).
2. Members link their in-game identifier with **`/link license:…`** in Discord
   (whitelisted members are linked automatically).
3. Point your queue at the bot's intake (same `hynex_intake_url` + secret as the
   other resources).

## Endpoint
```
GET {intake}/priority?identifier=<player identifier>&secret=<FIVEM_INGRESS_SECRET>
→ { "ok": true, "priority": <number> }   // 0 when not linked / no matching role
```

## Example (in your queue's connect handler)
```lua
local INTAKE = GetConvar('hynex_intake_url', '')
local SECRET = GetConvar('hynex_intake_secret', '')

-- Return a priority number for a connecting player (0 = none).
function GetHynexPriority(identifiers, cb)
  local best, pending = 0, #identifiers
  if pending == 0 then return cb(0) end
  for _, id in ipairs(identifiers) do
    PerformHttpRequest(INTAKE .. '/priority?identifier=' .. id .. '&secret=' .. SECRET, function(code, body)
      if code == 200 and body then
        local ok, data = pcall(json.decode, body)
        if ok and data and data.priority and data.priority > best then best = data.priority end
      end
      pending = pending - 1
      if pending <= 0 then cb(best) end
    end, 'GET', '', { ['x-secret'] = SECRET })
  end
end
```
Feed the returned number into your queue's priority/weight for that player. For
**connectqueue**, call `GetHynexPriority` in your `playerConnecting`/queue hook and
pass the result to its `exports.connectqueue:SetPlayerPriority(license, weight)`
(or equivalent).
