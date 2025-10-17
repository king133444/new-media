import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { CommunicationType } from '@prisma/client';

export class CreateCommunicationDto {
  @ApiProperty({ description: '消息内容' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: '消息类型', enum: CommunicationType, required: false })
  @IsOptional()
  @IsEnum(CommunicationType)
  type?: CommunicationType;

  @ApiProperty({ description: '接收者ID' })
  @IsString()
  @IsNotEmpty()
  receiverId: string;
}
