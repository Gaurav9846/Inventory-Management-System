/*
  Warnings:

  - You are about to drop the column `approvedAt` on the `ProductionBatch` table. All the data in the column will be lost.
  - You are about to drop the column `approvedById` on the `ProductionBatch` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `ProductionBatch` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `ProductionBatch` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProductionBatch" DROP CONSTRAINT "ProductionBatch_approvedById_fkey";

-- DropIndex
DROP INDEX "ProductionBatch_status_idx";

-- AlterTable
ALTER TABLE "ProductionBatch" DROP COLUMN "approvedAt",
DROP COLUMN "approvedById",
DROP COLUMN "endDate",
DROP COLUMN "status";

-- DropEnum
DROP TYPE "ProductionStatus";
