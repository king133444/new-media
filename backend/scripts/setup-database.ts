import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run(command: string) {
  execSync(command, { stdio: 'inherit', env: process.env });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log('env', process.env);
    
    console.error('错误: 未检测到 DATABASE_URL 环境变量，请先在 backend/.env 配置数据库连接');
    process.exit(1);
  }

  console.log('> 1/3 生成 Prisma Client');
  await run('yarn prisma:generate');

  console.log('> 2/3 执行数据库迁移 (开发环境)');
  await run('yarn prisma:migrate');

  console.log('> 3/3 写入种子数据');
  await run('yarn db:seed');

  console.log('🎉 数据库初始化完成');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


