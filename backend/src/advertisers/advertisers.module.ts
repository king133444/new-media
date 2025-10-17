import { Module } from '@nestjs/common';
import { AdvertisersController } from './advertisers.controller';
import { AdvertisersService } from './advertisers.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdvertisersController],
  providers: [AdvertisersService],
  exports: [AdvertisersService],
})
export class AdvertisersModule {}
