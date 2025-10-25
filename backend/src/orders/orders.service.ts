import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsGateway } from "../communications/notifications.gateway";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { QueryOrderDto } from "./dto/query-order.dto";
import { ApplyOrderDto } from "./dto/apply-order.dto";
import { OrderStatus, ApplicationStatus } from "@prisma/client";
import * as crypto from "crypto";
import fetch from "node-fetch";

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsGateway
  ) {}

  // 创建订单（广告商）
  async create(userId: string, createOrderDto: CreateOrderDto) {
    // 托管：下单时从广告商余额中扣款并记录支付到平台（寄存）
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { walletBalance: true },
      });
      if (!user || user.walletBalance < createOrderDto.amount) {
        throw new BadRequestException("余额不足，无法托管订单款项");
      }
      // 创建订单
      const order = await tx.order.create({
        data: {
          ...createOrderDto,
          customerId: userId,
          deadline: createOrderDto.deadline
            ? new Date(createOrderDto.deadline)
            : undefined,
        },
        include: {
          customer: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            },
          },
        },
      });

      // 扣款并生成交易（PAYMENT，状态 COMPLETED 表示已托管到平台）
      await tx.transaction.create({
        data: {
          amount: createOrderDto.amount,
          type: "PAYMENT" as any,
          status: "COMPLETED" as any,
          userId,
          orderId: order.id,
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: { walletBalance: { decrement: createOrderDto.amount } },
      });

      return order;
    });
  }

  // 查询订单列表（支持筛选）
  async findAll(queryDto: QueryOrderDto, userId?: string, role?: string) {
    const {
      page = 1,
      pageSize = 10,
      status,
      priority,
      keyword,
      minAmount,
      maxAmount,
      mine,
    } = queryDto;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    // 根据角色过滤订单
    if (role === "ADVERTISER") {
      // 广告商：如果 mine !== false（默认 true），仅查看自己的；若 mine === false，则查看全部
      if (mine === false) {
        // 不限定 customerId
      } else {
        where.customerId = userId;
      }
    } else if (role === "CREATOR" || role === "DESIGNER") {
      // mine=true: 仅查看属于自己的订单；否则：未接单或自己接单的订单
      if (mine === true) {
        where.designerId = userId;
      } else {
        where.OR = [{ designerId: null }, { designerId: userId }];
      }
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (minAmount !== undefined)
      where.amount = { ...where.amount, gte: minAmount };
    if (maxAmount !== undefined)
      where.amount = { ...where.amount, lte: maxAmount };
    if (keyword) {
      where.OR = [
        ...(where.OR || []),
        { title: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
              company: true,
            },
          },
          designer: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            },
          },
          applications: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatar: true,
                  bio: true,
                  skills: true,
                  tags: true,
                },
              },
            },
          },
          _count: {
            select: {
              applications: true,
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    const ordersWithParsed = orders.map((order) => {
      const parseArr = (val: any) => {
        if (!val) return [] as string[];
        if (Array.isArray(val)) return val as string[];
        if (typeof val === "string") {
          try {
            const arr = JSON.parse(val);
            return Array.isArray(arr) ? (arr as string[]) : [];
          } catch {
            return [] as string[];
          }
        }
        return [] as string[];
      };
      const tags = parseArr((order as any).tags);
      const requirements = parseArr((order as any).requirements);
      return { ...order, tags, requirements } as any;
    });
    return {
      data: ordersWithParsed,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // 查询单个订单详情
  async findOne(id: string, userId?: string, role?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            company: true,
            contact: true,
          },
        },
        designer: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            bio: true,
          },
        },
        applications: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                bio: true,
                skills: true,
                tags: true,
              },
            },
          },
        },
        reviews: true,
        materials: true,
        transactions: true,
      },
    });

    if (!order) {
      throw new NotFoundException("订单不存在");
    }

    // 权限检查
    if (role === "ADVERTISER" && order.customerId !== userId) {
      throw new ForbiddenException("无权访问此订单");
    }

    // 为申请人附加评价统计（被评价者=申请人），平均评分与数量
    const apps = order.applications || [];
    const enhancedApps = await Promise.all(
      apps.map(async (app: any) => {
        const stats = await this.prisma.review.aggregate({
          _avg: { rating: true },
          _count: { rating: true },
          where: { revieweeId: app.userId },
        });
        return {
          ...app,
          user: {
            ...app.user,
            reviewsCount: stats._count.rating,
            averageRating: Number((stats._avg.rating || 0).toFixed(2)),
          },
        };
      })
    );
    const parseArr = (val: any) => {
      if (!val) return [] as string[];
      if (Array.isArray(val)) return val as string[];
      if (typeof val === "string") {
        try {
          const arr = JSON.parse(val);
          return Array.isArray(arr) ? (arr as string[]) : [];
        } catch {
          return [] as string[];
        }
      }
      return [] as string[];
    };
    const tags = parseArr((order as any).tags);
    const requirements = parseArr((order as any).requirements);
    return { ...order, tags, requirements, applications: enhancedApps } as any;
  }

  // 更新订单（广告商）
  async update(id: string, userId: string, updateOrderDto: UpdateOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException("订单不存在");
    }

    if (order.customerId !== userId) {
      throw new ForbiddenException("无权修改此订单");
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException("只能修改待处理状态的订单");
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        ...updateOrderDto,
        deadline: updateOrderDto.deadline
          ? new Date(updateOrderDto.deadline)
          : undefined,
      },
      include: {
        customer: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
      },
    });
  }

  // 删除订单（广告商/创作者）
  async remove(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException("订单不存在");
    }

    // 发布者或被委派者均可删除
    const isOwner = order.customerId === userId || order.designerId === userId;
    if (!isOwner) {
      throw new ForbiddenException("无权删除此订单");
    }

    // 仅允许删除 已取消/已完成 的订单
    if (
      !(
        order.status === OrderStatus.CANCELLED ||
        order.status === OrderStatus.COMPLETED
      )
    ) {
      throw new BadRequestException("仅已取消或已完成的订单可删除");
    }

    // 级联删除：先清理依赖本订单的记录，最后删除订单本身
    return this.prisma.$transaction(async (tx) => {
      await tx.orderApplication.deleteMany({ where: { orderId: id } });
      await tx.material.deleteMany({ where: { orderId: id } });
      await tx.review.deleteMany({ where: { orderId: id } });
      await tx.transaction.deleteMany({ where: { orderId: id } });
      return tx.order.delete({ where: { id } });
    });
  }

  // 申请接单（创作者）
  async applyOrder(
    orderId: string,
    userId: string,
    applyOrderDto: ApplyOrderDto
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException("订单不存在");
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException("只能申请待处理状态的订单");
    }

    if (order.designerId) {
      throw new BadRequestException("订单已被接单");
    }

    // 检查是否已经申请过
    const existingApplication = await this.prisma.orderApplication.findUnique({
      where: {
        orderId_userId: {
          orderId,
          userId,
        },
      },
    });

    if (existingApplication) {
      throw new BadRequestException("您已经申请过此订单");
    }

    const application = await this.prisma.orderApplication.create({
      data: {
        orderId,
        userId,
        message: applyOrderDto.message,
        // 离线提醒字段：广告商为发布者
        publisherId: order.customerId,
        isRead: false,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    // 通知订单发布者（广告商）：统一负载结构并携带必要信息，便于前端格式化
    this.notifications.notifyUser(
      order.customerId,
      "order.application.created",
      {
        id: application.id, // 用于前端去重
        orderId,
        applicationId: application.id,
        applicant: {
          id: application.user.id,
          username: application.user.username,
          avatar: application.user.avatar,
        },
        order: { id: order.id, title: (order as any).title },
        message: applyOrderDto.message,
        createdAt: application.createdAt,
      }
    );

    return application;
  }

  // 提交交付物（创作者）
  async submitDeliverables(
    orderId: string,
    userId: string,
    files: Array<{
      url: string;
      title?: string;
      description?: string;
      type?: string;
    }>
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException("订单不存在");
    if (order.designerId !== userId)
      throw new ForbiddenException("仅受委派的创作者可提交交付物");

    const created = await Promise.all(
      (files || []).map((f) =>
        this.prisma.material.create({
          data: {
            url: f.url,
            title: f.title,
            description: f.description,
            type: (f.type as any) || "OTHER",
            status: "ACTIVE" as any,
            userId,
            orderId,
          },
        })
      )
    );

    // 通知广告商有交付物提交
    const ts = new Date().toISOString();
    this.notifications.notifyUser(
      order.customerId,
      "order.deliverables.submitted",
      {
        id: `deliverables-${orderId}-${ts}`,
        orderId,
        count: created.length,
        createdAt: ts,
      }
    );

    return { success: true, files: created };
  }

  // 查看交付物列表（双方可见）
  async getDeliverables(orderId: string, userId: string, role?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException("订单不存在");
    if (
      role !== "ADMIN" &&
      order.customerId !== userId &&
      order.designerId !== userId
    ) {
      throw new ForbiddenException("无权查看该订单交付物");
    }
    const list = await this.prisma.material.findMany({
      where: { orderId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        url: true,
        title: true,
        description: true,
        type: true,
        createdAt: true,
        user: { select: { id: true, username: true, avatar: true } },
      },
    });
    // 过滤出交付物（kind=DELIVERABLE），兼容历史无 kind 数据：默认当作交付物处理
    return list.filter((m: any) => {
      try {
        const meta = JSON.parse(m.description || "{}");
        if (meta && meta.kind) return meta.kind === "DELIVERABLE";
      } catch {}
      return true;
    });
  }

  // 查看附件列表（双方可见）
  async getAttachments(orderId: string, userId: string, role?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException("订单不存在");
    if (
      role !== "ADMIN" &&
      order.customerId !== userId &&
      order.designerId !== null &&
      order.designerId !== userId
    ) {
      throw new ForbiddenException("无权查看该订单附件");
    }

    const list = await this.prisma.material.findMany({
      where: { orderId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        url: true,
        title: true,
        description: true,
        type: true,
        createdAt: true,
        user: { select: { id: true, username: true, avatar: true } },
      },
    });
    return list.filter((m: any) => {
      try {
        const meta = JSON.parse(m.description || "{}");
        return meta && meta.kind === "ATTACHMENT";
      } catch {
        return false;
      }
    });
  }

  // 广告商确认收货并放款
  async confirmReceipt(orderId: string, advertiserId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException("订单不存在");
    if (order.customerId !== advertiserId)
      throw new ForbiddenException("无权确认该订单");
    if (!order.designerId) throw new BadRequestException("尚未委派创作者");

    // 平台到创作者放款（创建一条 COMMISSION 或 PAYMENT 给创作者）
    return this.prisma.$transaction(async (tx) => {
      // 这里按订单金额直接放款给创作者（可扩展平台抽佣）
      await tx.transaction.create({
        data: {
          amount: order.amount,
          type: "COMMISSION" as any,
          status: "COMPLETED" as any,
          userId: order.designerId,
          orderId: order.id,
        },
      });

      // 入账到创作者钱包
      await tx.user.update({
        where: { id: order.designerId },
        data: { walletBalance: { increment: order.amount } },
      });

      // 更新订单状态
      await tx.order.update({
        where: { id: orderId },
        data: { status: "COMPLETED" as any },
      });

      // 生成待评价记录（双方各一条，若已存在则跳过）
      const existingAdvertiserReview = await tx.review.findFirst({
        where: { orderId, reviewerId: advertiserId },
      });
      if (!existingAdvertiserReview) {
        await tx.review.create({
          data: {
            orderId,
            reviewerId: advertiserId,
            revieweeId: order.designerId!,
            status: "PENDING" as any,
          },
        });
      }
      const existingDesignerReview = await tx.review.findFirst({
        where: { orderId, reviewerId: order.designerId! },
      });
      if (!existingDesignerReview) {
        await tx.review.create({
          data: {
            orderId,
            reviewerId: order.designerId!,
            revieweeId: advertiserId,
            status: "PENDING" as any,
          },
        });
      }

      // 通知创作者已放款
      const ts = new Date().toISOString();
      this.notifications.notifyUser(order.designerId, "order.payout.released", {
        id: `payout-${orderId}-${ts}`,
        orderId,
        amount: order.amount,
        createdAt: ts,
      });
      // 仅提醒广告商去评价
      this.notifications.notifyUser(order.customerId, "reviews.cta", {
        id: `reviews-cta-${orderId}`,
        orderId,
        createdAt: ts,
      });

      return { success: true };
    });
  }

  // 接受申请（广告商）
  async acceptApplication(
    orderId: string,
    applicationId: string,
    userId: string
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException("订单不存在");
    }

    if (order.customerId !== userId) {
      throw new ForbiddenException("无权操作此订单");
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException("订单状态不允许此操作");
    }

    const application = await this.prisma.orderApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application || application.orderId !== orderId) {
      throw new NotFoundException("申请不存在");
    }

    // 使用事务更新订单和申请状态
    const result = await this.prisma.$transaction(async (tx) => {
      // 更新订单状态和设计师
      await tx.order.update({
        where: { id: orderId },
        data: {
          designerId: application.userId,
          status: OrderStatus.IN_PROGRESS,
        },
      });

      // 更新申请状态
      await tx.orderApplication.update({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.ACCEPTED,
        },
      });

      // 拒绝其他申请
      await tx.orderApplication.updateMany({
        where: {
          orderId,
          id: { not: applicationId },
          status: ApplicationStatus.PENDING,
        },
        data: {
          status: ApplicationStatus.REJECTED,
        },
      });

      return tx.order.findUnique({
        where: { id: orderId },
        include: {
          customer: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          designer: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });
    });

    // 通知被接受的创作者
    if (result?.designer?.id) {
      this.notifications.notifyUser(
        result.designer.id,
        "order.application.accepted",
        {
          orderId,
          applicationId,
          createdAt: new Date().toISOString(),
        }
      );
    }

    return result;
  }

  // 完成订单（创作者）
  async completeOrder(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException("订单不存在");
    }

    if (order.designerId !== userId) {
      throw new ForbiddenException("无权操作此订单");
    }

    if (order.status !== OrderStatus.IN_PROGRESS) {
      throw new BadRequestException("订单状态不允许此操作");
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.COMPLETED,
      },
      include: {
        customer: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        designer: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  // 取消订单
  async cancelOrder(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException("订单不存在");
    }

    // 只有订单创建者可以取消
    if (order.customerId !== userId) {
      throw new ForbiddenException("无权操作此订单");
    }

    if (
      order.status === OrderStatus.PENDING ||
      order.status === OrderStatus.IN_PROGRESS
    ) {
      // 仍走取消流程
      const updated = await this.prisma.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
      });
      // 若已有受委派者，通知创作者订单被广告商取消
      try {
        if (order.designerId) {
          this.notifications.notifyUser(
            order.designerId,
            "order.cancelled.by.advertiser",
            {
              id: `order-cancelled-by-advertiser-${order.id}`,
              orderId: order.id,
              amount: order.amount,
              createdAt: new Date().toISOString(),
            }
          );
        }
      } catch {}
      return updated;
    }
    // 已完成允许删除
    if (order.status === OrderStatus.COMPLETED) {
      return this.prisma.order.delete({ where: { id } });
    }
    // 其他状态（已取消）默认不允许重复操作
    throw new BadRequestException("订单状态不允许此操作");
  }

  // 创作者/设计师取消订单：仅未完成、且自己为 designerId；需退款给广告商
  async cancelOrderByDesigner(id: string, designerId: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException("订单不存在");
    if (order.designerId !== designerId)
      throw new ForbiddenException("无权取消此订单");
    if (order.status === "COMPLETED")
      throw new BadRequestException("订单已完成，无法取消");
    if (order.status === "CANCELLED") return { success: true };

    // 退款：将金额退回广告商钱包，并记录 REFUND 交易
    return this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { status: "CANCELLED" as any },
      });
      await tx.transaction.create({
        data: {
          amount: order.amount,
          type: "REFUND" as any,
          status: "COMPLETED" as any,
          userId: order.customerId,
          orderId: order.id,
        },
      });
      await tx.user.update({
        where: { id: order.customerId },
        data: { walletBalance: { increment: order.amount } },
      });

      // 通知广告商
      this.notifications.notifyUser(
        order.customerId,
        "order.cancelled.by.designer",
        {
          id: `order-cancelled-${order.id}`,
          orderId: order.id,
          amount: order.amount,
          createdAt: new Date().toISOString(),
        }
      );
      return { success: true };
    });
  }

  // 获取订单统计
  async getOrderStats(userId: string, role: string) {
    const where: any = {};

    if (role === "ADVERTISER") {
      where.customerId = userId;
    } else if (role === "CREATOR" || role === "DESIGNER") {
      where.designerId = userId;
    }

    const [total, pending, inProgress, completed, cancelled] =
      await Promise.all([
        this.prisma.order.count({ where }),
        this.prisma.order.count({
          where: { ...where, status: OrderStatus.PENDING },
        }),
        this.prisma.order.count({
          where: { ...where, status: OrderStatus.IN_PROGRESS },
        }),
        this.prisma.order.count({
          where: { ...where, status: OrderStatus.COMPLETED },
        }),
        this.prisma.order.count({
          where: { ...where, status: OrderStatus.CANCELLED },
        }),
      ]);

    return {
      total,
      pending,
      inProgress,
      completed,
      cancelled,
    };
  }

  // AI 智能匹配订单（仅创作者/设计师使用）
  async smartMatch(userId: string, role: string) {
    if (!(role === "CREATOR" || role === "DESIGNER")) {
      // 非创作者角色返回空
      return { data: [], notice: "仅创作者/设计师支持智能匹配" };
    }

    // 创作者画像
    const creator = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { skills: true, tags: true },
    });
    const parseArr = (val: any) => {
      if (!val) return [] as string[];
      if (Array.isArray(val)) return val as string[];
      if (typeof val === "string") {
        try {
          const arr = JSON.parse(val);
          return Array.isArray(arr) ? (arr as string[]) : [];
        } catch {
          return [];
        }
      }
      return [] as string[];
    };
    const creatorSkills = parseArr(creator?.skills);
    const creatorTags = parseArr(creator?.tags);

    // 候选订单：未接单的 PENDING，取最近 50 条
    const candidates = await this.prisma.order.findMany({
      where: { status: OrderStatus.PENDING, designerId: null },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, title: true, requirements: true, tags: true },
    });
    const items = candidates.map((o) => ({
      id: o.id,
      requirements: parseArr((o as any).requirements),
      tags: parseArr((o as any).tags),
    }));

    // 组织提示词
    const sys =
      '你是订单匹配器。只返回 JSON {"orderIds":["..."]}，不得包含其它内容。';
    const userMsg = `创作者技能: ${creatorSkills.join(",") || "无"}\n创作者标签: ${creatorTags.join(",") || "无"}\n订单列表:\n${items.map((it) => `id=${it.id}; req=[${it.requirements.join(",")}]; tags=[${it.tags.join(",")}]`).join("\n")}\n请基于技能与标签推荐最匹配的 <=20 个订单，返回 orderIds 数组。`;

    // 调用 AI 微服务
    const base = process.env.AI_SERVICE_URL || "http://localhost:3001";
    const url = `${base.replace(/\/$/, "")}/v1/chat`;
    const headers: any = { "Content-Type": "application/json" };
    const aiKey = process.env.AI_SERVICE_API_KEY;
    if (aiKey) headers["X-API-Key"] = aiKey;
    let pickedIds: string[] = [];
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: [
            { role: "system", content: sys },
            { role: "user", content: userMsg },
          ],
          provider: "qwen",
          model: "qwen-plus",
        }),
      } as any);
      if (!resp.ok) throw new Error(`AI ${resp.status}`);
      const data: any = await resp.json();
      
      const text = data?.choices?.[0]?.message?.content || "";
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const obj = JSON.parse(match[0]);
          const ids = Array.isArray(obj.orderIds)
            ? obj.orderIds.filter((x: any) => typeof x === "string")
            : [];
          pickedIds = ids;
        } catch {}
      }
    } catch (e) {
      console.log("smartMatch AI error", e);
      return { data: [], notice: "网络问题，AI 匹配暂不可用，请稍后再试" };
    }
    if (!pickedIds.length) {
      return { data: [], notice: "网络问题，AI 匹配暂不可用，请稍后再试" };
    }

    const result = await this.prisma.order.findMany({
      where: { id: { in: pickedIds } },
      include: {
        customer: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            company: true,
          },
        },
        _count: { select: { applications: true } },
      },
    });
    // 标注 aiMatched
    const set = new Set(pickedIds);
    const withFlag = result.map((o: any) => ({
      ...o,
      aiMatched: set.has(o.id),
    }));
    // 确保 tags 和 requirements 为数组
    const normalized = withFlag.map((o: any) => ({
      ...o,
      tags: parseArr((o as any).tags),
      requirements: parseArr((o as any).requirements),
    }));
    return { data: normalized, notice: "AI 已为您筛选出匹配的订单" };
  }
}
