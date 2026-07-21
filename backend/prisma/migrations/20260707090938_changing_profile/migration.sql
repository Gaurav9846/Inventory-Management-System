-- CreateEnum
CREATE TYPE "ProfileChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProfileChangeField" AS ENUM ('NAME', 'EMAIL', 'PHONE', 'PROFILE_IMAGE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "profileImage" TEXT;

-- CreateTable
CREATE TABLE "ProfileChangeRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "field" "ProfileChangeField" NOT NULL,
    "currentValue" TEXT,
    "requestedValue" TEXT NOT NULL,
    "status" "ProfileChangeStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "adminNotes" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileChangeRequest_userId_idx" ON "ProfileChangeRequest"("userId");

-- CreateIndex
CREATE INDEX "ProfileChangeRequest_status_idx" ON "ProfileChangeRequest"("status");

-- CreateIndex
CREATE INDEX "ProfileChangeRequest_createdAt_idx" ON "ProfileChangeRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "ProfileChangeRequest" ADD CONSTRAINT "ProfileChangeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileChangeRequest" ADD CONSTRAINT "ProfileChangeRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
