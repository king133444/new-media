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
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PortfoliosService } from './portfolios.service';
import { PrismaService } from '../prisma/prisma.service';
import { MaterialsService } from '../materials/materials.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { QueryPortfolioDto } from './dto/query-portfolio.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';

import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('作品集管理')
@Controller('portfolios')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PortfoliosController {
  constructor(
    private readonly portfoliosService: PortfoliosService,
    private readonly prisma: PrismaService,
    private readonly materialsService: MaterialsService,
  ) {}

  @Post()
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dest = path.join(process.cwd(), 'uploads', 'materials');
          fs.mkdirSync(dest, { recursive: true });
          cb(null, dest);
        },
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname);
          const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
          cb(null, `${name}-${Date.now()}${ext}`);
        },
      }),
      limits: { fileSize: (() => { const v = parseInt(process.env.MAX_FILE_SIZE || '', 10); return Number.isFinite(v) && v > 0 ? v : 500 * 1024 * 1024; })() },
    })
  )
  @ApiOperation({ summary: '创建作品集（支持同时上传缩略图与附件）' })
  @ApiResponse({ status: 201, description: '作品集创建成功' })
  async create(
    @Request() req,
    @Body() createPortfolioDto: CreatePortfolioDto,
    @UploadedFiles() files: Array<Multer>,
  ) {
    const created = await this.portfoliosService.create(req.user.userId, req.user.role, createPortfolioDto);
    const thumbFile = (files || []).find((f) => f.fieldname === 'thumbnail');
    const attachFiles = (files || []).filter((f) => f.fieldname !== 'thumbnail');
    // 设置缩略图（如果有）
    if (thumbFile) {
      const url = `/uploads/materials/${thumbFile.filename}`;
      await this.prisma.portfolio.update({
        where: { id: created.id },
        data: { thumbnail: url },
      });
      (created as any).thumbnail = url;
    }
    // 归档附件到作品集
    if (attachFiles.length) {
      await this.materialsService.saveUploadedFiles(req.user.userId, undefined as any, attachFiles, 'PORTFOLIO', created.id);
      const mats = await this.prisma.material.findMany({ where: ({ portfolioId: created.id } as any), orderBy: { createdAt: 'desc' } });
      (created as any).materials = mats;
    }
    return created;
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
