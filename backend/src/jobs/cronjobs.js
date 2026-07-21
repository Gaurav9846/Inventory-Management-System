// src/jobs/cronjobs.js

import cron from "node-cron";
import prisma from "../config/prisma.js";
import { 
  checkAllProductsLowStock, 
  checkOutOfStockProducts, 
  checkRawMaterialsStock 
} from "../utils/lowStockAlert.js";
// ✅ Import from notification controller (it now exports this)
import { checkAndCreateCreditDueNotification } from "../controllers/notification.controller.js";
import { updateOverdueCreditAccounts } from "../controllers/credit.controller.js";

// ============================================================
// JOB 1: UPDATE OVERDUE CREDIT ACCOUNTS
// Runs every day at midnight (00:00)
// ============================================================
export const scheduleOverdueCreditUpdate = () => {
  cron.schedule('0 0 * * *', async () => {
    console.log('🔄 [CRON] Running overdue credit accounts update...');
    try {
      const count = await updateOverdueCreditAccounts();
      if (count > 0) {
        console.log(`✅ [CRON] Marked ${count} credit accounts as OVERDUE`);
      } else {
        console.log('✅ [CRON] No overdue credit accounts found');
      }
    } catch (error) {
      console.error('❌ [CRON] Failed to update overdue accounts:', error);
    }
  });
};

// ============================================================
// JOB 2: CHECK LOW STOCK AND OUT OF STOCK PRODUCTS
// Runs every day at 08:00 AM
// ============================================================
export const scheduleLowStockCheck = () => {
  cron.schedule('0 8 * * *', async () => {
    console.log('🔄 [CRON] Running low stock and out of stock check...');
    try {
      // Check all products (both low stock and out of stock)
      const count = await checkAllProductsLowStock();
      console.log(`✅ [CRON] Created ${count} low stock/out of stock notifications for products`);
      
      // Check raw materials
      const rawCount = await checkRawMaterialsStock();
      console.log(`✅ [CRON] Created ${rawCount} low stock/out of stock notifications for raw materials`);
    } catch (error) {
      console.error('❌ [CRON] Failed to check stock:', error);
    }
  });
};

// ============================================================
// JOB 3: CHECK OUT OF STOCK PRODUCTS (Additional)
// Runs every 6 hours at 02:00, 08:00, 14:00, 20:00
// ============================================================
export const scheduleOutOfStockCheck = () => {
  cron.schedule('0 2,8,14,20 * * *', async () => {
    console.log('🔄 [CRON] Running out of stock check...');
    try {
      const productCount = await checkOutOfStockProducts();
      const rawCount = await checkRawMaterialsStock();
      const totalCount = productCount + rawCount;
      
      if (totalCount > 0) {
        console.log(`✅ [CRON] Created ${totalCount} out of stock notifications (${productCount} products, ${rawCount} raw materials)`);
      }
    } catch (error) {
      console.error('❌ [CRON] Failed to check out of stock:', error);
    }
  });
};

// ============================================================
// JOB 4: CHECK CREDIT DUE NOTIFICATIONS
// Runs every day at 09:00 AM
// ============================================================
export const scheduleCreditDueCheck = () => {
  cron.schedule('0 9 * * *', async () => {
    console.log('🔄 [CRON] Running credit due check...');
    try {
      // ✅ Now imported from notification controller
      await checkAndCreateCreditDueNotification();
      console.log('✅ [CRON] Credit due check completed');
    } catch (error) {
      console.error('❌ [CRON] Failed to check credit due:', error);
    }
  });
};

// ============================================================
// JOB 5: GENERATE DAILY SALES REPORT
// Runs every day at 23:59
// ============================================================
export const scheduleDailyReport = () => {
  cron.schedule('59 23 * * *', async () => {
    console.log('🔄 [CRON] Generating daily sales report...');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const dailySales = await prisma.salesOrder.aggregate({
        where: {
          createdAt: { gte: today, lt: tomorrow },
          status: { in: ["DISPATCHED", "COMPLETED"] },
        },
        _sum: { totalAmount: true },
        _count: true,
      });
      
      const dailyCreditPayments = await prisma.creditPayment.aggregate({
        where: {
          status: "COMPLETED",
          createdAt: { gte: today, lt: tomorrow },
        },
        _sum: { amount: true },
        _count: true,
      });
      
      const paymentMethods = await prisma.payment.groupBy({
        by: ["method"],
        where: {
          createdAt: { gte: today, lt: tomorrow },
          status: "COMPLETED",
        },
        _sum: { amount: true },
        _count: true,
      });
      
      console.log(`📊 Daily Sales Report:`);
      console.log(`   Orders: ${dailySales._count}`);
      console.log(`   Revenue: ${dailySales._sum.totalAmount || 0}`);
      console.log(`   Credit Payments: ${dailyCreditPayments._count} (${dailyCreditPayments._sum.amount || 0})`);
      
      paymentMethods.forEach(pm => {
        console.log(`   ${pm.method}: ${pm._count} orders, ${pm._sum.amount || 0}`);
      });
      
      await prisma.savedReport.create({
        data: {
          name: `Daily Report - ${today.toISOString().split('T')[0]}`,
          type: "SALES",
          period: "DAILY",
          startDate: today,
          endDate: tomorrow,
          filters: { generatedBy: "auto" },
          generatedBy: "system",
          fileUrl: null,
        },
      });
      
    } catch (error) {
      console.error('❌ [CRON] Failed to generate daily report:', error);
    }
  });
};

