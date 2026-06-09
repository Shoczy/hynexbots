#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  Hynex Bots — one-shot provisioner for the MAIN BOT on Ubuntu 24
# ─────────────────────────────────────────────────────────────
# Installs Node 22 (Ubuntu 24 ships 18, but node:sqlite needs ≥22.5), Caddy and
# PM2, then builds + starts the main bot. The main bot hosts the sold product
# bots itself, so this single process is all PM2 needs to supervise.
#
# Website + dashboard run on Vercel — they are NOT installed here.
#
# Usage (from the repo root, as a sudo-capable user):
#   bash deploy/setup-ubuntu.sh
#
# Re-running is safe: it skips anything already installed.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BOT_DIR="$REPO_ROOT/bot"

say() { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }
have() { command -v "$1" >/dev/null 2>&1; }

# ── Node 22 (via NodeSource) ─────────────────────────────────
need_node=1
if have node; then
  major="$(node -p 'process.versions.node.split(".")[0]')"
  minor="$(node -p 'process.versions.node.split(".")[1]')"
  if [ "$major" -gt 22 ] || { [ "$major" -eq 22 ] && [ "$minor" -ge 5 ]; }; then need_node=0; fi
fi
if [ "$need_node" -eq 1 ]; then
  say "Installing Node.js 22.x (need ≥22.5 for node:sqlite)…"
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  say "Node $(node -v) already meets the requirement — skipping."
fi

# Build tools — harmless, helps if any dependency needs a native rebuild.
say "Ensuring build essentials + git…"
sudo apt-get install -y build-essential python3 git ca-certificates curl

# ── Caddy (reverse proxy + automatic HTTPS for the bot API) ──
if ! have caddy; then
  say "Installing Caddy…"
  sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  sudo apt-get update
  sudo apt-get install -y caddy
else
  say "Caddy already installed — skipping."
fi

# ── PM2 ──────────────────────────────────────────────────────
have pm2 || { say "Installing PM2…"; sudo npm install -g pm2; }

# ── Bot dependencies ─────────────────────────────────────────
say "Installing bot dependencies…"
cd "$BOT_DIR"
npm ci

# ── .env guard ───────────────────────────────────────────────
if [ ! -f "$BOT_DIR/.env" ]; then
  cp "$BOT_DIR/.env.example" "$BOT_DIR/.env"
  cat <<'EOF'

  ⚠  Created bot/.env from the example. EDIT IT before starting — fill in real
     DISCORD_TOKEN, CLIENT_ID, GUILD_ID, and rotate every "change-me" secret
     (FLEET_SECRET, DASHBOARD_API_KEY, TOKEN_ENCRYPTION_KEY). The bot REFUSES to
     start in production with placeholder secrets.

     Re-run this script (or `pm2 start ecosystem.config.js`) once it's filled in.
EOF
  exit 0
fi

# ── Launch under PM2 ─────────────────────────────────────────
say "Starting the bot under PM2…"
pm2 start ecosystem.config.js --update-env
pm2 save

cat <<EOF

✅ Main bot is running under PM2.

Next steps:
  1. Survive reboots:   pm2 startup   # then run the command it prints
  2. Point Caddy at your domain: edit deploy/Caddyfile (api.yourdomain.com),
       sudo cp deploy/Caddyfile /etc/caddy/Caddyfile && sudo systemctl reload caddy
  3. DNS: A record  api.yourdomain.com → this server's IP. Open ports 80 + 443.
  4. Deploy website + dashboard on Vercel (see DEPLOYMENT.md) and register the
     OAuth redirect  https://yourdomain.com/dashboard/api/auth/callback  in Discord.

Logs:  pm2 logs hynex-bot     Status:  pm2 status
EOF
