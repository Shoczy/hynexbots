--[[
  Hynex admin bridge — executes /fivem-admin kicks/bans from Discord and blocks
  banned players on reconnect, via the Hynex FiveM bot's intake server.

  server.cfg:
    set hynex_intake_url    "http://YOUR_BOT_HOST:8090"
    set hynex_intake_secret "YOUR_FIVEM_INGRESS_SECRET"
    ensure hynex_admin

  Then enable "In-game admin actions" in the dashboard (FiveM).
]]

local INTAKE_URL = (GetConvar('hynex_intake_url', '')):gsub('/+$', '')
local INTAKE_SECRET = GetConvar('hynex_intake_secret', '')
local headers = { ['Content-Type'] = 'application/json', ['x-secret'] = INTAKE_SECRET }

local function ready()
  return INTAKE_URL ~= '' and INTAKE_SECRET ~= ''
end

if not ready() then
  print('^3[hynex_admin] Set hynex_intake_url and hynex_intake_secret in server.cfg — disabled.^7')
end

-- Find an online player by exact in-game id, else by a case-insensitive name match.
local function findPlayer(target)
  target = tostring(target)
  for _, src in ipairs(GetPlayers()) do
    if tostring(src) == target then return src end
  end
  local needle = string.lower(target)
  for _, src in ipairs(GetPlayers()) do
    if string.find(string.lower(GetPlayerName(src) or ''), needle, 1, true) then return src end
  end
  return nil
end

local function executeAction(a)
  local src = findPlayer(a.target)
  if not src then return end
  if a.type == 'ban' then
    PerformHttpRequest(
      INTAKE_URL .. '/admin/banned',
      function() end,
      'POST',
      json.encode({ identifiers = GetPlayerIdentifiers(src), reason = a.reason, by = a.by, name = GetPlayerName(src) }),
      headers
    )
  end
  DropPlayer(src, ('[%s] %s'):format(a.by or 'Staff', a.reason or (a.type == 'ban' and 'Banned' or 'Kicked')))
end

-- Poll for pending admin actions every 3s.
CreateThread(function()
  if not ready() then return end
  while true do
    Wait(3000)
    PerformHttpRequest(INTAKE_URL .. '/admin/pending?secret=' .. INTAKE_SECRET, function(code, body)
      if code ~= 200 or not body then return end
      local okJson, data = pcall(json.decode, body)
      if okJson and data and data.actions then
        for _, a in ipairs(data.actions) do executeAction(a) end
      end
    end, 'GET', '', headers)
  end
end)

-- Block banned players on connect (checks each of their identifiers).
AddEventHandler('playerConnecting', function(_, _, deferrals)
  if not ready() then return end
  local src = source
  local ids = GetPlayerIdentifiers(src)
  deferrals.defer()
  Wait(0)
  deferrals.update('Checking ban status…')
  if #ids == 0 then
    deferrals.done()
    return
  end
  local pending, finished = #ids, false
  for _, id in ipairs(ids) do
    PerformHttpRequest(INTAKE_URL .. '/admin/banned?identifier=' .. id .. '&secret=' .. INTAKE_SECRET, function(code, body)
      if finished then return end
      local banned, reason = false, 'Banned'
      if code == 200 and body then
        local okJson, data = pcall(json.decode, body)
        if okJson and data and data.banned then
          banned = true
          reason = data.reason ~= '' and data.reason or 'Banned'
        end
      end
      pending = pending - 1
      if banned then
        finished = true
        deferrals.done('⛔ You are banned: ' .. reason)
      elseif pending <= 0 then
        finished = true
        deferrals.done()
      end
    end, 'GET', '', headers)
  end
end)
