import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsEnum, Min } from 'class-validator';
import { TransactionType } from '@prisma/client';

export class CreateTransactionDto {
  @ApiProperty({ description: '交易金额' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: '交易类型', enum: TransactionType })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ description: '交易描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '支付方式', required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({ description: '收款账户', required: false })
  @IsOptional()
  @IsString()
  paymentAccount?: string;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty({ description: '关联订单ID', required: false })
  @IsOptional()
  @IsString()
  orderId?: string;
}
