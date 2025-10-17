import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatisticsService {
  constructor(private prisma: PrismaService) {}

  // 获取平台整体统计数据
  async getPlatformStats() {
    const [
      totalUsers,
      totalOrders,
      totalTransactions,
      totalReviews,
      totalPortfolios,
      totalCommunications,
      activeUsers,
      completedOrders,
      totalTransactionAmount,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.order.count(),
      this.prisma.transaction.count(),
      this.prisma.review.count(),
      this.prisma.portfolio.count(),
      this.prisma.communication.count(),
      this.prisma.user.count({
        where: { status: 'ACTIVE' },
      }),
      this.prisma.order.count({
        where: { status: 'COMPLETED' },
      }),
      this.prisma.transaction.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ]);

    // 计算用户角色分布
    const userRoleStats = await this.prisma.user.groupBy({
      by: ['role'],
      _count: { role: true },
    });

    // 计算订单状态分布
    const orderStatusStats = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { status: true },
      _sum: { amount: true },
    });

    // 计算交易类型分布
    const transactionTypeStats = await this.prisma.transaction.groupBy({
      by: ['type', 'status'],
      _count: { type: true },
      _sum: { amount: true },
    });

    // 计算平均评分
    const avgRating = await this.prisma.review.aggregate({
      _avg: { rating: true },
    });

    return {
      overview: {
        totalUsers,
        totalOrders,
        totalTransactions,
        totalReviews,
        totalPortfolios,
        totalCommunications,
        activeUsers,
        completedOrders,
        totalTransactionAmount: totalTransactionAmount._sum.amount || 0,
        averageRating: avgRating._avg.rating || 0,
      },
      userRoleDistribution: userRoleStats.map(stat => ({
        role: stat.role,
        count: stat._count.role,
      })),
      orderStatusDistribution: orderStatusStats.map(stat => ({
        status: stat.status,
        count: stat._count.status,
        totalAmount: stat._sum.amount || 0,
      })),
      transactionTypeDistribution: transactionTypeStats.map(stat => ({
        type: stat.type,
        status: stat.status,
        count: stat._count.type,
        totalAmount: stat._sum.amount || 0,
      })),
    };
  }

  // 获取时间趋势数据
  async getTrendData(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 用户注册趋势
    const userTrend = await this.prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: startDate },
      },
      _count: { id: true },
    });

    // 订单创建趋势
    const orderTrend = await this.prisma.order.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: startDate },
      },
      _count: { id: true },
      _sum: { amount: true },
    });

    // 交易趋势
    const transactionTrend = await this.prisma.transaction.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: startDate },
        status: 'COMPLETED',
      },
      _count: { id: true },
      _sum: { amount: true },
    });

    return {
      userTrend: userTrend.map(item => ({
        date: item.createdAt,
        count: item._count.id,
      })),
      orderTrend: orderTrend.map(item => ({
        date: item.createdAt,
        count: item._count.id,
        amount: item._sum.amount || 0,
      })),
      transactionTrend: transactionTrend.map(item => ({
        date: item.createdAt,
        count: item._count.id,
        amount: item._sum.amount || 0,
      })),
    };
  }

  // 获取热门数据
  async getPopularData() {
    // 最活跃的用户（按订单数）
    const mostActiveUsers = await this.prisma.user.findMany({
      take: 10,
      orderBy: {
        ordersAsCustomer: {
          _count: 'desc',
        },
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        role: true,
        ordersAsCustomer: {
          select: { id: true },
        },
      },
    });

    // 最受欢迎的创作者（按接单数）
    const mostPopularCreators = await this.prisma.user.findMany({
      where: {
        role: { in: ['CREATOR', 'DESIGNER'] },
      },
      take: 10,
      orderBy: {
        ordersAsDesigner: {
          _count: 'desc',
        },
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        role: true,
        ordersAsDesigner: {
          select: { id: true },
        },
        reviewsAsReviewee: {
          select: { rating: true },
        },
      },
    });

    // 计算创作者平均评分
    const creatorsWithRating = mostPopularCreators.map(creator => {
      const ratings = creator.reviewsAsReviewee.map(review => review.rating);
      const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
      
      return {
        ...creator,
        averageRating: Number(avgRating.toFixed(2)),
        totalReviews: ratings.length,
      };
    });

    // 热门作品集
    const popularPortfolios = await this.prisma.portfolio.findMany({
      where: { status: 'ACTIVE' },
      take: 10,
      orderBy: { createdAt: 'desc' },
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

    return {
      mostActiveUsers: mostActiveUsers.map(user => ({
        ...user,
        orderCount: user.ordersAsCustomer.length,
      })),
      mostPopularCreators: creatorsWithRating.map(creator => ({
        ...creator,
        orderCount: creator.ordersAsDesigner.length,
      })),
      popularPortfolios,
    };
  }

  // 获取用户个人统计数据
  async getUserStats(userId: string, role: string) {
    const where: any = {};
    
    if (role === 'ADVERTISER') {
      where.customerId = userId;
    } else if (role === 'CREATOR' || role === 'DESIGNER') {
      where.designerId = userId;
    }

    const [
      totalOrders,
      completedOrders,
      totalEarnings,
      totalSpending,
      totalReviews,
      averageRating,
    ] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.count({
        where: { ...where, status: 'COMPLETED' },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: { in: ['PAYMENT', 'COMMISSION'] },
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: 'PAYMENT',
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      }),
      this.prisma.review.count({
        where: { revieweeId: userId },
      }),
      this.prisma.review.aggregate({
        where: { revieweeId: userId },
        _avg: { rating: true },
      }),
    ]);

    return {
      totalOrders,
      completedOrders,
      totalEarnings: totalEarnings._sum.amount || 0,
      totalSpending: totalSpending._sum.amount || 0,
      totalReviews,
      averageRating: averageRating._avg.rating || 0,
    };
  }
}
