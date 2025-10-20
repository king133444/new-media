import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function upsertUser(params: {
  username: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'ADVERTISER' | 'CREATOR' | 'DESIGNER';
  bio?: string;
  company?: string;
  industry?: string;
  skills?: string;
  tags?: string;
  walletBalance?: number;
  isVerified?: boolean;
}) {
  const hashed = await bcrypt.hash(params.password, 10);
  const user = await prisma.user.upsert({
    where: { username: params.username },
    update: {},
    create: {
      username: params.username,
      email: params.email,
      password: hashed,
      role: params.role as any,
      bio: params.bio,
      company: params.company,
      industry: params.industry,
      skills: params.skills,
      tags: params.tags,
      isVerified: params.isVerified ?? true,
      walletBalance: params.walletBalance ?? 0,
    },
  });
  return user;
}

async function main() {
  console.log('开始执行 Prisma 种子数据...');

  const admin = await upsertUser({
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'ADMIN',
    bio: '系统管理员',
  });

  const advertiser = await upsertUser({
    username: 'advertiser',
    email: 'advertiser@example.com',
    password: 'advertiser123',
    role: 'ADVERTISER',
    bio: '广告商用户',
    company: '测试广告公司',
    industry: '互联网',
    walletBalance: 10000,
  });

  const creator = await upsertUser({
    username: 'creator',
    email: 'creator@example.com',
    password: 'creator123',
    role: 'CREATOR',
    bio: '专业视频创作者',
    skills: JSON.stringify(['视频制作', '剪辑', '后期']),
    tags: JSON.stringify(['专业', '高效', '创意']),
  });

  const designer = await upsertUser({
    username: 'designer',
    email: 'designer@example.com',
    password: 'designer123',
    role: 'DESIGNER',
    bio: 'UI/视觉设计师',
    skills: JSON.stringify(['UI', '视觉', '插画']),
    tags: JSON.stringify(['稳重', '细节控']),
  });

  console.log('✅ 已创建/更新用户: ', [admin.username, advertiser.username, creator.username, designer.username].join(', '));
  console.log('🎉 Prisma 种子数据完成');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


