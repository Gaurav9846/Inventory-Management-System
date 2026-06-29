-- CreateEnum
CREATE TYPE "PaymentStatusOrder" AS ENUM ('PENDING', 'PAID', 'RECEIVED_UNPAID', 'CANCELLED');

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "invoiceUrl" TEXT,
ADD COLUMN     "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "paymentStatus" "PaymentStatusOrder" NOT NULL DEFAULT 'PENDING';
