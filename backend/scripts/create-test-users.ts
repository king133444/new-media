import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('开始创建测试用户...');

  // 创建管理员用户
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@example.com',
      password: adminPassword,
      role: 'ADMIN',
      bio: '系统管理员',
      isVerified: true,
    },
  });
  console.log('✅ 管理员用户创建成功:', admin.username);

  // 创建广告主用户
  const advertiserPassword = await bcrypt.hash('advertiser123', 10);
  const advertiser = await prisma.user.upsert({
    where: { username: 'advertiser' },
    update: {},
    create: {
      username: 'advertiser',
      email: 'advertiser@example.com',
      password: advertiserPassword,
      role: 'ADVERTISER',
      bio: '广告主用户',
      company: '测试广告公司',
      industry: '互联网',
      isVerified: true,
      walletBalance: 10000,
    },
  });
  console.log('✅ 广告主用户创建成功:', advertiser.username);

  // 创建创作者用户
  const creatorPassword = await bcrypt.hash('creator123', 10);
  const creator = await prisma.user.upsert({
    where: { username: 'creator' },
    update: {},
    create: {
      username: 'creator',
      email: 'creator@example.com',
      password: creatorPassword,
      role: 'CREATOR',
      bio: '专业视频创作者',
      skills: JSON.stringify(['视频制作', '剪辑', '后期']),
      tags: JSON.stringify(['专业', '高效', '创意']),
      isVerified: true,
      walletBalance: 0,
    },
  });
  console.log('✅ 创作者用户创建成功:', creator.username);

  console.log('\n所有测试用户创建完成！');
  console.log('\n测试账号信息：');
  console.log('管理员: admin / admin123');
  console.log('广告主: advertiser / advertiser123');
  console.log('创作者: creator / creator123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

