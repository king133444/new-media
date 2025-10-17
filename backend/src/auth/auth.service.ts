import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '@prisma/client';
import { UpdateUserDto } from '../users/dto/update-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usersService.findByUsername(username);
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id, role: user.role };
    return {
      token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    };
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
    role: UserRole;
  }) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const user = await this.usersService.create({
      ...userData,
      password: hashedPassword,
    });

    return this.login(user);
  }

  async getProfile(userId: string) {
    return this.usersService.findById(userId);
  }

  async updateProfile(userId: string, updateUserDto: UpdateUserDto) {
    // 如果包含密码则加密
    if ((updateUserDto as any).password) {
      (updateUserDto as any).password = await bcrypt.hash((updateUserDto as any).password, 10);
    }
    return this.usersService.update(userId, updateUserDto);
  }
}

