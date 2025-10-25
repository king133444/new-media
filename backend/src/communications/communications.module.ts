import { Module, forwardRef } from '@nestjs/common';
import { CommunicationsController } from './communications.controller';
import { CommunicationsService } from './communications.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsGateway } from './notifications.gateway';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CommunicationsController],
  providers: [CommunicationsService, NotificationsGateway],
  exports: [CommunicationsService, NotificationsGateway],
})
export class CommunicationsModule {}
