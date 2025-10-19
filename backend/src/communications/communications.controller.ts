import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CommunicationsService } from './communications.service';
import { CreateCommunicationDto } from './dto/create-communication.dto';
import { QueryCommunicationDto } from './dto/query-communication.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('通信管理')
@Controller('communications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommunicationsController {
  constructor(private readonly communicationsService: CommunicationsService) {}

  @Post()
  @ApiOperation({ summary: '发送消息' })
  @ApiResponse({ status: 201, description: '消息发送成功' })
  @ApiResponse({ status: 404, description: '接收者不存在' })
  sendMessage(@Request() req, @Body() createDto: CreateCommunicationDto) {
    return this.communicationsService.sendMessage(req.user.userId, createDto);
  }

  @Get()
  @ApiOperation({ summary: '获取消息列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getMessages(@Request() req, @Query() queryDto: QueryCommunicationDto) {
    return this.communicationsService.getMessages(queryDto, req.user.userId);
  }

  @Get('conversations')
  @ApiOperation({ summary: '获取对话列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getConversations(@Request() req) {
    return this.communicationsService.getConversations(req.user.userId);
  }

  @Get('conversations/:contactId')
  @ApiOperation({ summary: '获取与特定用户的对话' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getConversationWithUser(@Request() req, @Param('contactId') contactId: string, @Query('limit') limit?: string, @Query('before') before?: string) {
    const parsedLimit = Math.min(Math.max(parseInt(limit || '20', 10) || 20, 1), 100);
    const beforeDate = before ? new Date(before) : undefined;
    return this.communicationsService.getConversationWithUser(req.user.userId, contactId, parsedLimit, beforeDate);
  }

  @Get('unread-count')
  @ApiOperation({ summary: '获取未读消息数' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getUnreadCount(@Request() req) {
    return this.communicationsService.getUnreadCount(req.user.userId);
  }

  @Get('online-users')
  @ApiOperation({ summary: '获取在线用户列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getOnlineUsers(@Request() req) {
    return this.communicationsService.getOnlineUsers(req.user.userId);
  }

  @Post(':id/read')
  @ApiOperation({ summary: '标记消息为已读' })
  @ApiResponse({ status: 200, description: '标记成功' })
  @ApiResponse({ status: 404, description: '消息不存在' })
  markAsRead(@Request() req, @Param('id') messageId: string) {
    return this.communicationsService.markAsRead(messageId, req.user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除消息' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '消息不存在' })
  @ApiResponse({ status: 403, description: '无权删除此消息' })
  deleteMessage(@Request() req, @Param('id') messageId: string) {
    return this.communicationsService.deleteMessage(messageId, req.user.userId);
  }
}
