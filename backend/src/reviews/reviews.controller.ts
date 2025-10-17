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
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { QueryReviewDto } from './dto/query-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('评价管理')
@Controller('reviews')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiOperation({ summary: '创建评价' })
  @ApiResponse({ status: 201, description: '评价创建成功' })
  @ApiResponse({ status: 400, description: '评价失败' })
  create(@Request() req, @Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.create(req.user.userId, createReviewDto);
  }

  @Get()
  @ApiOperation({ summary: '查询评价列表' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findAll(@Request() req, @Query() queryDto: QueryReviewDto) {
    return this.reviewsService.findAll(queryDto, req.user.userId, req.user.role);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取用户评价统计' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getUserStats(@Request() req) {
    return this.reviewsService.getUserReviewStats(req.user.userId);
  }

  @Get('pending')
  @ApiOperation({ summary: '获取待评价订单' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getPendingReviews(@Request() req) {
    return this.reviewsService.getPendingReviews(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询评价详情' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '评价不存在' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.reviewsService.findOne(id, req.user.userId, req.user.role);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新评价' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '评价不存在' })
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, req.user.userId, updateReviewDto, req.user.role);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除评价' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '评价不存在' })
  remove(@Request() req, @Param('id') id: string) {
    return this.reviewsService.remove(id, req.user.userId, req.user.role);
  }
}

