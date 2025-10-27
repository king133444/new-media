import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser(params: {
  username: string;
  email: string;
  password: string;
  role: "ADMIN" | "ADVERTISER" | "CREATOR" | "DESIGNER";
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
  console.log("开始执行 Prisma 种子数据...");

  const admin = await upsertUser({
    username: "admin",
    email: "admin@example.com",
    password: "admin123",
    role: "ADMIN",
    bio: "系统管理员",
  });

  const advertiser = await upsertUser({
    username: "advertiser",
    email: "advertiser@example.com",
    password: "advertiser123",
    role: "ADVERTISER",
    bio: "广告商用户",
    company: "测试广告公司",
    industry: "互联网",
    walletBalance: 10000,
  });

  const creator = await upsertUser({
    username: "creator",
    email: "creator@example.com",
    password: "creator123",
    role: "CREATOR",
    bio: "专业视频创作者",
    skills: JSON.stringify(["视频制作", "剪辑", "后期"]),
    tags: JSON.stringify(["专业", "高效", "创意"]),
  });

  const designer = await upsertUser({
    username: "designer",
    email: "designer@example.com",
    password: "designer123",
    role: "DESIGNER",
    bio: "UI/视觉设计师",
    skills: JSON.stringify(["UI", "视觉", "插画"]),
    tags: JSON.stringify(["稳重", "细节控"]),
  });

  console.log(
    "✅ 已创建/更新用户: ",
    [
      admin.username,
      advertiser.username,
      creator.username,
      designer.username,
    ].join(", ")
  );

  // 清空与订单关联的数据（先删子表，再删订单）
  await prisma.material.deleteMany({ where: { orderId: { not: null } } });
  await prisma.review.deleteMany({});
  await prisma.transaction.deleteMany({ where: { orderId: { not: null } } });
  await prisma.orderApplication.deleteMany({});
  await prisma.order.deleteMany({});

  // 使用固定方向模板生成订单（每个方向一个订单，便于 AI 区分）
  const templates: Array<{
    title: string;
    description: string;
    amount: number;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    daysUntilDeadline?: number; // 相对现在的截止天数
    contentRequirements: string;
    requirements: string[];
    tags: string[];
  }> = [
    {
      title: "剧情反转短视频",
      description: "围绕产品特点设计一条剧情反转的短视频脚本与拍摄方案。",
      amount: 3000,
      priority: "HIGH",
      daysUntilDeadline: 10,
      contentRequirements: "包含品牌Logo与反转点，15-30秒；竖版9:16。",
      requirements: ["短视频", "剧情反转", "脚本+拍摄", "竖版"],
      tags: ["剧情", "传播", "转化"],
    },
    {
      title: "开箱测评短视频",
      description: "新品开箱，展示核心卖点与上手体验。",
      amount: 2500,

      priority: "MEDIUM",
      daysUntilDeadline: 12,
      contentRequirements: "包含开箱过程、亮点特写、口播；竖版9:16。",
      requirements: ["短视频", "开箱", "口播", "剪辑"],
      tags: ["数码", "新品", "测评"],
    },
    {
      title: "抖音信息流口播素材",
      description: "制作可用于信息流投放的口播短视频素材（多版本）。",
      amount: 2800,

      priority: "HIGH",
      daysUntilDeadline: 7,
      contentRequirements: "前3秒强钩子，包含CTA；竖版9:16。",
      requirements: ["口播", "投放素材", "强钩子", "CTA"],
      tags: ["投放", "口播", "转化"],
    },
    {
      title: "小红书图文笔记",
      description: "完成一篇小红书风格的图文笔记，突出产品使用场景与细节。",
      amount: 1200,

      priority: "LOW",
      daysUntilDeadline: 5,
      contentRequirements: "10-12张配图，标题含话题；风格自然真实。",
      requirements: ["图文笔记", "修图", "标题优化"],
      tags: ["种草", "小红书", "生活方式"],
    },
    {
      title: "直播剪辑精华合集",
      description: "从2小时直播原素材剪出3条精华短视频。",
      amount: 2200,

      priority: "MEDIUM",
      daysUntilDeadline: 9,
      contentRequirements: "每条15-30秒，配字幕与转场，导出1080p。",
      requirements: ["剪辑", "字幕", "转场", "导出规范"],
      tags: ["直播", "二创", "短视频"],
    },
    {
      title: "海报设计（线上大促）",
      description: "设计一张电商大促海报，适配PC与移动端。",
      amount: 1500,

      priority: "MEDIUM",
      daysUntilDeadline: 6,
      contentRequirements: "突出折扣信息与主KV，输出多尺寸。",
      requirements: ["海报", "版式", "多尺寸导出"],
      tags: ["电商", "设计", "转化"],
    },
    {
      title: "店铺横幅设计",
      description: "更新店铺主页横幅KV，延续品牌主色调。",
      amount: 900,

      priority: "LOW",
      daysUntilDeadline: 4,
      contentRequirements: "提供PS源文件与PNG导出，含移动端适配。",
      requirements: ["横幅", "主KV", "源文件"],
      tags: ["电商", "设计"],
    },
    {
      title: "MG动画15秒",
      description: "制作15秒MG动画，解释产品工作原理。",
      amount: 4500,

      priority: "HIGH",
      daysUntilDeadline: 15,
      contentRequirements: "提供分镜、配色方案与配音脚本，导出1080p。",
      requirements: ["MG动画", "分镜", "配音脚本"],
      tags: ["动画", "科普", "品牌"],
    },
    {
      title: "AE动效Banner",
      description: "制作网页首屏动效Banner，提升打开吸引力。",
      amount: 2600,

      priority: "MEDIUM",
      daysUntilDeadline: 8,
      contentRequirements: "时长5-8秒，轻量循环，导出webm/mp4。",
      requirements: ["AE", "动效", "轻量循环"],
      tags: ["动效", "转化", "网页"],
    },
    {
      title: "品牌宣传片剪辑（60秒）",
      description: "整合素材剪出60秒品牌宣传片，统一风格与配乐。",
      amount: 5200,

      priority: "HIGH",
      daysUntilDeadline: 18,
      contentRequirements: "提供配乐建议与字幕，导出1080p/4k。",
      requirements: ["剪辑", "配乐", "字幕", "调色"],
      tags: ["品牌", "宣传片"],
    },
    {
      title: "App 宣传 H5 页面",
      description: "设计一页式App宣传H5，突出核心功能与下载引导。",
      amount: 3800,

      priority: "MEDIUM",
      daysUntilDeadline: 14,
      contentRequirements: "自适应移动端，含插画/动效占位与文案结构。",
      requirements: ["H5", "插画", "信息结构"],
      tags: ["H5", "产品", "拉新"],
    },
    {
      title: "3D建模转台展示（15秒）",
      description: "制作单品3D转台展示动画，用于商详页。",
      amount: 4800,

      priority: "HIGH",
      daysUntilDeadline: 20,
      contentRequirements: "高清无损，纯色背景，MP4与GIF双版本。",
      requirements: ["3D", "建模", "渲染"],
      tags: ["3D", "产品", "展示"],
    },
    {
      title: "教程类短视频（工具教学）",
      description: "制作一条工具类教程短视频，清晰分步骤教学。",
      amount: 2000,

      priority: "MEDIUM",
      daysUntilDeadline: 11,
      contentRequirements: "加字幕，关键步骤放大/标注。",
      requirements: ["教程", "字幕", "标注"],
      tags: ["教育", "工具"],
    },
    {
      title: "校园风穿搭短视频",
      description: "拍摄一条校园风格的穿搭种草视频，突出秋季新品。",
      amount: 2300,

      priority: "MEDIUM",
      daysUntilDeadline: 9,
      contentRequirements: "情景化拍摄，配乐活泼；竖版9:16。",
      requirements: ["短视频", "穿搭", "情景化"],
      tags: ["时尚", "校园", "秋季"],
    },
    {
      title: "游戏高光集锦",
      description: "制作一条游戏高光集锦短视频，突出爽点与节奏。",
      amount: 2100,

      priority: "LOW",
      daysUntilDeadline: 7,
      contentRequirements: "快速剪辑与音画同步，添加字幕与音效。",
      requirements: ["剪辑", "字幕", "音效"],
      tags: ["游戏", "高光", "娱乐"],
    },
    {
      title: "科普解说短视频",
      description: "制作一条面向大众的科普解说，话题自拟。",
      amount: 2400,

      priority: "MEDIUM",
      daysUntilDeadline: 13,
      contentRequirements: "口播清晰，配图/示意加强理解。",
      requirements: ["口播", "示意图", "字幕"],
      tags: ["科普", "教育"],
    },
    {
      title: "旅行Vlog（30-60秒）",
      description: "剪辑一条旅行Vlog，氛围感与景色为主。",
      amount: 2000,

      priority: "LOW",
      daysUntilDeadline: 10,
      contentRequirements: "音乐节奏与画面匹配，加入地点字幕。",
      requirements: ["剪辑", "配乐", "字幕"],
      tags: ["旅行", "Vlog"],
    },
    {
      title: "美妆测评短视频",
      description: "制作一条美妆单品测评短视频，展示妆效对比。",
      amount: 2600,

      priority: "MEDIUM",
      daysUntilDeadline: 8,
      contentRequirements: "正反面/左右脸对比，近景清晰。",
      requirements: ["测评", "近景", "对比"],
      tags: ["美妆", "测评"],
    },
    {
      title: "数码评测短视频",
      description: "制作一条数码产品评测短视频，突出性能与卖点。",
      amount: 3000,

      priority: "HIGH",
      daysUntilDeadline: 12,
      contentRequirements: "跑分/游戏帧率展示，镜头稳定，字幕完整。",
      requirements: ["评测", "跑分", "字幕"],
      tags: ["数码", "性能"],
    },
    {
      title: "教育知识卡片（竖版）",
      description: "制作一条教育知识卡片式短视频，图文并茂。",
      amount: 1800,

      priority: "LOW",
      daysUntilDeadline: 6,
      contentRequirements: "统一模板与配色，语音合成或口播皆可。",
      requirements: ["短视频", "知识卡片", "模板"],
      tags: ["教育", "知识点"],
    },
    {
      title: "竖版横改竖适配",
      description: "将一条横版视频适配为竖版信息流格式。",
      amount: 1600,

      priority: "LOW",
      daysUntilDeadline: 5,
      contentRequirements: "保留关键画面，添加裁切与字幕优化。",
      requirements: ["适配", "裁切", "字幕"],
      tags: ["适配", "信息流"],
    },
    {
      title: "产品动图（GIF）",
      description: "制作3张产品动图，用于详情页与Banner。",
      amount: 900,

      priority: "LOW",
      daysUntilDeadline: 4,
      contentRequirements: "轻量循环，主卖点突出；GIF/WebM双版本。",
      requirements: ["动图", "轻量", "卖点突出"],
      tags: ["电商", "动效"],
    },
    {
      title: "达人脚本（不拍摄）",
      description: "编写一份达人带货脚本（不含拍摄），用于对接KOL。",
      amount: 1200,

      priority: "LOW",
      daysUntilDeadline: 3,
      contentRequirements: "结构：开场钩子-卖点-福利-CTA，给出3版脚本。",
      requirements: ["脚本", "口播", "CTA"],
      tags: ["带货", "脚本"],
    },
  ];

  // 确保广告商钱包余额足以覆盖全部订单的支付
  const totalPay = templates.reduce((sum, t) => sum + t.amount, 0);
  await prisma.user.update({
    where: { id: advertiser.id },
    data: { walletBalance: totalPay + 10000 },
  });

  for (let i = 0; i < templates.length; i++) {
    const t = templates[i];
    const deadline = t.daysUntilDeadline
      ? new Date(Date.now() + t.daysUntilDeadline * 24 * 3600 * 1000)
      : null;
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          title: t.title,
          description: t.description,
          amount: t.amount,
          status: "PENDING" as any,
          priority: t.priority as any,
          deadline: deadline || undefined,
          contentRequirements: t.contentRequirements,
          requirements: JSON.stringify(t.requirements),
          tags: JSON.stringify(t.tags),
          customerId: advertiser.id,
        },
      });

      // 生成支付交易并从广告商余额扣减
      await tx.transaction.create({
        data: {
          amount: t.amount,
          type: "PAYMENT" as any,
          status: "COMPLETED" as any,
          userId: advertiser.id,
          orderId: order.id,
        },
      });
      await tx.user.update({
        where: { id: advertiser.id },
        data: { walletBalance: { decrement: t.amount } },
      });
    });
  }
  console.log(`🌱 已生成方向明确的订单 ${templates.length} 条`);
  console.log("🎉 Prisma 种子数据完成");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
