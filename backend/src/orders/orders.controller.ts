import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { ApplyOrderDto } from './dto/apply-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('订单管理')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: '创建订单（广告主）' })
  @ApiResponse({ status: 201, description: '订单创建成功' })
  create(@Request() req, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(req.user.userId, createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: '查询订单列表' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findAll(@Request() req, @Query() queryDto: QueryOrderDto) {
    return this.ordersService.findAll(queryDto, req.user.userId, req.user.role);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取订单统计' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getStats(@Request() req) {
    return this.ordersService.getOrderStats(req.user.userId, req.user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询订单详情' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.ordersService.findOne(id, req.user.userId, req.user.role);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新订单（广告主）' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  update(@Request() req, @Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, req.user.userId, updateOrderDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除订单（广告主）' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  remove(@Request() req, @Param('id') id: string) {
    return this.ordersService.remove(id, req.user.userId);
  }

  @Post(':id/apply')
  @ApiOperation({ summary: '申请接单（创作者）' })
  @ApiResponse({ status: 201, description: '申请成功' })
  @ApiResponse({ status: 400, description: '申请失败' })
  applyOrder(@Request() req, @Param('id') orderId: string, @Body() applyOrderDto: ApplyOrderDto) {
    return this.ordersService.applyOrder(orderId, req.user.userId, applyOrderDto);
  }

  @Post(':id/accept/:applicationId')
  @ApiOperation({ summary: '接受申请（广告主）' })
  @ApiResponse({ status: 200, description: '接受成功' })
  @ApiResponse({ status: 404, description: '订单或申请不存在' })
  acceptApplication(
    @Request() req,
    @Param('id') orderId: string,
    @Param('applicationId') applicationId: string,
  ) {
    return this.ordersService.acceptApplication(orderId, applicationId, req.user.userId);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: '完成订单（创作者）' })
  @ApiResponse({ status: 200, description: '订单完成' })
  @ApiResponse({ status: 400, description: '操作失败' })
  completeOrder(@Request() req, @Param('id') id: string) {
    return this.ordersService.completeOrder(id, req.user.userId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消订单（广告主）' })
  @ApiResponse({ status: 200, description: '订单已取消' })
  @ApiResponse({ status: 400, description: '操作失败' })
  cancelOrder(@Request() req, @Param('id') id: string) {
    return this.ordersService.cancelOrder(id, req.user.userId);
  }
}
