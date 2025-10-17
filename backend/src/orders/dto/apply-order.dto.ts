import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class ApplyOrderDto {
  @ApiProperty({ description: '申请留言', example: '我有丰富的视频制作经验，希望承接此项目', required: false })
  @IsString()
  @IsOptional()
  message?: string;
}

