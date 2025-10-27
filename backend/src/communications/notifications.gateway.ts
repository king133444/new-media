import { UseGuards } from '@nestjs/common';
import {
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { CommunicationsService } from './communications.service';

// 放宽 CORS 来源：生产环境建议通过 Nginx 同源反代，或用 CORS_ORIGINS 限制
const wsCors = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    callback(null, true); // 允许所有来源
  },
  credentials: true,
};

@WebSocketGateway({
  cors: wsCors,
  namespace: '/ws',
})
export class NotificationsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtService: JwtService, private readonly communications: CommunicationsService) {}

  // 在线用户映射：userId -> 连接计数
  private onlineUserIdToConnectionCount: Map<string, number> = new Map();

  afterInit(server: Server) {}

  async handleConnection(client: Socket) {
    // 从查询参数或 header 中读取 token
    const token = (client.handshake.auth as any)?.token || (client.handshake.headers['authorization'] as string)?.replace('Bearer ', '');
    try {
      if (token) {
        const payload: any = this.jwtService.verify(token, {
          secret: process.env.JWT_SECRET || 'your-secret-key',
        });
        const userId = payload.sub;
        client.data.userId = userId;
        client.join(`user:${userId}`);
        const count = this.onlineUserIdToConnectionCount.get(userId) || 0;
        this.onlineUserIdToConnectionCount.set(userId, count + 1);
        if (count === 0) {
          this.broadcastOnlineChange();
          // 补推未读：订单申请与消息
          try {
            const unreadApplications = await this.communications.getUnreadOrderApplications?.(userId);
            const unreadMessages = await this.communications.getUnreadCommunications?.(userId);
            if (unreadApplications?.length || unreadMessages?.length) {
              this.notifyUser(userId, 'notifications.bulk', {
                applications: (unreadApplications || []).map((app: any) => ({
                  id: app.id,
                  orderId: app.orderId,
                  message: app.message,
                  createdAt: app.createdAt,
                  event: 'order.application.created',
                })),
                messages: (unreadMessages || []).map((msg: any) => ({
                  id: msg.id,
                  fromUserId: msg.senderId,
                  content: msg.content,
                  createdAt: msg.createdAt,
                  event: 'communication.message',
                })),
              });
            }
          } catch {}
        }
      } else {
        client.disconnect();
      }
    } catch (e) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId as string | undefined;
    if (!userId) return;
    const count = this.onlineUserIdToConnectionCount.get(userId) || 0;
    if (count <= 1) {
      this.onlineUserIdToConnectionCount.delete(userId);
      this.broadcastOnlineChange();
    } else {
      this.onlineUserIdToConnectionCount.set(userId, count - 1);
    }
  }

  // 服务端主动推送给某个用户
  notifyUser(userId: string, event: string, payload: any) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  // 查询在线用户ID列表
  getOnlineUserIds(): string[] {
    return Array.from(this.onlineUserIdToConnectionCount.keys());
  }

  private broadcastOnlineChange() {
    const ids = this.getOnlineUserIds();
    this.server.emit('online.changed', { userIds: ids, timestamp: Date.now() });
  }

  // WebSocket: 发送聊天消息
  @SubscribeMessage('communication.send')
  async handleCommunicationSend(@MessageBody() body: any, @ConnectedSocket() client: Socket) {
    const senderId = client.data.userId as string;
    if (!senderId) return;
    const { content, receiverId, type } = body || {};
    if (!content || !receiverId) return;
    const message = await this.communications.sendMessage(senderId, {
      content,
      receiverId,
      type: type || 'MESSAGE',
    });
   
    // 推送给接收者
    const recvPayload = {
      messageId: message.id,
      fromUserId: senderId,
      content: message.content,
      type: message.type,
      createdAt: message.createdAt,
    };
    this.notifyUser(receiverId, 'communication.message', recvPayload);
    // 推送给发送者用于确认（避免前端乐观追加导致重复）
    const sentPayload = {
      messageId: message.id,
      receiverId,
      content: message.content,
      type: message.type,
      createdAt: message.createdAt,
    };
    this.notifyUser(senderId, 'communication.message.sent', sentPayload);
  }

  // WebSocket: 会话已读
  @SubscribeMessage('communication.read')
  async handleCommunicationRead(@MessageBody() body: any, @ConnectedSocket() client: Socket) {
    const userId = client.data.userId as string;
    if (!userId) return;
    const { contactId } = body || {};
    if (!contactId) return;
    await this.communications.markConversationRead(userId, contactId);
    // 通知双方刷新未读
    this.server.to(`user:${userId}`).emit('communication.read', { userId, contactId });
    this.server.to(`user:${contactId}`).emit('communication.read', { userId, contactId });
  }

  // WebSocket: 标记订单申请为已读（单条）
  @SubscribeMessage('order.application.read')
  async handleOrderApplicationRead(@MessageBody() body: any, @ConnectedSocket() client: Socket) {
    const userId = client.data.userId as string;
    if (!userId) return;
    const { applicationId } = body || {};
    if (!applicationId) return;
    try {
      await (this.communications as any).markOrderApplicationRead?.(applicationId, userId);
      this.notifyUser(userId, 'order.application.read.ack', { applicationId });
    } catch {}
  }

  // WebSocket: 将我的所有订单申请标记为已读
  @SubscribeMessage('order.application.readAll')
  async handleOrderApplicationReadAll(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId as string;
    if (!userId) return;
    try {
      await (this.communications as any).markOrderApplicationReadAll?.(userId);
      this.notifyUser(userId, 'order.application.readAll.ack', { userId });
    } catch {}
  }

  // WebSocket: 主动查询在线用户列表（仅返回给请求方）
  @SubscribeMessage('online.query')
  async handleOnlineQuery(@ConnectedSocket() client: Socket) {
    const ids = this.getOnlineUserIds();
    client.emit('online.changed', { userIds: ids, timestamp: Date.now() });
  }
}


