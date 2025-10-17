import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsIn } from 'class-validator';
import { UserStatus } from '@prisma/client';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'BANNED'])
  status?: UserStatus;
}

