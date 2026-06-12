--[[
  Hynex chat bridge — relays chat both ways between this FiveM server and a
  Discord channel via the Hynex FiveM bot's intake server.

  Configure these in your server.cfg (do NOT hard-code secrets here):
    set hynex_intake_url    "http://YOUR_BOT_HOST:8090"   # the bot's FIVEM_INGRESS_PORT
    set hynex_intake_secret "YOUR_FIVEM_INGRESS_SECRET"   # = the bot's FIVEM_INGRESS_SECRET

  Then enable the chat bridge in the dashboard (FiveM → chat bridge) and pick the
  Discord channel.
]]

local INTAKE_URL = (GetConvar('hynex_intake_url', '')):gsub('/+$', '')
local INTAKE_SECRET = GetConvar('hynex_intake_secret', '')

local headers = { ['Content-Type'] = 'application/json', ['x-secret'] = INTAKE_SECRET }

local function ready()
  return INTAKE_URL ~= '' and INTAKE_SECRET ~= ''
end

if not ready() then
  print('^3[hynex_chat] Set hynex_intake_url and hynex_intake_secret in server.cfg — bridge disabled.^7')
end

-- In-game chat -> Discord
AddEventHandler('chatMessage', function(source, name, message)
  if not ready() or not message or message == '' then return end
  if string.sub(message, 1, 1) == '/' then return end -- skip commands
  local player = GetPlayerName(source) or name or 'Player'
  PerformHttpRequest(INTAKE_URL .. '/chat', function() end, 'POST', json.encode({ player = player, message = message }), headers)
end)

-- Discord -> in-game (poll every 2s)
CreateThread(function()
  if not ready() then return end
  local since = 0
  while true do
    Wait(2000)
    PerformHttpRequest(INTAKE_URL .. '/chat/pending?since=' .. since .. '&secret=' .. INTAKE_SECRET, function(code, body)
      if code ~= 200 or not body then return end
      local okJson, data = pcall(json.decode, body)
      if not okJson or not data or not data.messages then return end
      if data.now then since = data.now end
      for _, m in ipairs(data.messages) do
        TriggerClientEvent('chat:addMessage', -1, {
          color = { 88, 101, 242 },
          multiline = true,
          args = { '[Discord] ' .. (m.author or '?'), m.content or '' },
        })
      end
    end, 'GET', '', headers)
  end
end)