// ============================================================
// JOB 6: CLEANUP OLD NOTIFICATIONS
// Runs every Sunday at 03:00 AM
// ============================================================
export const scheduleNotificationCleanup = () => {
  cron.schedule('0 3 * * 0', async () => {
    console.log('🔄 [CRON] Cleaning up old notifications...');
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const result = await prisma.notification.deleteMany({
        where: {
          isRead: true,
          createdAt: { lt: thirtyDaysAgo },
        },
      });
      
      console.log(`✅ [CRON] Deleted ${result.count} old notifications`);
      
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      const emailResult = await prisma.emailLog.deleteMany({
        where: {
          createdAt: { lt: sixtyDaysAgo },
        },
      });
      
      console.log(`✅ [CRON] Deleted ${emailResult.count} old email logs`);
      
    } catch (error) {
      console.error('❌ [CRON] Failed to clean up notifications:', error);
    }
  });
};

// ============================================================
// JOB 7: UPDATE STAFF PERFORMANCE SCORES (Monthly)
// Runs on the 1st of every month at 01:00 AM
// ============================================================
export const scheduleMonthlyStaffPerformanceUpdate = () => {
  cron.schedule('0 1 1 * *', async () => {
    console.log('🔄 [CRON] Updating staff performance scores for previous month...');
    try {
      const now = new Date();
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const monthStart = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1);
      const monthEnd = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0);
      
      const staffUsers = await prisma.user.findMany({
        where: { role: "STAFF", isActive: true },
        select: { id: true, name: true },
      });
      
      let updatedCount = 0;
      
      for (const staff of staffUsers) {
        const staffOrders = await prisma.salesOrder.findMany({
          where: {
            createdById: staff.id,
            createdAt: { gte: monthStart, lte: monthEnd },
          },
          include: {
            payment: true,
            delivery: true,
          },
        });
        
        const ordersProcessed = staffOrders.length;
        const revenueGenerated = staffOrders
          .filter(o => o.status === "COMPLETED")
          .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const deliveriesCompleted = staffOrders.filter(
          o => o.delivery?.status === "DELIVERED"
        ).length;
        
        const creditPayments = await prisma.creditPayment.findMany({
          where: {
            recordedById: staff.id,
            status: "COMPLETED",
            createdAt: { gte: monthStart, lte: monthEnd },
          },
        });
        
        const creditCollected = creditPayments.reduce(
          (sum, payment) => sum + payment.amount,
          0
        );
        
        const maxOrders = 20;
        const maxRevenue = 200000;
        const maxDeliveries = 15;
        const maxCredit = 20000;
        
        const orderScore = Math.min(30, (ordersProcessed / maxOrders) * 30);
        const revenueScore = Math.min(35, (revenueGenerated / maxRevenue) * 35);
        const deliveryScore = Math.min(20, (deliveriesCompleted / maxDeliveries) * 20);
        const creditScore = Math.min(15, (creditCollected / maxCredit) * 15);
        const performanceScore = Math.round(orderScore + revenueScore + deliveryScore + creditScore);
        
        await prisma.staffPerformance.upsert({
          where: {
            userId_month: {
              userId: staff.id,
              month: monthStart,
            },
          },
          update: {
            ordersProcessed,
            revenueGenerated,
            deliveriesCompleted,
            creditCollected,
            performanceScore: Math.min(100, performanceScore),
          },
          create: {
            userId: staff.id,
            month: monthStart,
            ordersProcessed,
            revenueGenerated,
            deliveriesCompleted,
            creditCollected,
            performanceScore: Math.min(100, performanceScore),
          },
        });
        updatedCount++;
      }
      
      console.log(`✅ [CRON] Updated performance scores for ${updatedCount} staff members`);
    } catch (error) {
      console.error('❌ [CRON] Failed to update staff performance:', error);
    }
  });
};

// ============================================================
// JOB 8: CLEANUP OLD AUDIT LOGS
// Runs on the 1st of every month at 04:00 AM
// ============================================================
export const scheduleAuditLogCleanup = () => {
  cron.schedule('0 4 1 * *', async () => {
    console.log('🔄 [CRON] Cleaning up old audit logs...');
    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      const result = await prisma.auditLog.deleteMany({
        where: {
          createdAt: { lt: threeMonthsAgo },
        },
      });
      
      console.log(`✅ [CRON] Deleted ${result.count} old audit logs`);
    } catch (error) {
      console.error('❌ [CRON] Failed to clean up audit logs:', error);
    }
  });
};

