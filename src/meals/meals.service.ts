import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MealItemSource } from '@prisma/client';
import { PrismaService } from '../shared/prisma/prisma.service';
import { CreateMealDto } from './dto/create-meal.dto';

@Injectable()
export class MealsService {
  constructor(private readonly prisma: PrismaService) {}

  private calcItemCalories(calPer100g: number, grams: number): number {
    return Math.round((calPer100g * grams) / 100);
  }

  private parseDayRange(date: string): { start: Date; end: Date } {
    const trimmed = (date ?? '').trim();

    // YYYY-MM-DD
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (iso) {
      const year = Number(iso[1]);
      const month = Number(iso[2]); // 1-12
      const day = Number(iso[3]); // 1-31
      const start = new Date(year, month - 1, day, 0, 0, 0, 0);
      const end = new Date(year, month - 1, day, 23, 59, 59, 999);
      return { start, end };
    }

    // DD/MM/YYYY
    const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
    if (br) {
      const day = Number(br[1]);
      const month = Number(br[2]);
      const year = Number(br[3]);
      const start = new Date(year, month - 1, day, 0, 0, 0, 0);
      const end = new Date(year, month - 1, day, 23, 59, 59, 999);
      return { start, end };
    }

    throw new BadRequestException(
      'Parâmetro "date" inválido. Use "YYYY-MM-DD" (ex: 2025-12-18) ou "DD/MM/YYYY" (ex: 18/12/2025).',
    );
  }

  async create(userId: string, dto: CreateMealDto, imagePath?: string | null) {
    const takenAt = dto.takenAt ? new Date(dto.takenAt) : new Date();

    const itemsData = dto.items.map((it) => {
      const calories = this.calcItemCalories(it.caloriesPer100g, it.grams);
      return {
        name: it.name,
        grams: it.grams,
        caloriesPer100g: it.caloriesPer100g,
        calories,
        confidence: it.confidence ?? null,
        source: it.source as MealItemSource,
      };
    });

    const totalCalories = itemsData.reduce((acc, i) => acc + i.calories, 0);

    return this.prisma.meal.create({
      data: {
        userId,
        type: dto.type as any,
        takenAt,
        imagePath: imagePath ?? null,
        totalCalories,
        items: { create: itemsData },
      },
      include: { items: true },
    });
  }

  async listByDay(userId: string, date: string) {
    const { start, end } = this.parseDayRange(date);

    return this.prisma.meal.findMany({
      where: { userId, takenAt: { gte: start, lte: end } },
      orderBy: { takenAt: 'desc' },
      include: { items: true },
    });
  }

  async getById(userId: string, id: string) {
    const meal = await this.prisma.meal.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!meal) throw new NotFoundException('Refeição não encontrada.');
    if (meal.userId !== userId) throw new ForbiddenException();

    return meal;
  }

  async remove(userId: string, id: string) {
    const meal = await this.prisma.meal.findUnique({ where: { id } });
    if (!meal) throw new NotFoundException('Refeição não encontrada.');
    if (meal.userId !== userId) throw new ForbiddenException();

    await this.prisma.meal.delete({ where: { id } });
    return { ok: true };
  }
}
