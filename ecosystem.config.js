'use strict';

const path = require('path');

module.exports = {
  apps: [
    {
      name: 'webhook-whatsapp-meta',
      script: './processwhatsapp.js',
      cwd: path.join(__dirname, 'backend'),
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      max_restarts: 20,
      min_uptime: '10s',
      restart_delay: 2000,
      error_file: path.join(__dirname, 'backend/logs/webhook-whatsapp-meta.error.log'),
      out_file: path.join(__dirname, 'backend/logs/webhook-whatsapp-meta.out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
    },
    {
      name: 'app-server',
      script: './app.js',
      cwd: path.join(__dirname, 'backend'),
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      max_restarts: 20,
      min_uptime: '10s',
      restart_delay: 2000,
      error_file: path.join(__dirname, 'backend/logs/app-server.error.log'),
      out_file: path.join(__dirname, 'backend/logs/app-server.out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3001,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
    },
    {
      name: 'frontend-dev',
      script: 'npm',
      args: 'run vite',
      cwd: path.join(__dirname, 'frontend'),
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_restarts: 20,
      min_uptime: '10s',
      restart_delay: 2000,
      error_file: path.join(__dirname, 'backend/logs/frontend-dev.error.log'),
      out_file: path.join(__dirname, 'backend/logs/frontend-dev.out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'production',
      },
      env_development: {
        NODE_ENV: 'development',
      },
    },
  ],

  deploy: {
    production: {
      user: process.env.DEPLOY_USER || 'deploy',
      host: process.env.DEPLOY_HOST || 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/your-project.git',
      path: '/var/www/your-app',
      'post-deploy': 'npm install && npm run build',
    },
  },
};
