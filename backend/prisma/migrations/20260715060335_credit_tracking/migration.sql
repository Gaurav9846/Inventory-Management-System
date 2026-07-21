/*
  Warnings:

  - The `paymentPlatform` column on the `CreditPayment` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PROFILE_CHANGE_REQUEST';

-- DropIndex
DROP INDEX "CreditPayment_paymentPlatform_idx";

-- AlterTable
ALTER TABLE "CreditPayment" DROP COLUMN "paymentPlatform",
ADD COLUMN     "paymentPlatform" TEXT;

-- AlterTable
ALTER TABLE "NotificationPreference" ALTER COLUMN "supplierDelayAlerts" SET DEFAULT false,
ALTER COLUMN "orderUpdates" SET DEFAULT false,
ALTER COLUMN "deliveryUpdates" SET DEFAULT false,
ALTER COLUMN "stockAdjustments" SET DEFAULT false;

-- DropEnum
DROP TYPE "PaymentStatusOrder";

-- CreateTable
CREATE TABLE "CreditPaymentDetail" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditPaymentDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreditPaymentDetail_paymentId_idx" ON "CreditPaymentDetail"("paymentId");

-- CreateIndex
CREATE INDEX "CreditPaymentDetail_salesOrderId_idx" ON "CreditPaymentDetail"("salesOrderId");

-- CreateIndex
CREATE INDEX "CreditPaymentDetail_productId_idx" ON "CreditPaymentDetail"("productId");

-- CreateIndex
CREATE INDEX "CreditPayment_transactionId_idx" ON "CreditPayment"("transactionId");

-- AddForeignKey
ALTER TABLE "CreditPaymentDetail" ADD CONSTRAINT "CreditPaymentDetail_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "CreditPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditPaymentDetail" ADD CONSTRAINT "CreditPaymentDetail_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditPaymentDetail" ADD CONSTRAINT "CreditPaymentDetail_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
