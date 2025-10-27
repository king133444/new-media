module.exports = {
  apps: [
    {
      name: 'new-media-backend',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // 数据库：根据你的实际库名与账号调整。注意 URL 需对 @ 进行编码为 %40
        // 例如 root 密码 Jj123456@，库名 new_media：
        DATABASE_URL: 'mysql://root:Jj123456%40@localhost:3306/new_media',
        // JWT 与上传配置
        JWT_SECRET: 'please-change-me',
        JWT_EXPIRES_IN: '7d',
        UPLOAD_PATH: './uploads',
        MAX_FILE_SIZE: 10485760,
        // CORS（可按需限制来源，多个用逗号分隔；也可留空并通过 Nginx 同源反代）
        CORS_ORIGINS: 'http://8.130.10.227',
      },
    },
  ],
};
