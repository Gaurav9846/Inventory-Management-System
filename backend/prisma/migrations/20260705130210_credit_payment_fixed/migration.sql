-- CreateEnum
CREATE TYPE "PaymentPlatform" AS ENUM ('KHALTI', 'ESEWA', 'FONEPAY', 'OTHER');

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "CreditPayment" ADD COLUMN     "paymentPlatform" "PaymentPlatform",
ADD COLUMN     "platformTransactionId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "platform" "PaymentPlatform",
ADD COLUMN     "platformTransactionId" TEXT;

-- CreateIndex
CREATE INDEX "CreditPayment_recordedById_idx" ON "CreditPayment"("recordedById");

-- CreateIndex
CREATE INDEX "CreditPayment_paymentPlatform_idx" ON "CreditPayment"("paymentPlatform");

-- CreateIndex
CREATE INDEX "Payment_salesOrderId_idx" ON "Payment"("salesOrderId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_platform_idx" ON "Payment"("platform");
