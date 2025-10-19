import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { CreateCommunicationDto } from './dto/create-communication.dto';
import { QueryCommunicationDto } from './dto/query-communication.dto';
import { CommunicationType, CommunicationStatus } from '@prisma/client';

@Injectable()
export class CommunicationsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsGateway)) private notifications: NotificationsGateway,
  ) {}

  // 发送消息
  async sendMessage(userId: string, createDto: CreateCommunicationDto) {
    // 检查接收者是否存在
    const receiver = await this.prisma.user.findUnique({
      where: { id: createDto.receiverId },
    });

    if (!receiver) {
      throw new NotFoundException('接收者不存在');
    }

    // 不能给自己发消息
    if (userId === createDto.receiverId) {
      throw new BadRequestException('不能给自己发送消息');
    }

    const message = await this.prisma.communication.create({
      data: {
        ...createDto,
        senderId: userId,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
            role: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    // 推送放到网关统一处理，避免重复发送
    return message;
  }

  // 获取消息列表
  async getMessages(queryDto: QueryCommunicationDto, userId: string) {
    const { page = 1, pageSize = 10, type, status, contactId, keyword } = queryDto;
    const skip = (page - 1) * pageSize;

    const where: any = {
      OR: [
        { senderId: userId },
        { receiverId: userId },
      ],
    };

    if (type) where.type = type;
    if (status) where.status = status;
    if (keyword) {
      where.content = { contains: keyword };
    }

    if (contactId) {
      where.AND = [
        {
          OR: [
            { senderId: userId, receiverId: contactId },
            { senderId: contactId, receiverId: userId },
          ],
        },
      ];
    }

    const [messages, total] = await Promise.all([
      this.prisma.communication.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              avatar: true,
              role: true,
            },
          },
          receiver: {
            select: {
              id: true,
              username: true,
              avatar: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.communication.count({ where }),
    ]);

    return {
      data: messages,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // 获取对话列表（按联系人分组）
  async getConversations(userId: string) {
    // 获取所有与当前用户相关的消息
    const messages = await this.prisma.communication.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
            role: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 按联系人分组
    const conversations = new Map();

    messages.forEach((message) => {
      const contact = message.senderId === userId ? message.receiver : message.sender;
      const contactId = contact.id;

      if (!conversations.has(contactId)) {
        conversations.set(contactId, {
          contact,
          lastMessage: message,
          unreadCount: 0,
        });
      }

      const conversation = conversations.get(contactId);
      
      // 更新未读消息数
      if (message.receiverId === userId && message.status === CommunicationStatus.UNREAD) {
        conversation.unreadCount++;
      }
    });

    return Array.from(conversations.values()).sort((a, b) => 
      new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
    );
  }

  // 获取与特定用户的对话
  async getConversationWithUser(userId: string, contactId: string, limit: number = 20, before?: Date) {
    // 支持向上滚动增量加载：查询 before 之前的消息，默认取最新 limit 条
    const whereBase: any = {
      OR: [
        { senderId: userId, receiverId: contactId },
        { senderId: contactId, receiverId: userId },
      ],
    };
    if (before) {
      whereBase.createdAt = { lt: before };
    }
    const latest = await this.prisma.communication.findMany({
      where: whereBase,
      include: {
        sender: {
          select: { id: true, username: true, avatar: true, role: true },
        },
        receiver: {
          select: { id: true, username: true, avatar: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    const messages = latest.reverse();

    // 将发送给当前用户的消息标记为已读
    await this.prisma.communication.updateMany({
      where: {
        senderId: contactId,
        receiverId: userId,
        status: CommunicationStatus.UNREAD,
      },
      data: {
        status: CommunicationStatus.READ,
      },
    });

    return messages;
  }

  // 标记消息为已读
  async markAsRead(messageId: string, userId: string) {
    const message = await this.prisma.communication.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('消息不存在');
    }

    if (message.receiverId !== userId) {
      throw new ForbiddenException('无权操作此消息');
    }

    return this.prisma.communication.update({
      where: { id: messageId },
      data: { status: CommunicationStatus.READ },
    });
  }

  // 标记与某联系人会话为已读（将对方发给我的未读置为已读）
  async markConversationRead(userId: string, contactId: string) {
    const res = await this.prisma.communication.updateMany({
      where: {
        senderId: contactId,
        receiverId: userId,
        status: CommunicationStatus.UNREAD,
      },
      data: {
        status: CommunicationStatus.READ,
      },
    });
    return { count: res.count };
  }

  // 获取未读消息数
  async getUnreadCount(userId: string) {
    return this.prisma.communication.count({
      where: {
        receiverId: userId,
        status: CommunicationStatus.UNREAD,
      },
    });
  }

  // 删除消息
  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.communication.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('消息不存在');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('只能删除自己发送的消息');
    }

    return this.prisma.communication.delete({
      where: { id: messageId },
    });
  }

  // 获取在线用户列表（简化版，实际应该结合WebSocket）
  async getOnlineUsers(userId: string) {
    // 这里简化处理，实际应该结合WebSocket或Redis来管理在线状态
    // 返回最近活跃的用户
    const recentUsers = await this.prisma.user.findMany({
      where: {
        id: { not: userId },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        role: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    const onlineIds = new Set(this.notifications.getOnlineUserIds());
    return recentUsers.map(user => ({
      ...user,
      isOnline: onlineIds.has(user.id),
    }));
  }

  // ====== 离线通知/未读补推相关 ======
  // 未读订单申请（广告主作为 publisherId）
  async getUnreadOrderApplications(userId: string) {
    return this.prisma.orderApplication.findMany({
      where: { publisherId: userId, isRead: false },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        orderId: true,
        message: true,
        createdAt: true,
      },
    });
  }

  // 未读聊天消息（我作为接收者）
  async getUnreadCommunications(userId: string) {
    return this.prisma.communication.findMany({
      where: { receiverId: userId, status: CommunicationStatus.UNREAD },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        senderId: true,
        content: true,
        createdAt: true,
      },
    });
  }

  // 将某条订单申请标记为已读（仅订单发布者可操作）
  async markOrderApplicationRead(applicationId: string, userId: string) {
    const app = await this.prisma.orderApplication.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundException('申请不存在');
    if (app.publisherId !== userId) throw new ForbiddenException('无权操作此申请');
    await this.prisma.orderApplication.update({
      where: { id: applicationId },
      data: { isRead: true },
    });
    return { applicationId };
  }

  // 将我的所有订单申请标记为已读（广告主批量）
  async markOrderApplicationReadAll(userId: string) {
    const res = await this.prisma.orderApplication.updateMany({
      where: { publisherId: userId, isRead: false },
      data: { isRead: true },
    });
    return { count: res.count };
  }
}
