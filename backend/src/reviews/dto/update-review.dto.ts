import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ReviewStatus } from '@prisma/client';

export class UpdateReviewDto {
  @ApiProperty({ description: '评价状态', required: false, enum: ReviewStatus })
  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;

  @ApiProperty({ description: '评分（1-5分）', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiProperty({ description: '评价内容', required: false })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({ description: '回复内容', required: false })
  @IsOptional()
  @IsString()
  reply?: string;
}
