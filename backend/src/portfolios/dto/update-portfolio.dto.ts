import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, IsEnum } from 'class-validator';
import { PortfolioStatus } from '@prisma/client';

export class UpdatePortfolioDto {
  @ApiProperty({ description: '作品标题', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: '作品描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '状态', required: false, enum: PortfolioStatus })
  @IsOptional()
  @IsEnum(PortfolioStatus)
  status?: PortfolioStatus;
}
