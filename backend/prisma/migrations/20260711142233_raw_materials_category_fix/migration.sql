-- AlterTable
ALTER TABLE "RawMaterialCategory" ADD COLUMN     "icon" TEXT;

-- CreateTable
CREATE TABLE "_SupplierCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SupplierCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_SupplierCategories_B_index" ON "_SupplierCategories"("B");

-- CreateIndex
CREATE INDEX "RawMaterial_isArchived_idx" ON "RawMaterial"("isArchived");

-- AddForeignKey
ALTER TABLE "_SupplierCategories" ADD CONSTRAINT "_SupplierCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "RawMaterialCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SupplierCategories" ADD CONSTRAINT "_SupplierCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
