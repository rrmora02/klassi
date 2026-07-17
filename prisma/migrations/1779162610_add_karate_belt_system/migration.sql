-- CreateEnum
CREATE TYPE "BeltColor" AS ENUM ('WHITE', 'YELLOW', 'ORANGE', 'GREEN', 'BLUE', 'BROWN', 'BLACK');

-- AlterTable
ALTER TABLE "Student" ADD COLUMN "currentBeltColor" "BeltColor",
ADD COLUMN "beltUpdatedAt" TIMESTAMP(3);
