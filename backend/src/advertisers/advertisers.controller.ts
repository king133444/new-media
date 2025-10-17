import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdvertisersService } from './advertisers.service';
import { UpdateAdvertiserProfileDto } from './dto/update-advertiser-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('广告商管理')
@Controller('advertisers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdvertisersController {
  constructor(private readonly advertisersService: AdvertisersService) {}

  @Get('profile')
  @ApiOperation({ summary: '获取广告商个人资料' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  getProfile(@Request() req) {
    return this.advertisersService.getProfile(req.user.userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: '更新广告商个人资料' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @ApiResponse({ status: 400, description: '更新失败' })
  updateProfile(@Request() req, @Body() updateDto: UpdateAdvertiserProfileDto) {
    return this.advertisersService.updateProfile(req.user.userId, updateDto);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取广告商统计信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getStats(@Request() req) {
    return this.advertisersService.getStats(req.user.userId);
  }

  @Get('wallet')
  @ApiOperation({ summary: '获取钱包信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getWalletInfo(@Request() req) {
    return this.advertisersService.getWalletInfo(req.user.userId);
  }

  @Post('wallet/bind-account')
  @ApiOperation({ summary: '绑定收款账户' })
  @ApiResponse({ status: 200, description: '绑定成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  bindPaymentAccount(@Request() req, @Body() body: { paymentAccount: any }) {
    return this.advertisersService.bindPaymentAccount(req.user.userId, body.paymentAccount);
  }
}
