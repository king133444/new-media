import { ApiProperty } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { IsString, IsEmail, IsNotEmpty, MinLength, IsIn } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ description: '用户名', example: 'newuser' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  username: string;

  @ApiProperty({ description: '邮箱', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '密码', example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ 
    description: '用户角色', 
    example: 'advertiser',
    enum: ['admin', 'advertiser', 'creator', 'designer']
  })
  @IsString()
  
  role: UserRole;
}