// ============================================================
// JOB 9: GENERATE MONTHLY FINANCIAL REPORT
// Runs on the 2nd of every month at 02:00 AM
// ============================================================
export const scheduleMonthlyFinancialReport = () => {
  cron.schedule('0 2 2 * *', async () => {
    console.log('🔄 [CRON] Generating monthly financial report...');
    try {
      const now = new Date();
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const monthStart = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1);
      const monthEnd = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0);
      const monthName = monthStart.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      const monthlyRevenue = await prisma.salesOrder.aggregate({
        where: {
          createdAt: { gte: monthStart, lte: monthEnd },
          status: { in: ["DISPATCHED", "COMPLETED"] },
        },
        _sum: { totalAmount: true },
        _count: true,
      });
      
      const monthlyCreditPayments = await prisma.creditPayment.aggregate({
        where: {
          status: "COMPLETED",
          createdAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
        _count: true,
      });
      
      const monthlyPurchaseOrders = await prisma.purchaseOrder.aggregate({
        where: {
          createdAt: { gte: monthStart, lte: monthEnd },
          status: "RECEIVED",
        },
        _sum: { totalAmount: true },
        _count: true,
      });
      
      const newCustomers = await prisma.customer.count({
        where: {
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      });
      
      console.log(`📊 Monthly Financial Report - ${monthName}:`);
      console.log(`   Revenue: ${monthlyRevenue._sum.totalAmount || 0} (${monthlyRevenue._count} orders)`);
      console.log(`   Credit Payments Collected: ${monthlyCreditPayments._sum.amount || 0} (${monthlyCreditPayments._count} payments)`);
      console.log(`   Purchase Orders: ${monthlyPurchaseOrders._sum.totalAmount || 0} (${monthlyPurchaseOrders._count} orders)`);
      console.log(`   New Customers: ${newCustomers}`);
      
      await prisma.savedReport.create({
        data: {
          name: `Monthly Financial Report - ${monthName}`,
          type: "FINANCIAL",
          period: "MONTHLY",
          startDate: monthStart,
          endDate: monthEnd,
          filters: { generatedBy: "auto", reportType: "financial" },
          generatedBy: "system",
          fileUrl: null,
        },
      });
      
    } catch (error) {
      console.error('❌ [CRON] Failed to generate monthly financial report:', error);
    }
  });
};

// ============================================================
// START ALL CRON JOBS
// ============================================================
export const startAllJobs = () => {
  console.log('⏰ Starting all scheduled cron jobs...');
  
  // Daily jobs
  scheduleOverdueCreditUpdate();      // 00:00 - Mark overdue credit accounts
  scheduleLowStockCheck();            // 08:00 - Check low stock products
  scheduleOutOfStockCheck();          // 02:00, 08:00, 14:00, 20:00 - Check out of stock
  scheduleCreditDueCheck();           // 09:00 - Check credit due notifications
  scheduleDailyReport();              // 23:59 - Generate daily sales report
  
  // Weekly jobs
  scheduleNotificationCleanup();      // Sunday 03:00 - Cleanup old notifications
  
  // Monthly jobs
  scheduleMonthlyStaffPerformanceUpdate(); // 1st 01:00 - Update staff performance
  scheduleAuditLogCleanup();          // 1st 04:00 - Cleanup old audit logs
  scheduleMonthlyFinancialReport();   // 2nd 02:00 - Generate monthly financial report
  
  console.log('✅ All cron jobs scheduled successfully');
  console.log('\n📋 Scheduled Jobs:');
  console.log('  📅 Daily:');
  console.log('    00:00 → Update overdue credit accounts');
  console.log('    02:00, 08:00, 14:00, 20:00 → Check out of stock products');
  console.log('    08:00 → Check low stock products');
  console.log('    09:00 → Check credit due notifications');
  console.log('    23:59 → Generate daily sales report');
  console.log('  📅 Weekly (Sunday):');
  console.log('    03:00 → Cleanup old notifications and email logs');
  console.log('  📅 Monthly:');
  console.log('    1st 01:00 → Update staff performance scores');
  console.log('    1st 04:00 → Cleanup old audit logs');
  console.log('    2nd 02:00 → Generate monthly financial report');
};

// ============================================================
// INDIVIDUAL EXPORTS FOR FLEXIBILITY
// ============================================================
export default {
  startAllJobs,
  scheduleOverdueCreditUpdate,
  scheduleLowStockCheck,
  scheduleOutOfStockCheck,
  scheduleCreditDueCheck,
  scheduleDailyReport,
  scheduleNotificationCleanup,
  scheduleMonthlyStaffPerformanceUpdate,
  scheduleAuditLogCleanup,
  scheduleMonthlyFinancialReport,
};