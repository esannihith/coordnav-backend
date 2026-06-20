-- CreateEnum
CREATE TYPE "RevocationReason" AS ENUM ('ROTATED', 'LOGOUT', 'SUPERSEDED', 'REUSE');

-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "reason" "RevocationReason";
