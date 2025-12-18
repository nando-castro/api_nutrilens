import { MealItemSource } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export enum MealTypeDto {
  breakfast = 'breakfast',
  lunch = 'lunch',
  snack = 'snack',
  dinner = 'dinner',
  supper = 'supper',
  other = 'other',
}

export class CreateMealItemDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  grams!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  caloriesPer100g!: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  confidence?: number | null;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsEnum(MealItemSource) // VISION | MANUAL
  source!: MealItemSource;
}

export class CreateMealDto {
  @IsEnum(MealTypeDto)
  type!: MealTypeDto;

  @IsOptional()
  @IsDateString()
  takenAt?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMealItemDto)
  items!: CreateMealItemDto[];
}
