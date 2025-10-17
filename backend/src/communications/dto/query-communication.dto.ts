import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsNumber, Min } from 'class-validator';
import { CommunicationType, CommunicationStatus } from '@prisma/client';

export class QueryCommunicationDto {
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

  @ApiProperty({ description: '消息类型', required: false, enum: CommunicationType })
  @IsOptional()
  @IsEnum(CommunicationType)
  type?: CommunicationType;

  @ApiProperty({ description: '消息状态', required: false, enum: CommunicationStatus })
  @IsOptional()
  @IsEnum(CommunicationStatus)
  status?: CommunicationStatus;

  @ApiProperty({ description: '对话对象ID', required: false })
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiProperty({ description: '关键词搜索', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;
}
