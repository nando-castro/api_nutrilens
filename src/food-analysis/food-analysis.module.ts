// src/food-analysis/food-analysis.module.ts
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { NutritionService } from '../shared/nutrition/nutrition.service';
import { TranslationService } from '../shared/translation/translation.service';
import { FoodAnalysisController } from './food-analysis.controller';
import { FoodAnalysisService } from './food-analysis.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  controllers: [FoodAnalysisController],
  providers: [FoodAnalysisService, TranslationService, NutritionService],
  exports: [FoodAnalysisService],
})
export class FoodAnalysisModule {}
