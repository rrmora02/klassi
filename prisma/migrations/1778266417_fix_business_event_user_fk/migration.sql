-- DropForeignKey
ALTER TABLE "BusinessEvent" DROP CONSTRAINT "BusinessEvent_userId_fkey";

-- AddForeignKey
ALTER TABLE "BusinessEvent" ADD CONSTRAINT "BusinessEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
