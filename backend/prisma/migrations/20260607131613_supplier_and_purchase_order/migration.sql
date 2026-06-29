/*
  Warnings:

  - The `status` column on the `PurchaseOrder` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `paymentStatus` column on the `PurchaseOrder` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropForeignKey
ALTER TABLE "StockTransaction" DROP CONSTRAINT "StockTransaction_productId_fkey";

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "deliveredOnTime" BOOLEAN,
ADD COLUMN     "discount" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "expectedDeliveryDate" TIMESTAMP(3),
ADD COLUMN     "subtotal" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "tax" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "warehouseDestination" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'DRAFT',
ALTER COLUMN "totalAmount" SET DEFAULT 0,
DROP COLUMN "paymentStatus",
ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID';

-- AlterTable
ALTER TABLE "StockTransaction" ADD COLUMN     "rawMaterialId" TEXT,
ALTER COLUMN "productId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "bankAccountName" TEXT,
ADD COLUMN     "bankAccountNumber" TEXT,
ADD COLUMN     "bankBranch" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "performanceRating" DOUBLE PRECISION NOT NULL DEFAULT 4.0,
ADD COLUMN     "productCategories" TEXT[],
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Active';

-- CreateTable
CREATE TABLE "RawMaterial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'piece',
    "category" TEXT NOT NULL,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 10,
    "unitCost" DOUBLE PRECISION,
    "supplierId" TEXT,
    "imageUrl" TEXT,
    "imagePublicId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RawMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderRawMaterial" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "rawMaterialId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,
    "damagedQty" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION,
    "totalPrice" DOUBLE PRECISION,
    "remarks" TEXT,

    CONSTRAINT "PurchaseOrderRawMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderPayment" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "transactionId" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrderPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceivingNote" (
    "id" TEXT NOT NULL,
    "grnNumber" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "receivedById" TEXT NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoodsReceivingNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceivingRawMaterial" (
    "id" TEXT NOT NULL,
    "grnId" TEXT NOT NULL,
    "rawMaterialId" TEXT NOT NULL,
    "orderedQty" INTEGER NOT NULL,
    "previouslyReceived" INTEGER NOT NULL DEFAULT 0,
    "receivedQty" INTEGER NOT NULL,
    "damagedQty" INTEGER NOT NULL DEFAULT 0,
    "acceptedQty" INTEGER NOT NULL,
    "remarks" TEXT,

    CONSTRAINT "GoodsReceivingRawMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RawMaterial_sku_key" ON "RawMaterial"("sku");

-- CreateIndex
CREATE INDEX "RawMaterial_supplierId_idx" ON "RawMaterial"("supplierId");

-- CreateIndex
CREATE INDEX "RawMaterial_category_idx" ON "RawMaterial"("category");

-- CreateIndex
CREATE INDEX "RawMaterial_status_idx" ON "RawMaterial"("status");

-- CreateIndex
CREATE INDEX "PurchaseOrderRawMaterial_purchaseOrderId_idx" ON "PurchaseOrderRawMaterial"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderRawMaterial_rawMaterialId_idx" ON "PurchaseOrderRawMaterial"("rawMaterialId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderPayment_transactionId_key" ON "PurchaseOrderPayment"("transactionId");

-- CreateIndex
CREATE INDEX "PurchaseOrderPayment_purchaseOrderId_idx" ON "PurchaseOrderPayment"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderPayment_paymentDate_idx" ON "PurchaseOrderPayment"("paymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceivingNote_grnNumber_key" ON "GoodsReceivingNote"("grnNumber");

-- CreateIndex
CREATE INDEX "GoodsReceivingNote_purchaseOrderId_idx" ON "GoodsReceivingNote"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "GoodsReceivingNote_grnNumber_idx" ON "GoodsReceivingNote"("grnNumber");

-- CreateIndex
CREATE INDEX "GoodsReceivingRawMaterial_grnId_idx" ON "GoodsReceivingRawMaterial"("grnId");

-- CreateIndex
CREATE INDEX "GoodsReceivingRawMaterial_rawMaterialId_idx" ON "GoodsReceivingRawMaterial"("rawMaterialId");

-- AddForeignKey
ALTER TABLE "RawMaterial" ADD CONSTRAINT "RawMaterial_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderRawMaterial" ADD CONSTRAINT "PurchaseOrderRawMaterial_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderRawMaterial" ADD CONSTRAINT "PurchaseOrderRawMaterial_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderPayment" ADD CONSTRAINT "PurchaseOrderPayment_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderPayment" ADD CONSTRAINT "PurchaseOrderPayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceivingNote" ADD CONSTRAINT "GoodsReceivingNote_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceivingNote" ADD CONSTRAINT "GoodsReceivingNote_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceivingRawMaterial" ADD CONSTRAINT "GoodsReceivingRawMaterial_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "GoodsReceivingNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceivingRawMaterial" ADD CONSTRAINT "GoodsReceivingRawMaterial_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
