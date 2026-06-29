/*
  Warnings:

  - You are about to drop the column `notes` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `paymentTerms` on the `Supplier` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Supplier" DROP COLUMN "notes",
DROP COLUMN "paymentTerms";
