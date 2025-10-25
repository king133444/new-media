import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { QueryPortfolioDto } from './dto/query-portfolio.dto';

@Injectable()
export class PortfoliosService {
  constructor(private prisma: PrismaService) {}

  // 创建作品集
  async create(userId: string, role: string, createPortfolioDto: CreatePortfolioDto) {
    if (!(role === 'CREATOR' || role === 'DESIGNER')) {
      throw new ForbiddenException('仅创作者可创建作品集');
    }
    const initialStatus = 'INACTIVE';
    const created = await this.prisma.portfolio.create({
      data: {
        // 仅保留与当前模型一致的字段
        title: (createPortfolioDto as any).title,
        description: (createPortfolioDto as any).description,
        status: initialStatus as any,
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
    const materials = await this.prisma.material.findMany({ where: ({ portfolioId: created.id } as any), orderBy: { createdAt: 'desc' } });
    return { ...created, materials } as any;
  }

  // 查询作品集列表
  async findAll(queryDto: QueryPortfolioDto, userId?: string, role?: string) {
    const { page = 1, pageSize = 10, status, keyword, userId: targetUserId } = queryDto as any;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    // 根据角色过滤作品集
    if (targetUserId) {
      // 指定用户ID：若为广告商，则仅可看已审核通过（ACTIVE）的作品
      where.userId = targetUserId;
      if (role === 'ADVERTISER') {
        where.status = 'ACTIVE';
      }
    } else if (role === 'ADMIN') {
      // 管理员不限定 userId
    } else {
      // 其他角色默认仅查看自己的
      where.userId = userId;
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
        orderBy: { createdAt: 'asc' },
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

    // 附加 materials 列表
    const ids = portfolios.map((p) => p.id);
    const materials = ids.length
      ? await this.prisma.material.findMany({ where: ({ portfolioId: { in: ids } } as any), orderBy: { createdAt: 'desc' } })
      : [];
    const idToMaterials: Record<string, any[]> = {};
    for (const m of materials as any[]) {
      if (!m.portfolioId) continue;
      if (!idToMaterials[m.portfolioId]) idToMaterials[m.portfolioId] = [];
      idToMaterials[m.portfolioId].push(m);
    }
    const withMaterials = portfolios.map((p) => ({ ...(p as any), materials: idToMaterials[p.id] || [] }));

    return {
      data: withMaterials,
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
    if (role === 'ADMIN') {
      // ok
    } else if (portfolio.userId === userId) {
      // owner ok
    } else if (role === 'ADVERTISER' && (portfolio as any).status === 'ACTIVE') {
      // 广告商可查看审核通过的
    } else {
      throw new ForbiddenException('无权访问此作品集');
    }

    const materials = await this.prisma.material.findMany({ where: ({ portfolioId: id } as any), orderBy: { createdAt: 'desc' } });
    return { ...(portfolio as any), materials };
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

    // 审核：非管理员不得直接修改状态为 ACTIVE
    if ((updatePortfolioDto as any).status && role !== 'ADMIN') {
      delete (updatePortfolioDto as any).status;
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
    const materials = await this.prisma.material.findMany({ where: ({ portfolioId: id } as any), orderBy: { createdAt: 'desc' } });
    return { ...(updatedPortfolio as any), materials };
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
