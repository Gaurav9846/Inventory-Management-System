/*
  Warnings:

  - You are about to drop the column `pushNotifications` on the `NotificationPreference` table. All the data in the column will be lost.
  - You are about to drop the column `stockAlerts` on the `NotificationPreference` table. All the data in the column will be lost.
  - You are about to drop the `Alert` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'DELIVERY_UPDATE';
ALTER TYPE "NotificationType" ADD VALUE 'NEW_ORDER';

-- DropForeignKey
ALTER TABLE "Alert" DROP CONSTRAINT "Alert_productId_fkey";

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "emailSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailSentAt" TIMESTAMP(3),
ADD COLUMN     "referenceType" TEXT;

-- AlterTable
ALTER TABLE "NotificationPreference" DROP COLUMN "pushNotifications",
DROP COLUMN "stockAlerts",
ADD COLUMN     "criticalAlerts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "deliveryUpdates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "infoAlerts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "stockAdjustments" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "warningAlerts" BOOLEAN NOT NULL DEFAULT true;

-- DropTable
DROP TABLE "Alert";

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "subject" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailLog_notificationId_idx" ON "EmailLog"("notificationId");

-- CreateIndex
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");

-- CreateIndex
CREATE INDEX "EmailLog_sentAt_idx" ON "EmailLog"("sentAt");

-- CreateIndex
CREATE INDEX "Notification_priority_idx" ON "Notification"("priority");

-- CreateIndex
CREATE INDEX "Notification_referenceId_idx" ON "Notification"("referenceId");

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
