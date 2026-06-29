-- CreateTable
CREATE TABLE "PurchaseOrderInvoice" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imagePublicId" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "uploadedById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrderInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseOrderInvoice_purchaseOrderId_idx" ON "PurchaseOrderInvoice"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderInvoice_createdAt_idx" ON "PurchaseOrderInvoice"("createdAt");

-- AddForeignKey
ALTER TABLE "PurchaseOrderInvoice" ADD CONSTRAINT "PurchaseOrderInvoice_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderInvoice" ADD CONSTRAINT "PurchaseOrderInvoice_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
