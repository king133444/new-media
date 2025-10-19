import { Module } from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { MaterialsController } from './materials.controller';
import { CommunicationsModule } from 'src/communications/communications.module';

@Module({
  imports: [CommunicationsModule],
  providers: [MaterialsService],
  controllers: [MaterialsController],
})
export class MaterialsModule {}

