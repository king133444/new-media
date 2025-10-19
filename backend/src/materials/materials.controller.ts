import { Controller, Post, UseGuards, UseInterceptors, UploadedFiles, Body, Query, Request, Get, Param, Res } from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
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
          const name = path.basename(file.originalname, ext);
          const stamp = Date.now();
          cb(null, `${name}-${stamp}${ext}`);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 },
    })
  )
  async upload(
    @Request() req,
    @UploadedFiles() files: any,
    @Query('orderId') orderId?: string,
  ) {
    // 将上传的文件保存记录到数据库
    const created = await this.materialsService.saveUploadedFiles(req.user.userId, orderId as string, files || []);
    return created;
  }

  @Get(':id/preview')
  @UseGuards(JwtAuthGuard)
  async preview(@Param('id') id: string, @Res() res: Response) {
    const { localPath, material } = await this.materialsService.resolveFilePathByMaterialId(id);
    const filename = path.basename(localPath);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(material.title || filename)}`);
    const stream = fs.createReadStream(localPath);
    stream.pipe(res);
  }
}

