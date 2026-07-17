-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "ErrorLog" DROP CONSTRAINT "ErrorLog_userId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "ErrorLog" DROP COLUMN "userId",
DROP COLUMN "resolvedBy";
