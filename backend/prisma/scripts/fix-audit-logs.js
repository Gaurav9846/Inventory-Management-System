// prisma/scripts/fix-audit-logs.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixAuditLogs() {
  console.log("🔄 Fixing audit logs with missing user data...");

  try {
    // ✅ FIXED: Get ALL audit logs, then filter in JavaScript
    const logs = await prisma.auditLog.findMany({
      select: {
        id: true,
        userId: true,
        userName: true,
        userRole: true,
        module: true,
        entity: true,
        action: true,
      },
    });

    // Filter logs that need fixing
    const logsToFix = logs.filter(log => 
      log.userId && 
      (!log.userName || log.userName === "Unknown User" || 
       !log.userRole || log.userRole === "UNKNOWN" ||
       !log.module || log.module === "N/A")
    );

    console.log(`📊 Found ${logs.length} total logs, ${logsToFix.length} need fixing`);

    if (logsToFix.length === 0) {
      console.log("✅ No logs need fixing!");
      await prisma.$disconnect();
      return;
    }

    let updatedCount = 0;
    let errorCount = 0;

    for (const log of logsToFix) {
      try {
        if (log.userId) {
          const user = await prisma.user.findUnique({
            where: { id: log.userId },
            select: { name: true, role: true },
          });

          if (user) {
            // Determine module from entity if missing
            let module = log.module;
            if (!module || module === "N/A" || module === null) {
              const entityMap = {
                User: "Users",
                Product: "Products",
                PurchaseOrder: "Purchase Orders",
                SalesOrder: "Orders",
                Customer: "Customers",
                Supplier: "Suppliers",
                CreditAccount: "Credit",
                StockTransaction: "Inventory",
                Delivery: "Deliveries",
                Payment: "Payments",
                "ProfileChangeRequest": "Profile",
                Notification: "Notifications",
                StaffPerformance: "Staff Performance",
                ProductionBatch: "Production",
                AuditLog: "System",
              };
              module = entityMap[log.entity] || log.entity || "System";
            }

            await prisma.auditLog.update({
              where: { id: log.id },
              data: {
                userName: user.name,
                userRole: user.role,
                module: module,
              },
            });
            updatedCount++;
            
            if (updatedCount % 10 === 0) {
              console.log(`   Updated ${updatedCount} logs...`);
            }
          } else {
            // User not found - mark as deleted user
            await prisma.auditLog.update({
              where: { id: log.id },
              data: {
                userName: "Deleted User",
                userRole: "UNKNOWN",
                module: log.module || "System",
              },
            });
            updatedCount++;
          }
        }
      } catch (err) {
        console.error(`❌ Error updating log ${log.id}:`, err.message);
        errorCount++;
      }
    }

    console.log(`✅ Updated ${updatedCount} audit logs`);
    if (errorCount > 0) {
      console.log(`⚠️ Failed to update ${errorCount} logs`);
    }

  } catch (error) {
    console.error("❌ Error fixing audit logs:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAuditLogs();