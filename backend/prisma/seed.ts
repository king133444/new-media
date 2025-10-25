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

  // 清空与订单关联的数据（先删子表，再删订单）
  await prisma.material.deleteMany({ where: { orderId: { not: null } } });
  await prisma.review.deleteMany({});
  await prisma.transaction.deleteMany({ where: { orderId: { not: null } } });
  await prisma.orderApplication.deleteMany({});
  await prisma.order.deleteMany({});
  // 生成 20 条订单（用于广场与 AI 推荐）
  const priorities = ['LOW','MEDIUM','HIGH','URGENT'] as const;
  const requirementPool = [
    '短视频', '口播', '剧情', '动画', '剪辑', '配音', '字幕', '海报', '横版', '竖版', '直播回放', 'MG', 'AE', 'PR', 'PS'
  ];
  const tagPool = ['运动', '时尚', '美妆', '数码', '教育', '游戏', '科普', '搞笑', '旅行', '校园'];
  const titles = [
    '秋冬上新短视频', '618预热海报', '品牌宣传片剪辑', 'App 宣传 H5', '直播剪辑合集',
    '店铺横幅设计', '新品开箱短视频', '口播脚本+拍摄', '小红书风格视频', '抖音信息流素材'
  ];

  const randPick = (arr: string[], n: number) => {
    const copy = [...arr];
    const out: string[] = [];
    while (n-- > 0 && copy.length) {
      const i = Math.floor(Math.random() * copy.length);
      out.push(copy.splice(i,1)[0]);
    }
    return out;
  };

  for (let i = 0; i < 20; i++) {
    const title = titles[i % titles.length] + ` #${i+1}`;
    const amount = 500 + Math.floor(Math.random() * 4500);
    const budget = amount + Math.floor(Math.random() * 1000);
    const priority = priorities[Math.floor(Math.random() * priorities.length)] as any;
    const deadline = Math.random() < 0.7 ? new Date(Date.now() + (3 + Math.floor(Math.random()*20)) * 24 * 3600 * 1000) : null;
    const requirements = JSON.stringify(randPick(requirementPool, 2 + Math.floor(Math.random()*3)));
    const tags = JSON.stringify(randPick(tagPool, 2 + Math.floor(Math.random()*3)));

    await prisma.order.create({
      data: {
        title,
        description: '请基于我们的品牌调性，产出风格统一的创意内容。',
        amount,
        budget,
        status: 'PENDING' as any,
        priority,
        deadline: deadline || undefined,
        contentRequirements: '需包含品牌logo与核心卖点，画面清晰稳定。',
        requirements,
        tags,
        customerId: advertiser.id,
      },
    });
  }
  console.log('🌱 已生成示例订单 20 条');
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


