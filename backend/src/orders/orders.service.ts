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

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService, private notifications: NotificationsGateway) {}

  // 创建订单（广告主）
  async create(userId: string, createOrderDto: CreateOrderDto) {
    return this.prisma.order.create({
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
  }

  // 查询订单列表（支持筛选）
  async findAll(queryDto: QueryOrderDto, userId?: string, role?: string) {
    const {
      page = 1,
      pageSize = 10,
      type,
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
      // 广告主：如果 mine !== false（默认 true），仅查看自己的；若 mine === false，则查看全部
      if (mine === false) {
        // 不限定 customerId
      } else {
        where.customerId = userId;
      }
    } else if (role === "CREATOR" || role === "DESIGNER") {
      // 创作者只能看到未接单或自己接单的订单
      where.OR = [{ designerId: null }, { designerId: userId }];
    }

    if (type) where.type = type;
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
    const ordersWithTagsArray = orders.map((order) => ({
      ...order,
      tags:
        typeof order.tags === "string"
          ? order.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : Array.isArray(order.tags)
            ? order.tags
            : [],
    }));
    return {
      data: ordersWithTagsArray,
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

    return order;
  }

  // 更新订单（广告主）
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

  // 删除订单（广告主）
  async remove(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException("订单不存在");
    }

    if (order.customerId !== userId) {
      throw new ForbiddenException("无权删除此订单");
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException("只能删除待处理状态的订单");
    }

    return this.prisma.order.delete({
      where: { id },
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
        // 离线提醒字段：广告主为发布者
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

    // 通知订单发布者（广告主）
    this.notifications.notifyUser(order.customerId, "order.application.created", {
      orderId,
      applicationId: application.id,
      applicantId: userId,
      message: applyOrderDto.message,
      createdAt: application.createdAt,
    });

    return application;
  }

  // 接受申请（广告主）
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
      this.notifications.notifyUser(result.designer.id, "order.application.accepted", {
        orderId,
        applicationId,
        createdAt: new Date().toISOString(),
      });
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
      order.status === OrderStatus.COMPLETED ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new BadRequestException("订单状态不允许此操作");
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
      },
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
}
