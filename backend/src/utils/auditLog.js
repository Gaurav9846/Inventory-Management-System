// src/utils/auditLog.js
import prisma from "../config/prisma.js";

/**
 * Write an audit log entry (non-fatal).
 * Enhanced version with new fields
 */
export const logAction = async ({
  userId,
  action,
  entity,
  entityId = null,
  details = null,
  module = null,
  description = null,
  oldValues = null,
  newValues = null,
  req = null,
  userName = null,
  userRole = null,
}) => {
  try {
    // Get user info if not provided
    let userInfo = { name: userName, role: userRole };
    
    if (!userName || !userRole) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, role: true },
        });
        if (user) {
          userInfo.name = userInfo.name || user.name;
          userInfo.role = userInfo.role || user.role;
        }
      } catch (error) {
        console.error("Failed to fetch user info for audit log:", error);
      }
    }

    // Get IP address
    let ipAddress = null;
    if (req) {
      ipAddress = req.ip || 
                  req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                  req.socket?.remoteAddress ||
                  null;
    }

    // Get User-Agent
    let userAgent = null;
    if (req) {
      userAgent = req.headers['user-agent'] || null;
    }

    // If no module provided, derive from entity
    const derivedModule = module || entity || "System";

    // ✅ ENHANCED: Generate meaningful description if not provided
    let finalDescription = description;
    if (!finalDescription) {
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
      };

      const actionLabel = actionLabels[action] || action;
      const entityLabel = entityLabels[entity] || entity || 'item';
      const idSuffix = entityId ? ` (#${entityId.slice(0, 8)})` : '';

      if (action === 'LOGIN' || action === 'LOGOUT') {
        finalDescription = `User ${userInfo.name || 'Unknown'} ${actionLabel}`;
      } else if (action === 'CREATE' || action === 'DELETE' || action === 'ARCHIVE' || action === 'RESTORE') {
        finalDescription = `${actionLabel} ${entityLabel}${idSuffix}`;
      } else if (action === 'UPDATE') {
        finalDescription = `${actionLabel} ${entityLabel}${idSuffix}`;
      } else if (action === 'UPDATE_STATUS') {
        finalDescription = `${actionLabel} ${entityLabel}${idSuffix}`;
      } else if (action === 'RECORD_PAYMENT') {
        finalDescription = `${actionLabel} ${entityLabel}${idSuffix}`;
      } else if (action === 'STOCK_IN' || action === 'STOCK_OUT' || action === 'STOCK_ADJUST') {
        finalDescription = `${actionLabel} ${entityLabel}${idSuffix}`;
      } else {
        finalDescription = `${actionLabel} ${entityLabel}${idSuffix}`;
      }
    }

    await prisma.auditLog.create({
      data: {
        userId,
        userName: userInfo.name || "Unknown User",
        userRole: userInfo.role || "UNKNOWN",
        action,
        entity,
        entityId,
        module: derivedModule,
        description: finalDescription,
        oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : null,
        newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : null,
        details: details ? JSON.parse(JSON.stringify(details)) : null,
        ipAddress,
        userAgent,
      },
    });
  } catch (err) {
    console.error("AuditLog error:", err.message);
    // Don't throw - audit logging should not break the main flow
  }
};