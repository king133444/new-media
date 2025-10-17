import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsEnum, Min } from 'class-validator';
import { ReviewStatus } from '@prisma/client';

export class QueryReviewDto {
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

  @ApiProperty({ description: '评价状态', required: false, enum: ReviewStatus })
  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;

  @ApiProperty({ description: '关键词搜索', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ description: '评分范围（最低分）', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  minRating?: number;

  @ApiProperty({ description: '评分范围（最高分）', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxRating?: number;
}
