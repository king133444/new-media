import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as express from 'express';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 启用CORS
  const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:8000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  // app.enableCors({ origin: corsOrigins, credentials: true });
  app.enableCors({ // 后续上线可加入跨域
    origin: (origin, callback) => {
      callback(null, true); // 允许所有域名
    },
    credentials: true,
  });
  

  // 全局验证管道
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // 全局前缀
  app.setGlobalPrefix('api');

  // 静态文件：对外暴露 /uploads，用于头像与交付物预览/下载
  const uploadsDir = path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsDir));

  // Swagger文档配置
  const config = new DocumentBuilder()
    .setTitle('新媒体工作室管理系统API')
    .setDescription('新媒体工作室管理系统后端API文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config, {
    // 使生成的 OpenAPI 路径包含全局前缀 /api，避免在 Swagger UI 调试时出现 404
    ignoreGlobalPrefix: false,
  });
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 应用运行在: http://localhost:${port}`);
  console.log(`📚 API文档: http://localhost:${port}/api/docs`);
}

bootstrap();

