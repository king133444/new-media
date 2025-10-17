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
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('交易管理')
@Controller('transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: '创建交易' })
  @ApiResponse({ status: 201, description: '交易创建成功' })
  create(@Request() req, @Body() createTransactionDto: CreateTransactionDto) {
    return this.transactionsService.create(req.user.userId, createTransactionDto);
  }

  @Get()
  @ApiOperation({ summary: '查询交易列表' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findAll(@Request() req, @Query() queryDto: QueryTransactionDto) {
    return this.transactionsService.findAll(queryDto, req.user.userId, req.user.role);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取交易统计' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getStats(@Request() req) {
    return this.transactionsService.getStats(req.user.userId, req.user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询交易详情' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '交易不存在' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.transactionsService.findOne(id, req.user.userId, req.user.role);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新交易状态' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '交易不存在' })
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(id, req.user.userId, updateTransactionDto, req.user.role);
  }

  @Post('deposit')
  @ApiOperation({ summary: '充值' })
  @ApiResponse({ status: 201, description: '充值成功' })
  @ApiResponse({ status: 400, description: '充值失败' })
  deposit(
    @Request() req,
    @Body() body: { amount: number; paymentMethod: string },
  ) {
    return this.transactionsService.deposit(req.user.userId, body.amount, body.paymentMethod);
  }

  @Post('withdraw')
  @ApiOperation({ summary: '提现' })
  @ApiResponse({ status: 201, description: '提现申请成功' })
  @ApiResponse({ status: 400, description: '提现失败' })
  withdraw(
    @Request() req,
    @Body() body: { amount: number; paymentAccount: string },
  ) {
    return this.transactionsService.withdraw(req.user.userId, body.amount, body.paymentAccount);
  }

  @Post('pay-order')
  @ApiOperation({ summary: '支付订单' })
  @ApiResponse({ status: 201, description: '支付成功' })
  @ApiResponse({ status: 400, description: '支付失败' })
  payOrder(
    @Request() req,
    @Body() body: { orderId: string; amount: number },
  ) {
    return this.transactionsService.payOrder(req.user.userId, body.orderId, body.amount);
  }
}

