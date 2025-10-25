import { Controller, Post, UseGuards, UseInterceptors, UploadedFiles, UploadedFile, Body, Query, Request, Get, Param, Res, BadRequestException } from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { Response } from 'express';

@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
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
          const raw = path.basename(file.originalname, ext);
          // 将物理文件名限定为 ASCII，避免中文在部分文件系统/工具中出现乱码
          const safeBase = raw
            .normalize('NFKD')
            .replace(/[^a-zA-Z0-9-_\.]+/g, '_');
          const stamp = Date.now();
          cb(null, `${safeBase || 'file'}-${stamp}${ext}`);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 },
    })
  )
  async upload(
    @Request() req,
    @UploadedFiles() files: any,
    @Query('orderId') orderId?: string,
    @Query('portfolioId') portfolioId?: string,
    @Query('kind') kind?: 'ATTACHMENT' | 'DELIVERABLE',
  ) {
    // 将上传的文件保存记录到数据库（kind: ATTACHMENT | DELIVERABLE）
    const created = await this.materialsService.saveUploadedFiles(req.user.userId, orderId as string, files || [], kind, portfolioId as string);
    return created;
  }

  // 上传头像：保存到 /uploads/avatars，返回相对路径
  @Post('upload-avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dest = path.join(process.cwd(), 'uploads', 'avatars');
          fs.mkdirSync(dest, { recursive: true });
          cb(null, dest);
        },
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname);
          const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
          cb(null, `${name}-${Date.now()}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
    })
  )
  async uploadAvatar(
    @Request() req,
    @UploadedFile() file: any,
  ) {
    if (!file) throw new BadRequestException('未选择文件');
    const relativePath = `/uploads/avatars/${file.filename}`;
    // 不直接落库，前端拿到 url 后通过 /auth/me PATCH avatar 字段
    return { url: relativePath };
  }

  @Get(':id/preview')
  @UseGuards(JwtAuthGuard)
  async preview(@Param('id') id: string, @Res() res: Response) {
    const { localPath, material } = await this.materialsService.resolveFilePathByMaterialId(id);
    const fallbackName = material.title || path.basename(localPath);
    const encodedName = encodeURIComponent(fallbackName);
    const stat = fs.statSync(localPath);
    res.setHeader('Content-Type', 'application/octet-stream');
    // 同时设置 filename 与 filename*，提升各浏览器（含 IE/Edge Legacy）兼容性
    res.setHeader('Content-Disposition', `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`);
    res.setHeader('Content-Length', stat.size.toString());
    const stream = fs.createReadStream(localPath);
    stream.pipe(res);
  }

  // 用户附件（无订单）列表：本人/管理员可见全部；广告商查看他人仅返回已审核作品集下的素材
  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  async listUserMaterials(@Request() req, @Param('userId') userId: string) {
    return this.materialsService.findUserMaterials(userId, req.user.userId, req.user.role);
  }
}

