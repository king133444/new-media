import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsNotEmpty } from 'class-validator';

export class CreatePortfolioDto {
  @ApiProperty({ description: '作品标题' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: '作品描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
