import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';  
import { CommunicationsModule } from 'src/communications/communications.module';

@Module({
  imports: [CommunicationsModule],
  providers: [ReviewsService],
  controllers: [ReviewsController],
})
export class ReviewsModule {}

