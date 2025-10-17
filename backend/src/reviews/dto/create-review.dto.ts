import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ description: '订单ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: '被评价用户ID' })
  @IsString()
  revieweeId: string;

  @ApiProperty({ description: '评分（1-5分）' })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ description: '评价内容' })
  @IsString()
  content: string;

  @ApiProperty({ description: '回复内容', required: false })
  @IsOptional()
  @IsString()
  reply?: string;
}
