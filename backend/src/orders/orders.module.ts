import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CommunicationsModule } from 'src/communications/communications.module';

@Module({
  imports: [CommunicationsModule],
  providers: [OrdersService],
  controllers: [OrdersController],
})
export class OrdersModule {}

