import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('数据统计')
@Controller('statistics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('platform')
  @ApiOperation({ summary: '获取平台整体统计数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getPlatformStats() {
    return this.statisticsService.getPlatformStats();
  }

  @Get('trends')
  @ApiOperation({ summary: '获取时间趋势数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getTrendData(@Query('days') days?: number) {
    return this.statisticsService.getTrendData(days);
  }

  @Get('popular')
  @ApiOperation({ summary: '获取热门数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getPopularData() {
    return this.statisticsService.getPopularData();
  }

  @Get('user')
  @ApiOperation({ summary: '获取用户个人统计数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getUserStats(@Request() req) {
    return this.statisticsService.getUserStats(req.user.userId, req.user.role);
  }
}
