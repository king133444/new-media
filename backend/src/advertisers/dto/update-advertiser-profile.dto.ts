import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail, IsBoolean, IsNumber, IsArray } from 'class-validator';

export class UpdateAdvertiserProfileDto {
  @ApiProperty({ description: '用户名', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ description: '邮箱', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: '头像URL', required: false })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ description: '个人简介', required: false })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ description: '联系方式', required: false })
  @IsOptional()
  @IsString()
  contact?: string;

  @ApiProperty({ description: '公司名称', required: false })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiProperty({ description: '所属行业', required: false })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiProperty({ description: '个人标签', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: '认证状态', required: false })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiProperty({ description: '收款账户信息', required: false })
  @IsOptional()
  @IsString()
  paymentAccount?: string;
}
