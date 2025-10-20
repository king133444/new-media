import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsIn, IsString } from 'class-validator';
import { UserStatus } from '@prisma/client';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'BANNED'])
  status?: UserStatus;

  // 允许扩展的创作者字段
  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  paymentAccount?: string;

  // skills/tags 后端存 JSON 字符串，这里放宽校验避免拦截
  @IsOptional()
  skills?: any;

  @IsOptional()
  tags?: any;

  // 允许前端通过 /auth/me 更新头像路径（由 /materials/upload-avatar 返回）
  @IsOptional()
  @IsString()
  avatar?: string;
}

