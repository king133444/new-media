import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsInt, Min, IsNumber, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { OrderStatus, Priority } from '@prisma/client';

export class QueryOrderDto {
  @ApiProperty({ description: '页码', example: 1, required: false })
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ description: '每页数量', example: 10, required: false })
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  @IsOptional()
  pageSize?: number = 10;

  // 已移除：type 过滤字段

  @ApiProperty({ description: '订单状态', enum: OrderStatus, required: false })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @ApiProperty({ description: '紧急程度', enum: Priority, required: false })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiProperty({ description: '关键词搜索', required: false })
  @IsString()
  @IsOptional()
  keyword?: string;

  @ApiProperty({ description: '最小金额', required: false })
  @IsNumber()
  @Transform(({ value }) => (value === undefined || value === null || value === '' ? undefined : parseFloat(value)))
  @IsOptional()
  minAmount?: number;

  @ApiProperty({ description: '最大金额', required: false })
  @IsNumber()
  @Transform(({ value }) => (value === undefined || value === null || value === '' ? undefined : parseFloat(value)))
  @IsOptional()
  maxAmount?: number;

  @ApiProperty({ description: '是否仅查看自己的订单（广告商专用）', required: false, example: true })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    const v = String(value).toLowerCase();
    return v === 'true' || v === '1';
  })
  mine?: boolean;
}

