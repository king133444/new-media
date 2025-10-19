import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class MaterialsService {
  constructor(private prisma: PrismaService) {}

  ensureDirExists(dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // 保存上传的文件记录到数据库
  async saveUploadedFiles(userId: string, orderId: string, files: any) {
    if (!files || files.length === 0) return [];
    const created = await this.prisma.$transaction(
      files.map((file) =>
        this.prisma.material.create({
          data: {
            url: `/uploads/materials/${file.filename}`,
            title: file.originalname,
            description: file.mimetype,
            type: 'OTHER' as any,
            status: 'ACTIVE' as any,
            userId,
            orderId,
          },
        })
      )
    );
    return created;
  }

  // 获取文件本地路径并校验存在性
  async resolveFilePathByMaterialId(id: string) {
    const material = await this.prisma.material.findUnique({ where: { id } });
    if (!material) throw new NotFoundException('文件不存在');
    const root = process.cwd();
    const localPath = path.join(root, material.url.replace(/^\//, ''));
    if (!fs.existsSync(localPath)) throw new NotFoundException('文件不存在');
    return { localPath, material };
  }
}

