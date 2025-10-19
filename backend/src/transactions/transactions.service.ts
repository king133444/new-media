import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';
import { TransactionType, TransactionStatus } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  // 创建交易
  async create(userId: string, createTransactionDto: CreateTransactionDto) {
    return this.prisma.$transaction(async (tx) => {
      // 创建交易记录
      const transaction = await tx.transaction.create({
        data: {
          // 仅保留与当前模型一致的字段
          amount: (createTransactionDto as any).amount,
          type: (createTransactionDto as any).type,
          status: (createTransactionDto as any).status,
          orderId: (createTransactionDto as any).orderId,
          userId,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          order: {
            select: {
              id: true,
              title: true,
              amount: true,
            },
          },
        },
      });

      // 如果是充值交易且状态为已完成，更新用户钱包余额
      if (createTransactionDto.type === TransactionType.DEPOSIT && transaction.status === TransactionStatus.COMPLETED) {
        await tx.user.update({
          where: { id: userId },
          data: {
            walletBalance: {
              increment: (createTransactionDto as any).amount,
            },
          },
        });
      }

      // 如果是提现交易且状态为已完成，减少用户钱包余额
      if (createTransactionDto.type === TransactionType.WITHDRAWAL && transaction.status === TransactionStatus.COMPLETED) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { walletBalance: true },
        });

        if (!user || user.walletBalance < createTransactionDto.amount) {
          throw new BadRequestException('余额不足');
        }

        await tx.user.update({
          where: { id: userId },
          data: {
            walletBalance: {
              decrement: (createTransactionDto as any).amount,
            },
          },
        });
      }

      return transaction;
    });
  }

  // 查询交易列表
  async findAll(queryDto: QueryTransactionDto, userId?: string, role?: string) {
    const { page = 1, pageSize = 10, type, status, startDate, endDate } = queryDto as any;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    // 根据角色过滤交易
    if (role === 'ADVERTISER' || role === 'CREATOR' || role === 'DESIGNER') {
      where.userId = userId;
    }

    if (type) where.type = type;
    if (status) where.status = status;
    // 旧的 description/remark 字段已移除，不再按关键字筛选

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            },
          },
          order: {
            select: {
              id: true,
              title: true,
              amount: true,
            },
          },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // 查询单个交易详情
  async findOne(id: string, userId?: string, role?: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
        order: {
          select: {
            id: true,
            title: true,
            amount: true,
            status: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('交易不存在');
    }

    // 权限检查
    if ((role === 'ADVERTISER' || role === 'CREATOR' || role === 'DESIGNER') && transaction.userId !== userId) {
      throw new ForbiddenException('无权访问此交易');
    }

    return transaction;
  }

  // 更新交易状态
  async update(id: string, userId: string, updateTransactionDto: UpdateTransactionDto, role?: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException('交易不存在');
    }

    // 只有管理员或交易所有者可以更新交易状态
    if (role !== 'ADMIN' && transaction.userId !== userId) {
      throw new ForbiddenException('无权操作此交易');
    }

    return this.prisma.transaction.update({
      where: { id },
      data: {
        // 仅允许更新当前模型存在的字段
        amount: (updateTransactionDto as any).amount,
        type: (updateTransactionDto as any).type,
        status: (updateTransactionDto as any).status,
        orderId: (updateTransactionDto as any).orderId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        order: {
          select: {
            id: true,
            title: true,
            amount: true,
          },
        },
      },
    });
  }

  // 充值
  async deposit(userId: string, amount: number, paymentMethod: string) {
    return this.create(userId, { amount, type: TransactionType.DEPOSIT } as any);
  }

  // 提现
  async withdraw(userId: string, amount: number, paymentAccount: string) {
    // 检查余额
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });

    if (!user || user.walletBalance < amount) {
      throw new BadRequestException('余额不足');
    }

    return this.create(userId, { amount, type: TransactionType.WITHDRAWAL } as any);
  }

  // 支付订单
  async payOrder(userId: string, orderId: string, amount: number) {
    // 检查订单是否存在且属于当前用户
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.customerId !== userId) {
      throw new ForbiddenException('无权支付此订单');
    }

    // 检查余额
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });

    if (!user || user.walletBalance < amount) {
      throw new BadRequestException('余额不足');
    }

    return this.prisma.$transaction(async (tx) => {
      // 创建支付交易
      const transaction = await tx.transaction.create({
        data: {
          amount,
          type: TransactionType.PAYMENT,
          userId,
          orderId,
          status: TransactionStatus.COMPLETED,
        },
      });

      // 扣除用户余额
      await tx.user.update({
        where: { id: userId },
        data: {
          walletBalance: {
            decrement: amount,
          },
        },
      });

      return transaction;
    });
  }

  // 获取交易统计
  async getStats(userId: string, role: string) {
    const where: any = {};

    if (role === 'ADVERTISER' || role === 'CREATOR' || role === 'DESIGNER') {
      where.userId = userId;
    }

    const [total, deposits, withdrawals, payments, refunds, wallet] = await Promise.all([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.aggregate({
        where: { ...where, type: TransactionType.DEPOSIT, status: TransactionStatus.COMPLETED },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.transaction.aggregate({
        where: { ...where, type: TransactionType.WITHDRAWAL, status: TransactionStatus.COMPLETED },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.transaction.aggregate({
        where: { ...where, type: TransactionType.PAYMENT, status: TransactionStatus.COMPLETED },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.transaction.aggregate({
        where: { ...where, type: TransactionType.REFUND, status: TransactionStatus.COMPLETED },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { walletBalance: true } }),
    ]);

    return {
      total,
      deposits: {
        count: deposits._count.id,
        amount: deposits._sum.amount || 0,
      },
      withdrawals: {
        count: withdrawals._count.id,
        amount: withdrawals._sum.amount || 0,
      },
      payments: {
        count: payments._count.id,
        amount: payments._sum.amount || 0,
      },
      refunds: {
        count: refunds._count.id,
        amount: refunds._sum.amount || 0,
      },
      walletBalance: wallet?.walletBalance || 0,
    };
  }
}

