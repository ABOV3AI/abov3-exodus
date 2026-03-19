/**
 * PM2 Ecosystem Configuration - TEST Environment
 *
 * This configuration is specifically for the TEST/STAGING environment.
 * It runs the application in production mode with appropriate resource limits.
 *
 * Environment: TEST (Local VM #2 or staging server)
 * Domain: http://192.168.1.101:3000
 *
 * Usage:
 *   pm2 start ecosystem.config.test.js
 *   pm2 restart ecosystem.config.test.js
 *   pm2 stop ecosystem.config.test.js
 *   pm2 delete ecosystem.config.test.js
 *
 * Monitoring:
 *   pm2 status
 *   pm2 logs abov3-exodus-test
 *   pm2 monit
 *
 * Auto-start on boot:
 *   pm2 save
 *   pm2 startup
 */

module.exports = {
  apps: [
    {
      // Application name (visible in pm2 status)
      name: 'abov3-exodus-test',

      // Script to execute
      script: 'node_modules/next/dist/bin/next',
      args: 'start',

      // Working directory
      cwd: './',

      // Execution mode
      instances: 1,  // Single instance for TEST (can be increased if needed)
      exec_mode: 'fork',  // Use 'cluster' for multiple instances

      // Environment configuration
      env_file: '.env.test',  // Load environment from .env.test

      // Logging configuration
      error_file: './logs/test-error.log',
      out_file: './logs/test-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      log_type: 'json',

      // Auto-restart configuration
      autorestart: true,
      max_restarts: 10,  // Max restarts within min_uptime before considered unstable
      min_uptime: '10s',  // App must run for 10s to be considered started
      restart_delay: 4000,  // Wait 4s before restarting

      // Resource limits
      max_memory_restart: '2G',  // Restart if memory exceeds 2GB

      // Health checks
      listen_timeout: 10000,  // Wait 10s for app to start listening
      kill_timeout: 5000,  // Wait 5s for graceful shutdown

      // Watch and reload (disabled for TEST)
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.next/cache'],

      // Node.js options
      node_args: '--max-old-space-size=2048',  // Limit Node.js heap to 2GB

      // Environment variables (in addition to .env.test)
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // Graceful shutdown
      wait_ready: true,  // Wait for app to send 'ready' signal
      shutdown_with_message: true,

      // Advanced options
      vizion: true,  // Enable version tracking (git metadata)
      post_update: ['npm install', 'npm run build'],  // Run after git pull

      // Monitoring
      instance_var: 'INSTANCE_ID',
      min_uptime: '10s',
      listen_timeout: 10000,

      // Cron restart (optional - restart daily at 3 AM)
      cron_restart: '0 3 * * *',

      // Exponential backoff restart delay (for failing apps)
      exp_backoff_restart_delay: 100,

      // Error handling
      autorestart: true,
      max_restarts: 10,
      restart_delay: 4000,

      // Source map support (for better error traces)
      source_map_support: true,

      // Process title (visible in ps/top)
      instance_var: 'INSTANCE_ID',
    }
  ],

  /**
   * Deployment configuration (optional)
   *
   * Allows using: pm2 deploy ecosystem.config.test.js test setup
   *               pm2 deploy ecosystem.config.test.js test
   */
  deploy: {
    test: {
      user: 'abov3admin',
      host: '192.168.1.101',
      ref: 'origin/main',
      repo: 'git@github.com:abov3ai/exodus.git',
      path: '/home/abov3admin/abov3/abov3-exodus',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.test.js',
      env: {
        NODE_ENV: 'production',
      }
    }
  }
};
