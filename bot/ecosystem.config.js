// PM2 process definition for the main Hynex bot.
//
// The main bot itself spawns and supervises the sold "product" bots (see
// src/launcher/manager.js), so PM2 only needs to keep THIS one process alive —
// it will bring its managed children back up on restart.
//
//   npm i -g pm2
//   pm2 start ecosystem.config.js
//   pm2 save && pm2 startup   # survive reboots
//
module.exports = {
  apps: [
    {
      name: 'hynex-bot',
      script: 'src/index.js',
      cwd: __dirname,
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      max_memory_restart: '500M',
      time: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
