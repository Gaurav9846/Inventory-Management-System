/*
  Warnings:

  - A unique constraint covering the columns `[creditPaymentNumber]` on the table `CreditPayment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "CreditPayment" ADD COLUMN     "creditPaymentNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CreditPayment_creditPaymentNumber_key" ON "CreditPayment"("creditPaymentNumber");

-- CreateIndex
CREATE INDEX "CreditPayment_creditPaymentNumber_idx" ON "CreditPayment"("creditPaymentNumber");
