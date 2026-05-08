-- DropForeignKey
ALTER TABLE "BusinessEvent" DROP CONSTRAINT "BusinessEvent_userId_fkey";

-- AlterTable
ALTER TABLE "BusinessEvent" DROP COLUMN "userId";
