import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { FoodAnalysisModule } from './food-analysis/food-analysis.module';
import { MealsModule } from './meals/meals.module';
import { PrismaModule } from './shared/prisma/prisma.module';
import { SharedModule } from './shared/shared.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    FoodAnalysisModule,
    PrismaModule,
    SharedModule,
    UsersModule,
    AuthModule,
    MealsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
