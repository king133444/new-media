import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function main() {
  const outDir = path.resolve(__dirname, 'output');
  await ensureDir(outDir);

  const [users, orders, materials, portfolios, reviews, transactions, communications] = await Promise.all([
    prisma.user.findMany(),
    prisma.order.findMany(),
    prisma.material.findMany().catch(() => []),
    prisma.portfolio.findMany().catch(() => []),
    prisma.review.findMany(),
    prisma.transaction.findMany(),
    prisma.communication.findMany(),
  ]);

  const ts = new Date().toISOString().replace(/[:.]/g, '-');

  fs.writeFileSync(path.join(outDir, `users-${ts}.json`), JSON.stringify(users, null, 2), 'utf-8');
  fs.writeFileSync(path.join(outDir, `orders-${ts}.json`), JSON.stringify(orders, null, 2), 'utf-8');
  fs.writeFileSync(path.join(outDir, `materials-${ts}.json`), JSON.stringify(materials, null, 2), 'utf-8');
  fs.writeFileSync(path.join(outDir, `portfolios-${ts}.json`), JSON.stringify(portfolios, null, 2), 'utf-8');
  fs.writeFileSync(path.join(outDir, `reviews-${ts}.json`), JSON.stringify(reviews, null, 2), 'utf-8');
  fs.writeFileSync(path.join(outDir, `transactions-${ts}.json`), JSON.stringify(transactions, null, 2), 'utf-8');
  fs.writeFileSync(path.join(outDir, `communications-${ts}.json`), JSON.stringify(communications, null, 2), 'utf-8');

  console.log('✅ 数据导出完成，目录: ', outDir);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


