'use strict';

module.exports = {
  apps: [
    {
      name: 'webhook-whatsapp-meta',
      script: 'processwhatsapp.js',
      cwd: __dirname,
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_restarts: 20,
      restart_delay: 2000,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
