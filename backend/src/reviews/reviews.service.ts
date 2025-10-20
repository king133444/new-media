import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { QueryReviewDto } from './dto/query-review.dto';
import { ReviewStatus } from '@prisma/client';
import { NotificationsGateway } from '../communications/notifications.gateway';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService, @Inject(forwardRef(() => NotificationsGateway)) private notifications: NotificationsGateway) {}

  // 创建评价
  async create(userId: string, createReviewDto: CreateReviewDto) {
    // 检查订单是否存在且已完成
    const order = await this.prisma.order.findUnique({
      where: { id: createReviewDto.orderId },
      include: {
        customer: true,
        designer: true,
      },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.status !== 'COMPLETED') {
      throw new BadRequestException('只能对已完成的订单进行评价');
    }

    // 仅允许广告商评价创作者
    if (order.customerId !== userId) {
      throw new ForbiddenException('仅广告商可评价创作者');
    }

    // 检查是否已经评价过
    const existingReview = await this.prisma.review.findFirst({
      where: {
        orderId: createReviewDto.orderId,
        reviewerId: userId,
      },
    });

    if (existingReview) {
      throw new BadRequestException('您已经评价过此订单');
    }

    // 被评价者必须是本订单创作者
    if (createReviewDto.revieweeId !== order.designerId) {
      throw new BadRequestException('被评价者必须为该订单创作者');
    }

    const review = await this.prisma.review.create({
      data: {
        ...createReviewDto,
        reviewerId: userId,
      },
      include: {
        order: {
          select: {
            id: true,
            title: true,
            amount: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            username: true,
            avatar: true,
            role: true,
          },
        },
        reviewee: {
          select: {
            id: true,
            username: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    // 通知被评价者（创作者/广告商）
    try {
      this.notifications.notifyUser(review.reviewee.id, 'review.created', {
        id: review.id,
        orderId: review.order.id,
        reviewerId: review.reviewer.id,
        createdAt: review.createdAt,
      });
    } catch {}

    return review;
  }

  // 查询评价列表
  async findAll(queryDto: QueryReviewDto, userId?: string, role?: string) {
    const { page = 1, pageSize = 10, status, keyword, minRating, maxRating } = queryDto;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    // 角色过滤：
    // - 广告商：仅看我给出的评价
    // - 创作者/设计师：仅看我收到的且评价者为广告商
    if (role === 'ADVERTISER') {
      where.reviewerId = userId;
    } else if (role === 'CREATOR' || role === 'DESIGNER') {
      where.revieweeId = userId;
      (where as any).reviewer = { role: 'ADVERTISER' } as any;
    }

    if (status) where.status = status;
    if (keyword) {
      where.OR = [
        ...(where.OR || []),
        { comment: { contains: keyword } },
        // { reply: { contains: keyword } },
      ];
    }

    if (minRating !== undefined) where.rating = { ...where.rating, gte: minRating };
    if (maxRating !== undefined) where.rating = { ...where.rating, lte: maxRating };

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              title: true,
              amount: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              username: true,
              avatar: true,
              role: true,
            },
          },
          reviewee: {
            select: {
              id: true,
              username: true,
              avatar: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data: reviews,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // 查询单个评价详情
  async findOne(id: string, userId?: string, role?: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            title: true,
            amount: true,
            status: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            username: true,
            avatar: true,
            role: true,
          },
        },
        reviewee: {
          select: {
            id: true,
            username: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('评价不存在');
    }

    // 权限检查
    if ((role === 'ADVERTISER' || role === 'CREATOR' || role === 'DESIGNER') && 
        review.reviewerId !== userId && review.revieweeId !== userId) {
      throw new ForbiddenException('无权访问此评价');
    }

    return review;
  }

  // 更新评价
  async update(id: string, userId: string, updateReviewDto: UpdateReviewDto, role?: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('评价不存在');
    }

    // 只有管理员、评价者或被评价者可以更新评价
    if (role !== 'ADMIN' && review.reviewerId !== userId && review.revieweeId !== userId) {
      throw new ForbiddenException('无权操作此评价');
    }

    // 评价者只能更新评价内容，被评价者只能添加回复
    const updateData: any = {};
    if (role === 'ADMIN') {
      Object.assign(updateData, updateReviewDto);
    } else if (review.reviewerId === userId) {
      // 评价者可以更新评价内容和评分
      if (updateReviewDto.rating !== undefined) updateData.rating = updateReviewDto.rating;
      if (updateReviewDto.comment !== undefined) updateData.comment = updateReviewDto.comment;
    } else if (review.revieweeId === userId) {
      // 被评价者只能添加回复
      if (updateReviewDto.reply !== undefined) updateData.reply = updateReviewDto.reply;
    }

    return this.prisma.review.update({
      where: { id },
      data: updateData,
      include: {
        order: {
          select: {
            id: true,
            title: true,
            amount: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            username: true,
            avatar: true,
            role: true,
          },
        },
        reviewee: {
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

  // 删除评价
  async remove(id: string, userId: string, role?: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('评价不存在');
    }

    // 只有管理员或评价者可以删除评价
    if (role !== 'ADMIN' && review.reviewerId !== userId) {
      throw new ForbiddenException('无权删除此评价');
    }

    return this.prisma.review.delete({
      where: { id },
    });
  }

  // 获取用户评价统计
  async getUserReviewStats(userId: string) {
    const [asReviewer, asReviewee] = await Promise.all([
      // 作为评价者的统计
      this.prisma.review.groupBy({
        by: ['rating'],
        where: { reviewerId: userId },
        _count: { rating: true },
      }),
      // 作为被评价者的统计
      this.prisma.review.groupBy({
        by: ['rating'],
        where: { revieweeId: userId },
        _count: { rating: true },
        _avg: { rating: true },
      }),
    ]);

    // 计算平均评分
    const totalReviews = asReviewee.reduce((sum, item) => sum + item._count.rating, 0);
    const totalScore = asReviewee.reduce((sum, item) => sum + item.rating * item._count.rating, 0);
    const averageRating = totalReviews > 0 ? totalScore / totalReviews : 0;

    return {
      asReviewer: {
        total: asReviewer.reduce((sum, item) => sum + item._count.rating, 0),
        byRating: asReviewer.reduce((acc, item) => {
          acc[item.rating] = item._count.rating;
          return acc;
        }, {}),
      },
      asReviewee: {
        total: totalReviews,
        averageRating: Number(averageRating.toFixed(2)),
        byRating: asReviewee.reduce((acc, item) => {
          acc[item.rating] = item._count.rating;
          return acc;
        }, {}),
      },
    };
  }

  // 获取待评价的订单
  async getPendingReviews(userId: string) {
    // 获取用户参与但尚未评价的已完成订单
    const orders = await this.prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        OR: [
          { customerId: userId },
          { designerId: userId },
        ],
        NOT: {
          reviews: {
            some: {
              reviewerId: userId,
            },
          },
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        designer: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return orders.map(order => ({
      ...order,
      reviewee: order.customerId === userId ? order.designer : order.customer,
    }));
  }
}

