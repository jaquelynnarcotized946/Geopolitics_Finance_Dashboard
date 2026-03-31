-- AlterTable
ALTER TABLE "ApiRateLimit" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "trialEnd" TIMESTAMP(3);
