-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('breakfast', 'lunch', 'snack', 'dinner', 'supper', 'other');

-- CreateEnum
CREATE TYPE "MealItemSource" AS ENUM ('VISION', 'MANUAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "MealType" NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imagePath" TEXT,
    "totalCalories" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealItem" (
    "id" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grams" INTEGER NOT NULL,
    "caloriesPer100g" INTEGER NOT NULL,
    "calories" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION,
    "source" "MealItemSource" NOT NULL DEFAULT 'VISION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Meal_userId_takenAt_idx" ON "Meal"("userId", "takenAt");

-- CreateIndex
CREATE INDEX "MealItem_mealId_idx" ON "MealItem"("mealId");

-- AddForeignKey
ALTER TABLE "Meal" ADD CONSTRAINT "Meal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealItem" ADD CONSTRAINT "MealItem_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
