// src/controllers/analytics.controller.js
import prisma from "../config/prisma.js";

// GET /api/analytics/dashboard
export const getDashboardSummary = async (req, res) => {
  try {
    const [
      totalProducts,
      totalCategories,
      totalSuppliers,
      totalCustomers,
      lowStockRaw,
      pendingPOs,
      pendingDeliveries,
      unreadAlerts,
      recentTransactions,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.category.count(),
      prisma.supplier.count(),
      prisma.customer.count(),
      prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM "Product" WHERE "currentStock" <= "reorderLevel"`,
      prisma.purchaseOrder.count({ where: { status: "PENDING" } }),
      prisma.delivery.count({ where: { status: { in: ["PENDING", "IN_TRANSIT"] } } }),
      prisma.alert.count({ where: { isRead: false } }),
      prisma.stockTransaction.findMany({
        take:    10,
        orderBy: { createdAt: "desc" },
        include: {
          product: { select: { id: true, name: true, unit: true } },
          user:    { select: { name: true } },
        },
      }),
    ]);

    res.json({
      totalProducts,
      totalCategories,
      totalSuppliers,
      totalCustomers,
      lowStockCount:     lowStockRaw[0].count,
      pendingPOs,
      pendingDeliveries,
      unreadAlerts,
      recentTransactions,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/analytics/stock-movement?days=30
export const getStockMovement = async (req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - Number(req.query.days || 30));

    const transactions = await prisma.stockTransaction.findMany({
      where:   { createdAt: { gte: since } },
      select:  { type: true, quantity: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const grouped = {};
    for (const tx of transactions) {
      const date = tx.createdAt.toISOString().split("T")[0];
      if (!grouped[date]) grouped[date] = { date, IN: 0, OUT: 0, ADJUSTMENT: 0 };
      grouped[date][tx.type] += tx.quantity;
    }

    res.json(Object.values(grouped));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/analytics/top-products?limit=10&days=30
export const getTopProducts = async (req, res) => {
  try {
    const { limit = 10, days = 30 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - Number(days));

    const result = await prisma.stockTransaction.groupBy({
      by:      ["productId"],
      where:   { type: "OUT", createdAt: { gte: since } },
      _sum:    { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take:    Number(limit),
    });

    const productIds = result.map((r) => r.productId);
    const products   = await prisma.product.findMany({
      where:  { id: { in: productIds } },
      select: { id: true, name: true, unit: true, currentStock: true },
    });

    const data = result.map((r) => ({
      product:   products.find((p) => p.id === r.productId),
      totalSold: r._sum.quantity,
    }));

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/analytics/revenue?months=6
export const getRevenueSummary = async (req, res) => {
  try {
    const since = new Date();
    since.setMonth(since.getMonth() - Number(req.query.months || 6));

    const orders = await prisma.salesOrder.findMany({
      where:  { status: "COMPLETED", createdAt: { gte: since } },
      select: { totalAmount: true, createdAt: true },
    });

    const grouped = {};
    for (const o of orders) {
      const month = o.createdAt.toISOString().slice(0, 7); // YYYY-MM
      if (!grouped[month]) grouped[month] = { month, revenue: 0, orderCount: 0 };
      grouped[month].revenue    += o.totalAmount || 0;
      grouped[month].orderCount += 1;
    }

    res.json(Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/analytics/demand-forecast?productId=&period=7
export const getDemandForecast = async (req, res) => {
  try {
    const { productId, period = 7 } = req.query;
    if (!productId) return res.status(400).json({ message: "productId is required." });

    const since = new Date();
    since.setDate(since.getDate() - Number(period) * 4);

    const transactions = await prisma.stockTransaction.findMany({
      where:   { productId, type: "OUT", createdAt: { gte: since } },
      select:  { quantity: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    if (!transactions.length)
      return res.json({ productId, forecastedDemand: 0, message: "No historical data available." });

    const windows = {};
    for (const tx of transactions) {
      const key = Math.floor((tx.createdAt - since) / (Number(period) * 86_400_000));
      windows[key] = (windows[key] || 0) + tx.quantity;
    }

    const vals = Object.values(windows);
    const avg  = vals.reduce((s, v) => s + v, 0) / vals.length;

    const product = await prisma.product.findUnique({
      where:  { id: productId },
      select: { name: true, unit: true, currentStock: true, reorderLevel: true },
    });

    res.json({
      productId,
      product,
      periodDays:       Number(period),
      forecastedDemand: Math.round(avg),
      daysUntilStockOut: avg > 0
        ? Math.floor((product.currentStock / avg) * Number(period))
        : null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/analytics/audit-logs?entity=&userId=&page=1&limit=50
export const getAuditLogs = async (req, res) => {
  try {
    const { entity, userId, page = 1, limit = 50 } = req.query;
    const skip  = (Number(page) - 1) * Number(limit);
    const where = {
      ...(entity && { entity }),
      ...(userId && { userId }),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "desc" },
        take:    Number(limit),
        skip,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ data: logs, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
