// prisma/scripts/fix-audit-descriptions.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixAuditDescriptions() {
  console.log("🔄 Fixing audit log descriptions...");

  try {
    // Get all audit logs with missing or empty descriptions
    const logs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { description: null },
          { description: "" },
          { description: "—" },
        ],
      },
      select: {
        id: true,
        userId: true,
        userName: true,
        action: true,
        entity: true,
        entityId: true,
        module: true,
      },
    });

    console.log(`📊 Found ${logs.length} logs to fix`);

    if (logs.length === 0) {
      console.log("✅ No logs need fixing!");
      await prisma.$disconnect();
      return;
    }

    const actionLabels = {
      CREATE: 'Created',
      UPDATE: 'Updated',
      DELETE: 'Deleted',
      ARCHIVE: 'Archived',
      RESTORE: 'Restored',
      LOGIN: 'Logged in',
      LOGOUT: 'Logged out',
      APPROVE: 'Approved',
      REJECT: 'Rejected',
      RECORD_PAYMENT: 'Recorded payment for',
      CHANGE_PASSWORD: 'Changed password',
      DEACTIVATE: 'Deactivated',
      ACTIVATE: 'Activated',
      STOCK_IN: 'Added stock to',
      STOCK_OUT: 'Removed stock from',
      STOCK_ADJUST: 'Adjusted stock for',
      UPDATE_STATUS: 'Updated status of',
      CANCEL: 'Cancelled',
      BULK_UPDATE_STATUS: 'Bulk updated orders',
      UPLOAD_INVOICE: 'Uploaded invoice for',
      DELETE_INVOICE: 'Deleted invoice for',
      RECEIVE_GOODS: 'Received goods for',
      VIEW_REPORT: 'Viewed report',
      ADD_PAYMENT: 'Added payment to',
      BULK_DELETE: 'Bulk deleted',
      BULK_ARCHIVE: 'Bulk archived',
      EXPORT: 'Exported',
      IMPORT: 'Imported',
    };

    const entityLabels = {
      User: 'user',
      Users: 'user',
      Product: 'product',
      Products: 'product',
      PurchaseOrder: 'purchase order',
      'Purchase Orders': 'purchase order',
      SalesOrder: 'sales order',
      Orders: 'order',
      Customer: 'customer',
      Customers: 'customer',
      Supplier: 'supplier',
      Suppliers: 'supplier',
      CreditAccount: 'credit account',
      Credit: 'credit account',
      StockTransaction: 'stock transaction',
      Inventory: 'inventory',
      Delivery: 'delivery',
      Deliveries: 'delivery',
      Payment: 'payment',
      Payments: 'payment',
      Notification: 'notification',
      Notifications: 'notification',
      ProfileChangeRequest: 'profile change request',
      StaffPerformance: 'staff performance',
      ProductionBatch: 'production batch',
      Production: 'production',
      AuditLog: 'audit log',
      Report: 'report',
      RawMaterial: 'raw material',
      RawMaterialCategory: 'raw material category',
      ProductCategory: 'product category',
      Raw_Material: 'raw material',
      PRODUCT: 'product',
      RAW_MATERIAL: 'raw material',
    };

    let updatedCount = 0;

    for (const log of logs) {
      try {
        const actionLabel = actionLabels[log.action] || log.action;
        const entityLabel = entityLabels[log.entity] || log.entity || 'item';
        const idSuffix = log.entityId ? ` (#${log.entityId.slice(0, 8)})` : '';
        const userPrefix = log.userName && log.userName !== 'Unknown User' ? `${log.userName} ` : '';

        let description;
        if (log.action === 'LOGIN' || log.action === 'LOGOUT') {
          description = `${userPrefix}${actionLabel}`;
        } else if (log.action === 'CREATE' || log.action === 'DELETE' || log.action === 'ARCHIVE' || log.action === 'RESTORE') {
          description = `${userPrefix}${actionLabel} ${entityLabel}${idSuffix}`;
        } else if (log.action === 'UPDATE') {
          description = `${userPrefix}${actionLabel} ${entityLabel}${idSuffix}`;
        } else if (log.action === 'UPDATE_STATUS') {
          description = `${userPrefix}${actionLabel} ${entityLabel}${idSuffix}`;
        } else if (log.action === 'RECORD_PAYMENT') {
          description = `${userPrefix}${actionLabel} ${entityLabel}${idSuffix}`;
        } else if (log.action === 'STOCK_IN' || log.action === 'STOCK_OUT' || log.action === 'STOCK_ADJUST') {
          description = `${userPrefix}${actionLabel} ${entityLabel}${idSuffix}`;
        } else {
          description = `${userPrefix}${actionLabel} ${entityLabel}${idSuffix}`;
        }

        await prisma.auditLog.update({
          where: { id: log.id },
          data: { description },
        });
        updatedCount++;

        if (updatedCount % 10 === 0) {
          console.log(`   Updated ${updatedCount} logs...`);
        }
      } catch (err) {
        console.error(`❌ Error updating log ${log.id}:`, err.message);
      }
    }

    console.log(`✅ Updated ${updatedCount} audit logs with descriptions`);

  } catch (error) {
    console.error("❌ Error fixing audit logs:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAuditDescriptions();