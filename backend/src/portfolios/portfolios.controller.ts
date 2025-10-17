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
import { PortfoliosService } from './portfolios.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { QueryPortfolioDto } from './dto/query-portfolio.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('作品集管理')
@Controller('portfolios')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PortfoliosController {
  constructor(private readonly portfoliosService: PortfoliosService) {}

  @Post()
  @ApiOperation({ summary: '创建作品集' })
  @ApiResponse({ status: 201, description: '作品集创建成功' })
  create(@Request() req, @Body() createPortfolioDto: CreatePortfolioDto) {
    return this.portfoliosService.create(req.user.userId, createPortfolioDto);
  }

  @Get()
  @ApiOperation({ summary: '查询作品集列表' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findAll(@Request() req, @Query() queryDto: QueryPortfolioDto) {
    return this.portfoliosService.findAll(queryDto, req.user.userId, req.user.role);
  }

  @Get('popular')
  @ApiOperation({ summary: '获取热门作品集' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getPopularPortfolios(@Query('limit') limit?: number) {
    return this.portfoliosService.getPopularPortfolios(limit);
  }

  @Get('search')
  @ApiOperation({ summary: '搜索作品集' })
  @ApiResponse({ status: 200, description: '搜索成功' })
  searchPortfolios(
    @Query('keyword') keyword: string,
    @Query('type') type?: string,
  ) {
    return this.portfoliosService.searchPortfolios(keyword, { type });
  }

  @Get('stats')
  @ApiOperation({ summary: '获取用户作品集统计' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getUserStats(@Request() req) {
    return this.portfoliosService.getUserPortfolioStats(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询作品集详情' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '作品集不存在' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.portfoliosService.findOne(id, req.user.userId, req.user.role);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新作品集' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '作品集不存在' })
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updatePortfolioDto: UpdatePortfolioDto,
  ) {
    return this.portfoliosService.update(id, req.user.userId, updatePortfolioDto, req.user.role);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除作品集' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '作品集不存在' })
  remove(@Request() req, @Param('id') id: string) {
    return this.portfoliosService.remove(id, req.user.userId, req.user.role);
  }
}
