import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAdvertiserProfileDto } from './dto/update-advertiser-profile.dto';

@Injectable()
export class AdvertisersService {
  constructor(private prisma: PrismaService) {}

  // 获取广告商个人资料
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        contact: true,
        company: true,
        industry: true,
        tags: true,
        isVerified: true,
        walletBalance: true,
        paymentAccount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return {
      ...user,
      tags: user.tags ? JSON.parse(user.tags) : [],
    };
  }

  // 更新广告商个人资料
  async updateProfile(userId: string, updateDto: UpdateAdvertiserProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 如果更新用户名或邮箱，需要检查是否已存在
    if (updateDto.username && updateDto.username !== user.username) {
      const existingUser = await this.prisma.user.findUnique({
        where: { username: updateDto.username },
      });
      if (existingUser) {
        throw new BadRequestException('用户名已存在');
      }
    }

    if (updateDto.email && updateDto.email !== user.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: updateDto.email },
      });
      if (existingEmail) {
        throw new BadRequestException('邮箱已存在');
      }
    }

    const updateData: any = { ...updateDto };
    
    // 处理标签数组
    if (updateDto.tags) {
      updateData.tags = JSON.stringify(updateDto.tags);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        contact: true,
        company: true,
        industry: true,
        tags: true,
        isVerified: true,
        walletBalance: true,
        paymentAccount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...updatedUser,
      tags: updatedUser.tags ? JSON.parse(updatedUser.tags) : [],
    };
  }

  // 获取广告商统计信息
  async getStats(userId: string) {
    const [orderStats, transactionStats] = await Promise.all([
      // 订单统计
      this.prisma.order.groupBy({
        by: ['status'],
        where: { customerId: userId },
        _count: { status: true },
        _sum: { amount: true },
      }),
      // 交易统计
      this.prisma.transaction.groupBy({
        by: ['type', 'status'],
        where: { userId },
        _count: { type: true },
        _sum: { amount: true },
      }),
    ]);

    // 计算总订单数和总金额
    const totalOrders = orderStats.reduce((sum, stat) => sum + stat._count.status, 0);
    const totalAmount = orderStats.reduce((sum, stat) => sum + (stat._sum.amount || 0), 0);

    // 计算钱包余额
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });

    return {
      totalOrders,
      totalAmount,
      walletBalance: user?.walletBalance || 0,
      orderStats: orderStats.map(stat => ({
        status: stat.status,
        count: stat._count.status,
        amount: stat._sum.amount || 0,
      })),
      transactionStats: transactionStats.map(stat => ({
        type: stat.type,
        status: stat.status,
        count: stat._count.type,
        amount: stat._sum.amount || 0,
      })),
    };
  }

  // 获取广告商的钱包信息
  async getWalletInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        walletBalance: true,
        paymentAccount: true,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 获取最近的交易记录
    const recentTransactions = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        amount: true,
        type: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      balance: user.walletBalance,
      paymentAccount: user.paymentAccount ? JSON.parse(user.paymentAccount) : null,
      recentTransactions,
    };
  }

  // 绑定收款账户
  async bindPaymentAccount(userId: string, paymentAccount: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        paymentAccount: JSON.stringify(paymentAccount),
      },
      select: {
        id: true,
        paymentAccount: true,
      },
    });
  }
}
