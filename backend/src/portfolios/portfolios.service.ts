import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { QueryPortfolioDto } from './dto/query-portfolio.dto';

@Injectable()
export class PortfoliosService {
  constructor(private prisma: PrismaService) {}

  // 创建作品集
  async create(userId: string, createPortfolioDto: CreatePortfolioDto) {
    return this.prisma.portfolio.create({
      data: {
        // 仅保留与当前模型一致的字段
        title: (createPortfolioDto as any).title,
        description: (createPortfolioDto as any).description,
        status: (createPortfolioDto as any).status,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            role: true,
          },
        },
      },
    });
  }

  // 查询作品集列表
  async findAll(queryDto: QueryPortfolioDto, userId?: string, role?: string) {
    const { page = 1, pageSize = 10, status, keyword, userId: targetUserId } = queryDto as any;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    // 根据角色过滤作品集
    if (role === 'ADVERTISER' || role === 'CREATOR' || role === 'DESIGNER') {
      // 普通用户只能看到自己的作品集
      where.userId = userId;
    }

    // 如果指定了用户ID，查看特定用户的作品集
    if (targetUserId) {
      where.userId = targetUserId;
    }

    if (status) where.status = status;
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }

    const [portfolios, total] = await Promise.all([
      this.prisma.portfolio.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.portfolio.count({ where }),
    ]);

    return {
      data: portfolios,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // 查询单个作品集详情
  async findOne(id: string, userId?: string, role?: string) {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            role: true,
            bio: true,
          },
        },
      },
    });

    if (!portfolio) {
      throw new NotFoundException('作品集不存在');
    }

    // 权限检查
    if ((role === 'ADVERTISER' || role === 'CREATOR' || role === 'DESIGNER') && portfolio.userId !== userId) {
      throw new ForbiddenException('无权访问此作品集');
    }

    return portfolio;
  }

  // 更新作品集
  async update(id: string, userId: string, updatePortfolioDto: UpdatePortfolioDto, role?: string) {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id },
    });

    if (!portfolio) {
      throw new NotFoundException('作品集不存在');
    }

    // 只有管理员或作品集所有者可以更新
    if (role !== 'ADMIN' && portfolio.userId !== userId) {
      throw new ForbiddenException('无权修改此作品集');
    }

    const updatedPortfolio = await this.prisma.portfolio.update({
      where: { id },
      data: {
        title: (updatePortfolioDto as any).title,
        description: (updatePortfolioDto as any).description,
        status: (updatePortfolioDto as any).status,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    return updatedPortfolio;
  }

  // 删除作品集
  async remove(id: string, userId: string, role?: string) {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id },
    });

    if (!portfolio) {
      throw new NotFoundException('作品集不存在');
    }

    // 只有管理员或作品集所有者可以删除
    if (role !== 'ADMIN' && portfolio.userId !== userId) {
      throw new ForbiddenException('无权删除此作品集');
    }

    return this.prisma.portfolio.delete({
      where: { id },
    });
  }

  // 获取用户作品集统计
  async getUserPortfolioStats(userId: string) {
    const [total, byStatus] = await Promise.all([
      this.prisma.portfolio.count({
        where: { userId },
      }),
      this.prisma.portfolio.groupBy({
        by: ['status'],
        where: { userId },
        _count: { status: true },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {}),
    };
  }

  // 获取热门作品集
  async getPopularPortfolios(limit: number = 10) {
    // 这里简化处理，实际可以根据浏览量、点赞数等来计算热度
    return this.prisma.portfolio.findMany({
      where: {
        status: 'ACTIVE',
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            role: true,
          },
        },
      },
    });
  }

  // 搜索作品集
  async searchPortfolios(keyword: string, filters?: any) {
    const where: any = {
      status: 'ACTIVE',
      OR: [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
      ],
    };

    return this.prisma.portfolio.findMany({
      where,
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            role: true,
          },
        },
      },
    });
  }
}
