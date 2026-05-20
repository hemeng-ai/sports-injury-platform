/**
 * PM2 进程管理配置 — 运动损伤资料平台
 * 启动: pm2 start ecosystem.config.js
 * 管理: pm2 status / logs / restart / stop
 */
module.exports = {
  apps: [
    {
      name: "sports-injury-platform",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: "./",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // 日志轮转
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      merge_logs: true,
      // 稳定性配置
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 3000,
      // Windows 兼容
      kill_timeout: 5000,
      // 监听文件变化自动重启（生产环境关闭）
      watch: false,
    },
  ],
};
