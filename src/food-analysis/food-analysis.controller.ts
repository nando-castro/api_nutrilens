// src/food-analysis/food-analysis.controller.ts
import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
// import type * as Express from 'express';
import { AnalysisResponseDto } from './dto/analysis-response.dto';
import { FoodAnalysisService } from './food-analysis.service';

@Controller('/food')
export class FoodAnalysisController {
  constructor(private readonly service: FoodAnalysisService) {}

  @Post('analyze')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async analyze(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<AnalysisResponseDto> {
    if (!file) {
      throw new BadRequestException(
        'Arquivo de imagem é obrigatório (campo "file").',
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
    return this.service.analyzeImage(file.buffer as Buffer);
  }
}
