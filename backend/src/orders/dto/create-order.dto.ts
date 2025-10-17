import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional, IsDateString, Min } from 'class-validator';
import { OrderType, Priority } from '@prisma/client';

export class CreateOrderDto {
  @ApiProperty({ description: '订单标题', example: '品牌宣传视频制作' })
  @IsString()
  title: string;

  @ApiProperty({ description: '订单描述', example: '需要制作一个30秒的品牌宣传视频', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '订单类型', enum: OrderType, example: 'VIDEO' })
  @IsEnum(OrderType)
  type: OrderType;

  @ApiProperty({ description: '订单金额', example: 5000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: '预算', example: 6000, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  budget?: number;

  @ApiProperty({ description: '优先级', enum: Priority, example: 'HIGH', required: false })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiProperty({ description: '截止时间', example: '2024-12-31T23:59:59Z', required: false })
  @IsDateString()
  @IsOptional()
  deadline?: string;

  @ApiProperty({ description: '内容要求', example: '需要包含品牌logo和slogan', required: false })
  @IsString()
  @IsOptional()
  contentRequirements?: string;

  @ApiProperty({ description: '项目需求（JSON格式）', example: '{"duration": 30, "format": "mp4"}', required: false })
  @IsString()
  @IsOptional()
  requirements?: string;

  @ApiProperty({ description: '订单标签（JSON格式）', example: '["紧急", "重要"]', required: false })
  @IsString()
  @IsOptional()
  tags?: string;
}

