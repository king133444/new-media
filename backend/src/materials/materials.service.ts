import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';
import * as fs from 'fs';
import { NotificationsGateway } from '../communications/notifications.gateway';

@Injectable()
export class MaterialsService {
  constructor(private prisma: PrismaService, @Inject(forwardRef(() => NotificationsGateway)) private notifications: NotificationsGateway) {}

  ensureDirExists(dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // 保存上传的文件记录到数据库
  async saveUploadedFiles(userId: string, orderId: string, files: any, kind: 'ATTACHMENT' | 'DELIVERABLE' = 'DELIVERABLE') {
    if (!files || files.length === 0) return [];
    const created = await this.prisma.$transaction(
      files.map((file) =>
        this.prisma.material.create({
          data: {
            url: `/uploads/materials/${file.filename}`,
            title: toUtf8FileName(file.originalname),
            description: JSON.stringify({ mimetype: file.mimetype, kind }),
            type: 'OTHER' as any,
            status: 'ACTIVE' as any,
            userId,
            orderId,
          },
        })
      )
    );
    // 通知：交付物→通知广告商；附件→若已委派则通知创作者
    try {
      const order = await this.prisma.order.findUnique({ where: { id: orderId } });
      const ts = new Date().toISOString();
      if (!order) return created;
      if (kind === 'DELIVERABLE' && order.customerId) {
        this.notifications.notifyUser(order.customerId, 'order.deliverables.submitted', {
          id: `deliverables-${orderId}-${Date.now()}`,
          orderId,
          count: created.length,
          createdAt: ts,
        });
      }
      if (kind === 'ATTACHMENT' && order.designerId) {
        this.notifications.notifyUser(order.designerId, 'order.attachment.uploaded', {
          id: `attachment-${orderId}-${Date.now()}`,
          orderId,
          count: created.length,
          createdAt: ts,
        });
      }
    } catch {}
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

function toUtf8FileName(name: string): string {
  try {
    // 处理部分客户端以 latin1 方式传入导致的中文乱码
    const converted = Buffer.from(name, 'latin1').toString('utf8');
    return converted;
  } catch {
    return name;
  }
}

