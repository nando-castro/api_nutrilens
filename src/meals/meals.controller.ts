// meals.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateMealDto } from './dto/create-meal.dto';
import { MealsService } from './meals.service';

import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Request } from 'express';

type ReqUser = { userId: string; email: string };

@Controller('meals')
@UseGuards(JwtAuthGuard)
export class MealsController {
  constructor(private readonly mealsService: MealsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = join(process.cwd(), 'uploads', 'meals');
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const id = randomUUID();
          const ext = extname(file.originalname || '.jpg') || '.jpg';
          cb(null, `${id}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(
            new BadRequestException('Arquivo inválido (não é imagem).') as any,
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 6 * 1024 * 1024 },
    }),
  )
  async create(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: any, // <= NÃO tipar como CreateMealDto aqui
  ) {
    const user = req.user as ReqUser;

    // multipart: { data: "json-string" }
    // json puro: body já é o dto
    const rawDto =
      typeof body?.data === 'string' ? JSON.parse(body.data) : body;

    const dto = plainToInstance(CreateMealDto, rawDto);

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length) {
      throw new BadRequestException(errors);
    }

    const imagePath = file ? `/uploads/meals/${file.filename}` : null;
    return this.mealsService.create(user.userId, dto, imagePath);
  }

  @Get()
  async listByDay(@Req() req: Request, @Query('date') date: string) {
    const user = req.user as ReqUser;
    if (!date) throw new BadRequestException('Informe date=YYYY-MM-DD');
    return this.mealsService.listByDay(user.userId, date);
  }

  @Get(':id')
  async getOne(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as ReqUser;
    return this.mealsService.getById(user.userId, id);
  }

  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as ReqUser;
    return this.mealsService.remove(user.userId, id);
  }
}
