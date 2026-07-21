-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "description" TEXT,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "module" TEXT,
ADD COLUMN     "newValues" JSONB,
ADD COLUMN     "oldValues" JSONB,
ADD COLUMN     "userAgent" TEXT,
ADD COLUMN     "userName" TEXT,
ADD COLUMN     "userRole" TEXT;

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity");

-- CreateIndex
CREATE INDEX "AuditLog_module_idx" ON "AuditLog"("module");
