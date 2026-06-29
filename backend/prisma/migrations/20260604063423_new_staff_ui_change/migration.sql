/*
  Warnings:

  - You are about to drop the column `outstandingBalance` on the `Customer` table. All the data in the column will be lost.
  - The `method` column on the `Payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'ONLINE', 'CREDIT', 'PAY_LATER');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('NEW', 'REGULAR', 'VIP');

-- CreateEnum
CREATE TYPE "CreditStatus" AS ENUM ('PAID', 'PARTIAL', 'OVERDUE', 'PENDING');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('JAR_20L', 'BOTTLE_500ML', 'BOTTLE_1L', 'OTHER');

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "outstandingBalance",
ADD COLUMN     "creditLimit" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "customerType" "CustomerType" NOT NULL DEFAULT 'REGULAR',
ADD COLUMN     "outstandingCredit" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "method",
ADD COLUMN     "method" "PaymentMethod" NOT NULL DEFAULT 'CASH';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "type" "ProductType" NOT NULL DEFAULT 'OTHER';

-- CreateTable
CREATE TABLE "CreditAccount" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "totalCredit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "CreditStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditAccount_customerId_key" ON "CreditAccount"("customerId");

-- AddForeignKey
ALTER TABLE "CreditAccount" ADD CONSTRAINT "CreditAccount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
