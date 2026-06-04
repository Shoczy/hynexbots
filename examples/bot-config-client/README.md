# Hynex config client

Drop-in module so a bot you sell can read the settings customers save in the
dashboard. **Zero dependencies** (Node 18+).

Config is keyed by the bot's **Discord Application ID** — which a running bot
already knows via `client.application.id`, so there's nothing extra to wire up.

## Install

Copy `configClient.js` into your bot project.

## Use

```js
const { ConfigClient } = require('./configClient');

client.once('clientReady', async () => {
  const cfg = new ConfigClient({
    baseUrl: process.env.CONFIG_API_URL,  // http://your-main-host:8787
    botKey:  process.env.CONFIG_BOT_KEY,   // matches CONFIG_BOT_KEY / FLEET_SECRET on the main bot
    appId:   client.application.id,         // this bot's own identity
    intervalSec: 30,                        // how often to re-poll for changes
  });

  await cfg.start();

  const prefix = cfg.get('basics.prefix', '!');
  if (cfg.isModuleEnabled('economy')) enableEconomy();

  // React live when the customer changes settings in the dashboard:
  cfg.onChange((settings) => applySettings(settings));
});
```

## API

| Method | Description |
| --- | --- |
| `start()` | Fetch config now, then poll every `intervalSec`. Returns the first settings. |
| `refresh()` | Force an immediate re-fetch. |
| `stop()` | Stop polling. |
| `get(path, fallback)` | Dot-path getter, e.g. `get('basics.embedColor', '#6366f1')`. |
| `isModuleEnabled(name)` | `true`/`false` for a module toggle. |
| `onChange(fn)` | Subscribe to live changes; returns an unsubscribe function. |

## Settings shape

```jsonc
{
  "basics":   { "prefix": "!", "embedColor": "#6366f1", "nickname": "", "language": "en", "logChannelId": "" },
  "modules":  { "moderation": true, "welcome": false, "economy": false, "music": false, "tickets": false, "leveling": false },
  "messages": {
    "welcome": {
      "enabled": false, "channelId": "", "text": "",
      "embed": { "enabled": false, "title": "", "description": "", "color": "#6366f1", "image": "", "footer": "" }
    },
    "leave": { /* same shape as welcome */ },
    "autoresponses": [
      { "id": "…", "trigger": "discord", "match": "contains", "reply": "…", "enabled": true }
    ]
  },
  "commands": {}
}
```

Variables you can use in any text/embed field (your bot substitutes them at
send time): `{user}`, `{username}`, `{memberName}`, `{server}`, `{memberCount}`.
Autoresponse `match` is one of `contains`, `exact`, `startsWith`, `endsWith`.

## Try it

```bash
CONFIG_API_URL=http://localhost:8787 CONFIG_BOT_KEY=yourkey APP_ID=100000000000000001 node example.js
```
