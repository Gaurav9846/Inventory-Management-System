// src/controllers/staffPerformance.controller.js
import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";

// ==================== GET STAFF LEADERBOARD ====================
// GET /api/staff-performance/leaderboard
export const getLeaderboard = async (req, res) => {
  try {
    const { month, year, limit = 10 } = req.query;
    
    let startDate, endDate;
    
    if (month && year) {
      startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      endDate = new Date(parseInt(year), parseInt(month), 0);
    } else {
      // Default to current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    
    // Get all staff users
    const staffUsers = await prisma.user.findMany({
      where: { role: "STAFF", isActive: true },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    
    // Calculate performance for each staff member
    const performanceData = await Promise.all(
      staffUsers.map(async (staff) => {
        // Get orders created by this staff member
        const orders = await prisma.salesOrder.findMany({
          where: {
            createdById: staff.id,
            createdAt: { gte: startDate, lte: endDate },
          },
          include: {
            payment: true,
            delivery: true,
          },
        });
        
        const ordersProcessed = orders.length;
        
        // Revenue generated from completed orders
        const revenueGenerated = orders
          .filter(o => o.status === "COMPLETED")
          .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        
        // Deliveries completed
        const deliveriesCompleted = orders.filter(o => o.delivery?.status === "DELIVERED").length;
        
        // Credit collections
        const creditPayments = await prisma.creditPayment.findMany({
          where: {
            recordedById: staff.id,
            createdAt: { gte: startDate, lte: endDate },
            status: "COMPLETED",
          },
        });
        
        const creditCollected = creditPayments.reduce((sum, p) => sum + p.amount, 0);
        
        // Get order counts by status
        const ordersByStatus = {
          PENDING: orders.filter(o => o.status === "PENDING").length,
          PROCESSING: orders.filter(o => o.status === "PROCESSING").length,
          DISPATCHED: orders.filter(o => o.status === "DISPATCHED").length,
          COMPLETED: orders.filter(o => o.status === "COMPLETED").length,
          CANCELLED: orders.filter(o => o.status === "CANCELLED").length,
        };
        
        // Get daily activity
        const dailyActivity = {};
        orders.forEach(order => {
          const date = order.createdAt.toISOString().split('T')[0];
          if (!dailyActivity[date]) {
            dailyActivity[date] = { date, orders: 0, revenue: 0 };
          }
          dailyActivity[date].orders++;
          if (order.status === "COMPLETED") {
            dailyActivity[date].revenue += order.totalAmount || 0;
          }
        });
        
        return {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          ordersProcessed,
          revenueGenerated,
          deliveriesCompleted,
          creditCollected,
          ordersByStatus,
          dailyActivity: Object.values(dailyActivity).slice(-14),
          joinedDate: staff.createdAt,
        };
      })
    );
    
    // Calculate performance scores
    const maxOrders = Math.max(...performanceData.map(p => p.ordersProcessed), 1);
    const maxRevenue = Math.max(...performanceData.map(p => p.revenueGenerated), 1);
    const maxDeliveries = Math.max(...performanceData.map(p => p.deliveriesCompleted), 1);
    const maxCredit = Math.max(...performanceData.map(p => p.creditCollected), 1);
    
    const performanceWithScores = performanceData.map(staff => {
      const orderScore = (staff.ordersProcessed / maxOrders) * 30;
      const revenueScore = (staff.revenueGenerated / maxRevenue) * 40;
      const deliveryScore = (staff.deliveriesCompleted / maxDeliveries) * 20;
      const creditScore = (staff.creditCollected / maxCredit) * 10;
      
      const performanceScore = Math.min(100, Math.round(orderScore + revenueScore + deliveryScore + creditScore));
      
      return {
        ...staff,
        performanceScore,
      };
    });
    
    // Sort by performance score
    const sorted = performanceWithScores.sort((a, b) => b.performanceScore - a.performanceScore);
    
    // Add ranks
    const leaderboard = sorted.slice(0, Number(limit)).map((item, index) => ({
      rank: index + 1,
      ...item,
    }));
    
    // Calculate totals
    const totals = {
      ordersProcessed: performanceData.reduce((sum, p) => sum + p.ordersProcessed, 0),
      revenueGenerated: performanceData.reduce((sum, p) => sum + p.revenueGenerated, 0),
      deliveriesCompleted: performanceData.reduce((sum, p) => sum + p.deliveriesCompleted, 0),
      creditCollected: performanceData.reduce((sum, p) => sum + p.creditCollected, 0),
      activeStaff: staffUsers.length,
    };
    
    // Update or create staff performance records in database
    for (const staff of performanceData) {
      const existingRecord = await prisma.staffPerformance.findUnique({
        where: {
          userId_month: {
            userId: staff.id,
            month: new Date(startDate.getFullYear(), startDate.getMonth(), 1),
          },
        },
      });
      
      const performanceScore = performanceWithScores.find(p => p.id === staff.id)?.performanceScore || 0;
      
      if (existingRecord) {
        await prisma.staffPerformance.update({
          where: { id: existingRecord.id },
          data: {
            ordersProcessed: staff.ordersProcessed,
            revenueGenerated: staff.revenueGenerated,
            deliveriesCompleted: staff.deliveriesCompleted,
            creditCollected: staff.creditCollected,
            performanceScore,
          },
        });
      } else {
        await prisma.staffPerformance.create({
          data: {
            userId: staff.id,
            month: new Date(startDate.getFullYear(), startDate.getMonth(), 1),
            ordersProcessed: staff.ordersProcessed,
            revenueGenerated: staff.revenueGenerated,
            deliveriesCompleted: staff.deliveriesCompleted,
            creditCollected: staff.creditCollected,
            performanceScore,
          },
        });
      }
    }
    
    res.json({
      success: true,
      leaderboard,
      totals,
      period: {
        month: startDate.toLocaleString('default', { month: 'long' }),
        year: startDate.getFullYear(),
        startDate,
        endDate,
      },
    });
  } catch (err) {
    console.error("Error in getLeaderboard:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== GET STAFF PERFORMANCE DETAILS ====================
// GET /api/staff-performance/:staffId
export const getStaffPerformanceDetails = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { month, year } = req.query;
    
    let startDate, endDate;
    
    if (month && year) {
      startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      endDate = new Date(parseInt(year), parseInt(month), 0);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    
    // Get staff member
    const staff = await prisma.user.findUnique({
      where: { id: staffId, role: "STAFF" },
      select: { id: true, name: true, email: true, createdAt: true, isActive: true },
    });
    
    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff member not found" });
    }
    
    // Get all orders by this staff member
    const orders = await prisma.salesOrder.findMany({
      where: {
        createdById: staffId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
        payment: true,
        delivery: true,
      },
      orderBy: { createdAt: "desc" },
    });
    
    // Get credit payments recorded
    const creditPayments = await prisma.creditPayment.findMany({
      where: {
        recordedById: staffId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        creditAccount: {
          include: { customer: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    
    // Get stock transactions by this staff member
    const stockTransactions = await prisma.stockTransaction.findMany({
      where: {
        userId: staffId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: { product: { select: { id: true, name: true, unit: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    
    // Calculate monthly trend
    const monthlyTrend = {};
    orders.forEach(order => {
      const monthKey = order.createdAt.toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!monthlyTrend[monthKey]) {
        monthlyTrend[monthKey] = { month: monthKey, revenue: 0, orders: 0 };
      }
      monthlyTrend[monthKey].orders++;
      if (order.status === "COMPLETED") {
        monthlyTrend[monthKey].revenue += order.totalAmount || 0;
      }
    });
    
    // Calculate daily trend for the month
    const dailyTrend = {};
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dailyTrend[dateStr] = { date: dateStr, orders: 0, revenue: 0 };
    }
    
    orders.forEach(order => {
      const dateStr = order.createdAt.toISOString().split('T')[0];
      if (dailyTrend[dateStr]) {
        dailyTrend[dateStr].orders++;
        if (order.status === "COMPLETED") {
          dailyTrend[dateStr].revenue += order.totalAmount || 0;
        }
      }
    });
    
    // Calculate statistics
    const totalRevenue = orders.filter(o => o.status === "COMPLETED").reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
    const completionRate = orders.length > 0 
      ? (orders.filter(o => o.status === "COMPLETED").length / orders.length) * 100 
      : 0;
    
    // Get top products sold
    const productSales = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        const productName = item.product?.name;
        if (productName) {
          if (!productSales[productName]) {
            productSales[productName] = { name: productName, quantity: 0, revenue: 0 };
          }
          productSales[productName].quantity += item.quantity;
          productSales[productName].revenue += item.totalPrice || 0;
        }
      });
    });
    
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
    
    res.json({
      success: true,
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        joinedDate: staff.createdAt,
        isActive: staff.isActive,
      },
      summary: {
        totalOrders: orders.length,
        totalRevenue,
        avgOrderValue,
        completionRate: Math.round(completionRate),
        deliveriesCompleted: orders.filter(o => o.delivery?.status === "DELIVERED").length,
        creditCollected: creditPayments.reduce((sum, p) => sum + p.amount, 0),
        pendingOrders: orders.filter(o => o.status === "PENDING").length,
        cancelledOrders: orders.filter(o => o.status === "CANCELLED").length,
      },
      orders: orders.slice(0, 20),
      creditPayments: creditPayments.slice(0, 10),
      stockTransactions,
      monthlyTrend: Object.values(monthlyTrend),
      dailyTrend: Object.values(dailyTrend),
      topProducts,
    });
  } catch (err) {
    console.error("Error in getStaffPerformanceDetails:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== GET PERFORMANCE STATS ====================
// GET /api/staff-performance/stats
export const getPerformanceStats = async (req, res) => {
  try {
    const { period = "month" } = req.query;
    
    let startDate;
    const now = new Date();
    
    switch (period) {
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "quarter":
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    // Get all staff
    const staffUsers = await prisma.user.findMany({
      where: { role: "STAFF", isActive: true },
      select: { id: true, name: true },
    });
    
    // Get performance data
    const staffStats = await Promise.all(staffUsers.map(async (staff) => {
      const orders = await prisma.salesOrder.count({
        where: {
          createdById: staff.id,
          createdAt: { gte: startDate },
        },
      });
      
      const revenue = await prisma.salesOrder.aggregate({
        where: {
          createdById: staff.id,
          status: "COMPLETED",
          createdAt: { gte: startDate },
        },
        _sum: { totalAmount: true },
      });
      
      const deliveries = await prisma.delivery.count({
        where: {
          salesOrder: { createdById: staff.id },
          status: "DELIVERED",
          deliveredAt: { gte: startDate },
        },
      });
      
      return {
        id: staff.id,
        name: staff.name,
        orders,
        revenue: revenue._sum.totalAmount || 0,
        deliveries,
      };
    }));
    
    const topPerformers = [...staffStats].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const mostActive = [...staffStats].sort((a, b) => b.orders - a.orders).slice(0, 5);
    
    const totalOrders = staffStats.reduce((sum, s) => sum + s.orders, 0);
    const totalRevenue = staffStats.reduce((sum, s) => sum + s.revenue, 0);
    const totalDeliveries = staffStats.reduce((sum, s) => sum + s.deliveries, 0);
    
    res.json({
      success: true,
      stats: {
        totalStaff: staffUsers.length,
        totalOrders,
        totalRevenue,
        totalDeliveries,
        avgOrdersPerStaff: staffUsers.length ? Math.round(totalOrders / staffUsers.length) : 0,
        avgRevenuePerStaff: staffUsers.length ? totalRevenue / staffUsers.length : 0,
      },
      topPerformers,
      mostActive,
      period,
    });
  } catch (err) {
    console.error("Error in getPerformanceStats:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== UPDATE PERFORMANCE SCORE (Admin/Manager) ====================
// PATCH /api/staff-performance/:staffId/score
export const updatePerformanceScore = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { score, month, year, notes } = req.body;
    
    if (!score || score < 0 || score > 100) {
      return res.status(400).json({ success: false, message: "Valid score (0-100) is required" });
    }
    
    let targetMonth;
    if (month && year) {
      targetMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
    } else {
      targetMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    }
    
    const performance = await prisma.staffPerformance.upsert({
      where: {
        userId_month: {
          userId: staffId,
          month: targetMonth,
        },
      },
      update: {
        performanceScore: score,
        updatedAt: new Date(),
      },
      create: {
        userId: staffId,
        month: targetMonth,
        performanceScore: score,
        ordersProcessed: 0,
        revenueGenerated: 0,
        deliveriesCompleted: 0,
        creditCollected: 0,
      },
    });
    
    await logAction(req.user.id, "UPDATE_PERFORMANCE_SCORE", "StaffPerformance", performance.id, {
      staffId,
      score,
      month: targetMonth,
      notes,
    });
    
    res.json({
      success: true,
      message: "Performance score updated successfully",
      data: performance,
    });
  } catch (err) {
    console.error("Error in updatePerformanceScore:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};