-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "productionCost" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "RawMaterial" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;
