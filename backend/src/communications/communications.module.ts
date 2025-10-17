import { Module, forwardRef } from '@nestjs/common';
import { CommunicationsController } from './communications.controller';
import { CommunicationsService } from './communications.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsGateway } from './notifications.gateway';
import { JwtModule, JwtService } from '@nestjs/jwt';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [CommunicationsController],
  providers: [CommunicationsService, NotificationsGateway, JwtService],
  exports: [CommunicationsService, NotificationsGateway],
})
export class CommunicationsModule {}
