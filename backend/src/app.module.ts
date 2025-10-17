import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrdersModule } from './orders/orders.module';
import { ReviewsModule } from './reviews/reviews.module';
import { CustomersModule } from './customers/customers.module';
import { MaterialsModule } from './materials/materials.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AdvertisersModule } from './advertisers/advertisers.module';
import { CommunicationsModule } from './communications/communications.module';
import { PortfoliosModule } from './portfolios/portfolios.module';
import { StatisticsModule } from './statistics/statistics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    OrdersModule,
    ReviewsModule,
    CustomersModule,
    MaterialsModule,
    TransactionsModule,
    AdvertisersModule,
    CommunicationsModule,
    PortfoliosModule,
    StatisticsModule,
  ],
})
export class AppModule {}

