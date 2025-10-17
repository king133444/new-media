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

  @ApiProperty({ description: '作品类型' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ description: '作品链接' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({ description: '缩略图链接', required: false })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiProperty({ description: '标签', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
