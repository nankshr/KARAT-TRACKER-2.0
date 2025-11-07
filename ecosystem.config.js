module.exports = {
  apps: [{
    name: 'karat-tracker',
    script: 'npm',
    args: 'run preview',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // PM2 Configuration Options
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',

    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

    // Advanced PM2 Features
    min_uptime: '10s',
    max_restarts: 10,

    // Environment variables that will be available in the app
    env_file: '.env'
  }]
};