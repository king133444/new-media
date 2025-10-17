import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsEnum, Min } from 'class-validator';
import { PortfolioStatus } from '@prisma/client';

export class QueryPortfolioDto {
  @ApiProperty({ description: '页码', required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: '每页数量', required: false, default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  pageSize?: number = 10;

  @ApiProperty({ description: '作品类型', required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ description: '状态', required: false, enum: PortfolioStatus })
  @IsOptional()
  @IsEnum(PortfolioStatus)
  status?: PortfolioStatus;

  @ApiProperty({ description: '关键词搜索', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ description: '标签', required: false })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiProperty({ description: '用户ID', required: false })
  @IsOptional()
  @IsString()
  userId?: string;
}
