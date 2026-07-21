// src/controllers/salesOrder.controller.js

import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";
import { generateSalesOrderNumber } from "../utils/counter.js";
import { createSalesInvoiceFromOrder } from "./invoice.controller.js";

// ============================================================
// GET /api/sales-orders/dashboard-stats
// ============================================================
export const getDashboardStats = async (req, res) => {
  try {
    const { timeFrame = "monthly" } = req.query;
    
    console.log(`\n📊 ========================================`);
    console.log(`📊 DASHBOARD API CALLED WITH TIMEFRAME: ${timeFrame.toUpperCase()}`);
    console.log(`📊 ========================================\n`);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const currentUserId = req.user.id;
    const isStaff = req.user.role === "STAFF";

    // ============================================================
    // 1. TODAY'S STATS
    // ============================================================
    const todayOrders = await prisma.salesOrder.count({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        ...(isStaff && { createdById: currentUserId }),
      },
    });

    const todayRevenueResult = await prisma.payment.aggregate({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        status: "COMPLETED",
        ...(isStaff && { salesOrder: { createdById: currentUserId } }),
      },
      _sum: { amount: true },
    });
    const todayRevenue = todayRevenueResult._sum.amount || 0;

    // ============================================================
    // 2. TOTAL REVENUE (From COMPLETED payments only)
    // ============================================================
    const totalRevenueResult = await prisma.payment.aggregate({
      where: {
        status: "COMPLETED",
        ...(isStaff && { salesOrder: { createdById: currentUserId } }),
      },
      _sum: { amount: true },
    });
    const totalRevenue = totalRevenueResult._sum.amount || 0;

    // ============================================================
    // 3. TOTAL ORDERS
    // ============================================================
    const totalOrders = await prisma.salesOrder.count({
      where: isStaff ? { createdById: currentUserId } : {},
    });

    // ============================================================
    // 4. PAYMENT BREAKDOWN (ALL-TIME from COMPLETED payments)
    // ============================================================
    const paymentBreakdown = await prisma.payment.groupBy({
      by: ["method"],
      where: {
        status: "COMPLETED",
        ...(isStaff && { salesOrder: { createdById: currentUserId } }),
      },
      _sum: { amount: true },
    });

    const paymentMap = { CASH: 0, ONLINE: 0, CREDIT: 0, PAY_LATER: 0 };
    paymentBreakdown.forEach((p) => {
      const method = p.method?.toUpperCase();
      if (paymentMap[method] !== undefined) {
        paymentMap[method] = p._sum.amount || 0;
      }
    });

    // ============================================================
    // 5. CREDIT SALES OUTSTANDING
    // ============================================================
    const creditSalesResult = await prisma.creditAccount.aggregate({
      _sum: { remainingBalance: true },
    });
    const creditSales = creditSalesResult._sum.remainingBalance || 0;

    // ============================================================
    // 6. PENDING DELIVERIES
    // ============================================================
    const pendingDeliveries = await prisma.delivery.count({
      where: { 
        status: { in: ["PENDING", "IN_TRANSIT"] },
      },
    });

    // ============================================================
    // 7. LOW STOCK & OUT OF STOCK
    // ============================================================
    const lowStockProducts = await prisma.product.count({
      where: {
        currentStock: { lte: prisma.product.fields.reorderLevel },
        isArchived: false,
      },
    });

    const lowStockRawMaterials = await prisma.rawMaterial.count({
      where: {
        currentStock: { lte: prisma.rawMaterial.fields.reorderLevel },
        isArchived: false,
      },
    });

    const totalLowStock = lowStockProducts + lowStockRawMaterials;

    console.log(`📊 LOW STOCK BREAKDOWN:`);
    console.log(`   - Products below reorder: ${lowStockProducts}`);
    console.log(`   - Raw Materials below reorder: ${lowStockRawMaterials}`);
    console.log(`   - TOTAL LOW STOCK: ${totalLowStock}`);

    // ============================================================
    // 8. INVENTORY VALUE
    // ============================================================
    const products = await prisma.product.findMany({
      where: { isArchived: false },
      select: { currentStock: true, costPrice: true },
    });
    
    const inventoryValue = products.reduce(
      (sum, p) => sum + (p.currentStock || 0) * (p.costPrice || 0),
      0
    );

    // ============================================================
    // 9. PENDING APPROVALS (Purchase Orders)
    // ============================================================
    const pendingApprovals = await prisma.purchaseOrder.count({
      where: { status: "PENDING" },
    });

    // ============================================================
    // 10. ACTIVE CUSTOMERS (Last 30 days)
    // ============================================================
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const activeCustomers = await prisma.customer.count({
      where: {
        salesOrders: {
          some: {
            createdAt: { gte: thirtyDaysAgo },
            status: { not: "CANCELLED" },
            ...(isStaff && { createdById: currentUserId }),
          },
        },
      },
    });

    const totalCustomers = await prisma.customer.count();

    // ============================================================
    // 11. TOTAL PRODUCTS, SUPPLIERS, STAFF
    // ============================================================
    const totalProducts = await prisma.product.count({ 
      where: { isArchived: false } 
    });
    
    const totalSuppliers = await prisma.supplier.count();
    
    const totalStaff = await prisma.user.count({ 
      where: { 
        role: { in: ["STAFF", "MANAGER"] },
        isActive: true 
      } 
    });

    // ============================================================
    // 12. UNREAD ALERTS
    // ============================================================
    const unreadAlerts = await prisma.notification.count({
      where: { isRead: false },
    });

    // ============================================================
    // 13. TREND DATA
    // ============================================================
    console.log(`\n📈 GENERATING ${timeFrame.toUpperCase()} TREND DATA...\n`);
    
    let trendData = [];

    if (timeFrame === "daily") {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - (6 - i));
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const orders = await prisma.salesOrder.count({
          where: {
            createdAt: { gte: date, lt: nextDate },
            ...(isStaff && { createdById: currentUserId }),
          },
        });
        
        const revenueResult = await prisma.payment.aggregate({
          where: {
            createdAt: { gte: date, lt: nextDate },
            status: "COMPLETED",
            ...(isStaff && { salesOrder: { createdById: currentUserId } }),
          },
          _sum: { amount: true },
        });
        
        const revenueAmount = revenueResult._sum.amount || 0;
        
        trendData.push({
          month: days[date.getDay()],
          revenue: revenueAmount,
          orders: orders,
          profit: Math.round(revenueAmount * 0.25),
        });
      }
      
    } else if (timeFrame === "weekly") {
      for (let i = 0; i < 4; i++) {
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - ((3 - i) * 7));
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        
        const orders = await prisma.salesOrder.count({
          where: {
            createdAt: { gte: startDate, lte: endDate },
            ...(isStaff && { createdById: currentUserId }),
          },
        });
        
        const revenueResult = await prisma.payment.aggregate({
          where: {
            createdAt: { gte: startDate, lte: endDate },
            status: "COMPLETED",
            ...(isStaff && { salesOrder: { createdById: currentUserId } }),
          },
          _sum: { amount: true },
        });
        
        const revenueAmount = revenueResult._sum.amount || 0;
        
        const weekStart = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const weekEnd = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        trendData.push({
          month: `Week ${i + 1}`,
          weekRange: `${weekStart} - ${weekEnd}`,
          revenue: revenueAmount,
          orders: orders,
          profit: Math.round(revenueAmount * 0.25),
        });
      }
      
    } else {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = today.getMonth();
      
      for (let i = 0; i < 12; i++) {
        const monthIndex = (currentMonth - 11 + i + 12) % 12;
        const year = today.getFullYear() - (monthIndex > currentMonth ? 1 : 0);
        
        const startDate = new Date(year, monthIndex, 1);
        const endDate = new Date(year, monthIndex + 1, 0);
        
        const orders = await prisma.salesOrder.count({
          where: {
            createdAt: { gte: startDate, lte: endDate },
            ...(isStaff && { createdById: currentUserId }),
          },
        });
        
        const revenueResult = await prisma.payment.aggregate({
          where: {
            createdAt: { gte: startDate, lte: endDate },
            status: "COMPLETED",
            ...(isStaff && { salesOrder: { createdById: currentUserId } }),
          },
          _sum: { amount: true },
        });
        
        const revenueAmount = revenueResult._sum.amount || 0;
        
        trendData.push({
          month: months[monthIndex],
          revenue: revenueAmount,
          orders: orders,
          profit: Math.round(revenueAmount * 0.25),
        });
      }
    }

    // ============================================================
    // 14. RECENT ORDERS
    // ============================================================
    const recentOrders = await prisma.salesOrder.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      where: isStaff ? { createdById: currentUserId } : {},
      include: {
        customer: { select: { name: true } },
        items: {
          take: 1,
          include: { product: { select: { name: true } } },
        },
        payment: { select: { method: true, status: true, amount: true } },
      },
    });

    const formattedOrders = recentOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customer: order.customer?.name || "Unknown",
      product: order.items[0]?.product?.name || "N/A",
      qty: order.items.reduce((sum, item) => sum + item.quantity, 0),
      amount: order.totalAmount || 0,
      payment: order.payment?.method || "N/A",
      paymentStatus: order.payment?.status || "N/A",
      status: order.status,
      createdAt: order.createdAt,
    }));

    // ============================================================
    // 15. CALCULATE GROWTH PERCENTAGES
    // ============================================================
    const lastMonth = trendData[trendData.length - 1];
    const prevMonth = trendData[trendData.length - 2];
    
    const revenueGrowth = prevMonth?.revenue 
      ? ((lastMonth?.revenue - prevMonth?.revenue) / prevMonth?.revenue) * 100 
      : 0;
    
    const ordersGrowth = prevMonth?.orders 
      ? ((lastMonth?.orders - prevMonth?.orders) / prevMonth?.orders) * 100 
      : 0;

    // ============================================================
    // 16. FINAL RESPONSE
    // ============================================================
    console.log(`\n✅ ${timeFrame.toUpperCase()} RESPONSE SUMMARY:`);
    console.log(`- Total Revenue: ${totalRevenue}`);
    console.log(`- Total Orders: ${totalOrders}`);
    console.log(`- Active Customers: ${activeCustomers}`);
    console.log(`- Low Stock (Products): ${lowStockProducts}`);
    console.log(`- Low Stock (Raw Materials): ${lowStockRawMaterials}`);
    console.log(`- TOTAL LOW STOCK: ${totalLowStock}`);
    console.log(`- Trend Data Points: ${trendData.length}`);
    console.log(`\n📤 SENDING RESPONSE WITH ${trendData.length} ${timeFrame.toUpperCase()} DATA POINTS...\n`);

    res.json({
      success: true,
      data: {
        totalRevenue: totalRevenue,
        todayRevenue: todayRevenue,
        netProfit: totalRevenue * 0.25,
        totalOrders: totalOrders,
        activeCustomers: activeCustomers,
        lowStockProducts: totalLowStock,
        lowStockProductCount: lowStockProducts,
        lowStockRawMaterialCount: lowStockRawMaterials,
        inventoryValue: inventoryValue,
        pendingApprovals: pendingApprovals,
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        monthlyGrowth: prevMonth?.revenue 
          ? Math.round(((lastMonth?.revenue - prevMonth?.revenue) / prevMonth?.revenue) * 100) 
          : 0,
        profitGrowth: 11,
        ordersGrowth: Math.round(ordersGrowth * 10) / 10,
        customersGrowth: 4.1,
        totalProducts: totalProducts,
        totalSuppliers: totalSuppliers,
        totalStaff: totalStaff,
        pendingDeliveries: pendingDeliveries,
        creditSales: creditSales,
        unreadAlerts: unreadAlerts,
        monthlyTrend: trendData,
        paymentBreakdown: paymentMap,
        recentOrders: formattedOrders,
      },
    });

  } catch (err) {
    console.error("❌ Error in getDashboardStats:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// ============================================================
// GET /api/sales-orders/recent
// ============================================================
export const getRecentOrders = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const currentUserId = req.user.id;
    const isStaff = req.user.role === "STAFF";

    const orders = await prisma.salesOrder.findMany({
      take: Number(limit),
      orderBy: { createdAt: "desc" },
      where: isStaff ? { createdById: currentUserId } : undefined,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        items: {
          take: 2,
          include: { product: { select: { id: true, name: true } } },
        },
        payment: true,
        delivery: true,
      },
    });

    const formattedOrders = orders.map((order) => ({
      orderId: order.orderNumber,
      customer: order.customer.name,
      phone: order.customer.phone,
      product: order.items[0]?.product.name || "N/A",
      qty: order.items.reduce((sum, item) => sum + item.quantity, 0),
      amount: order.totalAmount,
      payment: order.payment?.method || "N/A",
      paymentPlatform: order.payment?.platform || null,
      status: order.status,
      deliveryStatus: order.delivery?.status || "PENDING",
      date: order.createdAt,
    }));

    res.json(formattedOrders);
  } catch (err) {
    console.error("Error in getRecentOrders:", err);
    res.status(500).json({ message: err.message });
  }
};

// ============================================================
// GET /api/sales-orders
// ============================================================
export const getAllSalesOrders = async (req, res) => {
  try {
    const { 
      status, 
      customerId, 
      search, 
      page = 1, 
      limit = 20,
      paymentMethod,
    } = req.query;
    
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    let where = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (paymentMethod && paymentMethod !== 'all') {
      where.payment = {
        method: paymentMethod,
      };
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { customer: { phone: { contains: search, mode: "insensitive" } } },
      ];
    }

    console.log(`📊 Fetching orders with filters:`, JSON.stringify(where, null, 2));
    console.log(`📊 Page: ${page}, Limit: ${limit}, Skip: ${skip}`);

    const [orders, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        include: {
          customer: { 
            select: { 
              id: true, 
              name: true, 
              phone: true, 
              address: true,
              deliveryAddress: true,
            } 
          },
          createdBy: { 
            select: { 
              id: true, 
              name: true,
              email: true,
            } 
          },
          items: {
            include: {
              product: { 
                select: { 
                  id: true, 
                  name: true, 
                  unit: true, 
                  sellingPrice: true,
                  currentStock: true,
                } 
              },
            },
          },
          delivery: { 
            select: { 
              id: true,
              status: true, 
              deliveryDate: true, 
              deliveredAt: true,
              notes: true,
            } 
          },
          payment: { 
            select: { 
              id: true,
              status: true, 
              method: true, 
              platform: true, 
              platformTransactionId: true, 
              amount: true,
              verifiedAt: true,
            } 
          },
          salesInvoice: {
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
              totalAmount: true,
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: take,
        skip: skip,
      }),
      prisma.salesOrder.count({ where }),
    ]);

    console.log(`📊 Found ${orders.length} orders out of ${total} total`);
    if (orders.length > 0) {
      const oldest = orders[orders.length - 1];
      const newest = orders[0];
      console.log(`📊 Date range: ${oldest?.createdAt?.toISOString?.() || 'N/A'} to ${newest?.createdAt?.toISOString?.() || 'N/A'}`);
    }

    const paymentMethodStats = await prisma.payment.groupBy({
      by: ["method"],
      where: {
        salesOrder: {
          ...where,
        },
        status: "COMPLETED",
      },
      _sum: { amount: true },
      _count: true,
    });

    res.json({
      success: true,
      data: orders,
      total: total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
      paymentMethodStats: paymentMethodStats.map(p => ({
        method: p.method,
        totalAmount: p._sum.amount || 0,
        count: p._count,
      })),
    });

  } catch (err) {
    console.error("❌ Error in getAllSalesOrders:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// ============================================================
// GET /api/sales-orders/staff
// ============================================================
export const getStaffOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = { 
      status: { in: ["PENDING", "PROCESSING"] },
      createdById: req.user.id,
    };

    const [orders, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true, address: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, unit: true, sellingPrice: true } },
            },
          },
          delivery: { select: { id: true, status: true } },
          payment: { select: { method: true, platform: true, status: true } },
          salesInvoice: {
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: Number(limit),
        skip,
      }),
      prisma.salesOrder.count({ where }),
    ]);

    res.json({ 
      data: orders, 
      total, 
      page: Number(page), 
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    console.error("Error in getStaffOrders:", err);
    res.status(500).json({ message: err.message });
  }
};

// ============================================================
// GET /api/sales-orders/:id
// ============================================================
export const getSalesOrderById = async (req, res) => {
  try {
    const order = await prisma.salesOrder.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true } },
        items: { 
          include: { 
            product: { 
              select: { 
                id: true, 
                name: true, 
                unit: true, 
                sellingPrice: true,
                currentStock: true,
              } 
            } 
          } 
        },
        delivery: true,
        payment: true,
        salesInvoice: {
          include: {
            items: {
              include: {
                product: true,
              }
            }
          }
        }
      },
    });
    if (!order) return res.status(404).json({ message: "Sales order not found." });
    res.json(order);
  } catch (err) {
    console.error("Error in getSalesOrderById:", err);
    res.status(500).json({ message: err.message });
  }
};

// ============================================================
// POST /api/sales-orders - CREATE WITH AUTO-INCREMENT & INVOICE
// ============================================================
export const createSalesOrder = async (req, res) => {
  try {
    const {
      customerId,
      customerName,
      phoneNumber,
      address,
      deliveryAddress,
      customerType,
      notes,
      items,
      paymentType,
      paymentPlatform,
      platformTransactionId,
      deliveryRequired,
      paymentDetails,
      creditDueDate,
      createInvoice = true,
    } = req.body;

    if ((!customerId && !customerName) || !items?.length) {
      return res.status(400).json({ message: "Customer and at least one item are required." });
    }

    // FIND OR CREATE CUSTOMER
    let customer;

    if (customerId) {
      customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) {
        return res.status(404).json({ message: "Customer not found with provided ID." });
      }
    } else {
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          OR: [{ phone: phoneNumber }, { name: customerName }],
        },
      });

      if (existingCustomer) {
        customer = existingCustomer;
        const updateData = {};
        if (address && !customer.address) updateData.address = address;
        if (deliveryAddress && !customer.deliveryAddress) updateData.deliveryAddress = deliveryAddress;

        if (Object.keys(updateData).length > 0) {
          await prisma.customer.update({
            where: { id: customer.id },
            data: updateData,
          });
        }
      } else {
        customer = await prisma.customer.create({
          data: {
            name: customerName,
            phone: phoneNumber,
            address: address || "",
            deliveryAddress: deliveryAddress || address || "",
            customerType: customerType || "NEW",
          },
        });
      }
    }

    // Stock availability check
    for (const item of items) {
      const product = await prisma.product.findFirst({
        where: { 
          id: item.productId,
          isArchived: false
        }
      });
      if (!product) {
        return res.status(404).json({ 
          message: `Product not found or has been archived. Please refresh the product list.` 
        });
      }
      if (product.currentStock < Number(item.quantity)) {
        return res.status(400).json({
          message: `Insufficient stock for "${product.name}". Available: ${product.currentStock} ${product.unit}(s).`,
        });
      }
    }

    // Calculate total amount
    let totalAmount = 0;
    for (const item of items) {
      const product = await prisma.product.findFirst({
        where: { id: item.productId, isArchived: false }
      });
      if (!product) {
        return res.status(404).json({ 
          message: `Product not found or archived. Please refresh and try again.` 
        });
      }
      totalAmount += (item.unitPrice || product.sellingPrice) * item.quantity;
    }

    // ✅ Generate order number using counter (auto-increment)
    const orderNumber = await generateSalesOrderNumber();

    // CREATE SALES ORDER
    const order = await prisma.salesOrder.create({
      data: {
        orderNumber: orderNumber,
        customerId: customer.id,
        notes,
        totalAmount,
        createdById: req.user.id,
        status: "PENDING",
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity),
            unitPrice: item.unitPrice || null,
            totalPrice: (item.unitPrice || 0) * Number(item.quantity),
          })),
        },
      },
      include: { customer: true, items: { include: { product: true } } },
    });

    // ==================== HANDLE PAYMENT ====================
    if (paymentType === "CASH") {
      await prisma.payment.create({
        data: {
          salesOrderId: order.id,
          method: "CASH",
          amount: totalAmount,
          status: "COMPLETED",
          verifiedAt: new Date(),
          platform: null,
          platformTransactionId: null,
        },
      });
    } 
    else if (paymentType === "ONLINE") {
      await prisma.payment.create({
        data: {
          salesOrderId: order.id,
          method: "ONLINE",
          platform: paymentPlatform || "OTHER",
          platformTransactionId: platformTransactionId || null,
          amount: totalAmount,
          status: "COMPLETED",
          verifiedAt: new Date(),
        },
      });
    } 
    else if (paymentType === "CREDIT") {
      await prisma.payment.create({
        data: {
          salesOrderId: order.id,
          method: "CREDIT",
          amount: totalAmount,
          status: "PENDING",
          platform: null,
          platformTransactionId: null,
        },
      });

      let dueDate;
      if (creditDueDate) {
        dueDate = new Date(creditDueDate);
      } else {
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
      }

      const existingCreditAccount = await prisma.creditAccount.findUnique({
        where: { customerId: customer.id },
      });

      if (existingCreditAccount) {
        await prisma.creditAccount.update({
          where: { customerId: customer.id },
          data: {
            totalCredit: existingCreditAccount.totalCredit + totalAmount,
            remainingBalance: existingCreditAccount.remainingBalance + totalAmount,
            dueDate: dueDate > existingCreditAccount.dueDate ? dueDate : existingCreditAccount.dueDate,
            status: "PENDING",
          },
        });
      } else {
        await prisma.creditAccount.create({
          data: {
            customerId: customer.id,
            totalCredit: totalAmount,
            paidAmount: 0,
            remainingBalance: totalAmount,
            dueDate: dueDate,
            status: "PENDING",
          },
        });
      }

      await prisma.customer.update({
        where: { id: customer.id },
        data: { outstandingCredit: { increment: totalAmount } },
      });
    } 
    else if (paymentType === "PAY_LATER") {
      await prisma.payment.create({
        data: {
          salesOrderId: order.id,
          method: "PAY_LATER",
          amount: totalAmount,
          status: "PENDING",
          platform: null,
          platformTransactionId: null,
        },
      });
    }

    // ✅ CREATE SALES INVOICE (Auto-increment)
    let invoice = null;
    if (createInvoice) {
      try {
        invoice = await createSalesInvoiceFromOrder(order.id, req.user.id);
      } catch (invoiceError) {
        console.error("Failed to create invoice:", invoiceError);
        // Don't fail the order if invoice creation fails
      }
    }

    // ENHANCED AUDIT LOG
    await logAction({
      userId: req.user.id,
      action: "CREATE",
      entity: "SalesOrder",
      entityId: order.id,
      module: "Orders",
      description: `${req.user.name} created sales order ${order.orderNumber} for ${customer.name} (Amount: ${totalAmount})`,
      newValues: {
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        paymentType: paymentType,
        customerId: customer.id,
      },
      req,
    });

    // CREATE NOTIFICATION
    try {
      const { createNotification } = await import('./notification.controller.js');
      
      await createNotification({
        title: `🛒 New Order: ${order.orderNumber}`,
        message: `New sales order #${order.orderNumber} created for ${customer.name}. Amount: ${totalAmount.toLocaleString()}. Payment: ${paymentType || 'N/A'}.`,
        type: 'NEW_ORDER',
        priority: 'INFORMATION',
        referenceId: order.id,
        referenceType: 'SalesOrder',
        actionUrl: `/orders/${order.id}`,
      });
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError);
    }

    const orderWithPayment = await prisma.salesOrder.findUnique({
      where: { id: order.id },
      include: {
        customer: true,
        items: { include: { product: true } },
        payment: true,
        delivery: true,
        salesInvoice: {
          include: {
            items: {
              include: {
                product: true,
              }
            }
          }
        },
      },
    });

    res.status(201).json({
      ...orderWithPayment,
      invoice: invoice,
    });
  } catch (err) {
    console.error("Error creating sales order:", err);
    res.status(500).json({ message: err.message });
  }
};

// ============================================================
// PATCH /api/sales-orders/:id/status
// ============================================================
export const updateSalesOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const staffAllowed = ["PROCESSING", "CANCELLED"];

    if (!staffAllowed.includes(status)) {
      return res.status(403).json({
        message:
          "Staff can only change status to PROCESSING or CANCELLED. Use delivery section for dispatch/complete.",
      });
    }

    const existing = await prisma.salesOrder.findUnique({
      where: { id: req.params.id },
      include: {
        items: { include: { product: true } },
        delivery: true,
        payment: true,
        salesInvoice: true,
      },
    });

    if (!existing) return res.status(404).json({ message: "Sales order not found." });

    let updatedOrder;

    if (status === "PROCESSING" && existing.status === "PENDING") {
      await prisma.delivery.create({
        data: {
          salesOrderId: existing.id,
          status: "PENDING",
          notes: "Awaiting dispatch - Order processed",
        },
      });

      updatedOrder = await prisma.salesOrder.update({
        where: { id: req.params.id },
        data: { status: "PROCESSING" },
      });

      // Update invoice status to SENT
      if (existing.salesInvoice) {
        await prisma.salesInvoice.update({
          where: { id: existing.salesInvoice.id },
          data: { status: "SENT" },
        });
      }

      await logAction({
        userId: req.user.id,
        action: "UPDATE_STATUS",
        entity: "SalesOrder",
        entityId: existing.id,
        module: "Orders",
        description: `${req.user.name} changed order ${existing.orderNumber} status from ${existing.status} to PROCESSING`,
        oldValues: { status: existing.status },
        newValues: { status: "PROCESSING" },
        req,
      });

      try {
        const { createNotification } = await import('./notification.controller.js');
        await createNotification({
          title: `📦 Order Processing: ${existing.orderNumber}`,
          message: `Order #${existing.orderNumber} is now being processed.`,
          type: 'ORDER_UPDATE',
          priority: 'INFORMATION',
          referenceId: existing.id,
          referenceType: 'SalesOrder',
          actionUrl: `/orders/${existing.id}`,
        });
      } catch (notificationError) {
        console.error('Failed to create notification:', notificationError);
      }

    } else if (status === "CANCELLED") {
      // Reverse credit if order was on credit
      if (existing.payment?.method === "CREDIT") {
        const creditAccount = await prisma.creditAccount.findUnique({
          where: { customerId: existing.customerId },
        });

        if (creditAccount) {
          const newTotalCredit = creditAccount.totalCredit - existing.totalAmount;
          const newRemainingBalance = creditAccount.remainingBalance - existing.totalAmount;

          if (newTotalCredit <= 0 || newRemainingBalance <= 0) {
            await prisma.creditPayment.deleteMany({
              where: { creditAccountId: creditAccount.id },
            });
            await prisma.creditAccount.delete({
              where: { id: creditAccount.id },
            });
            await prisma.customer.update({
              where: { id: existing.customerId },
              data: { outstandingCredit: 0 },
            });
          } else {
            await prisma.creditAccount.update({
              where: { id: creditAccount.id },
              data: {
                totalCredit: newTotalCredit,
                remainingBalance: newRemainingBalance,
                status: newRemainingBalance === 0 ? "PAID" : "PARTIAL",
              },
            });
            await prisma.customer.update({
              where: { id: existing.customerId },
              data: { outstandingCredit: newRemainingBalance },
            });
          }

          await prisma.payment.update({
            where: { salesOrderId: existing.id },
            data: { status: "CANCELLED" },
          });
        }
      }

      updatedOrder = await prisma.salesOrder.update({
        where: { id: req.params.id },
        data: { status: "CANCELLED" },
      });

      // Update invoice status to CANCELLED
      if (existing.salesInvoice) {
        await prisma.salesInvoice.update({
          where: { id: existing.salesInvoice.id },
          data: { status: "CANCELLED" },
        });
      }

      if (existing.delivery) {
        await prisma.delivery.update({
          where: { salesOrderId: existing.id },
          data: { status: "RETURNED" },
        });
      }

      await logAction({
        userId: req.user.id,
        action: "CANCEL",
        entity: "SalesOrder",
        entityId: existing.id,
        module: "Orders",
        description: `${req.user.name} cancelled order ${existing.orderNumber}`,
        oldValues: { status: existing.status },
        newValues: { status: "CANCELLED" },
        req,
      });

      try {
        const { createNotification } = await import('./notification.controller.js');
        await createNotification({
          title: `❌ Order Cancelled: ${existing.orderNumber}`,
          message: `Order #${existing.orderNumber} has been cancelled.`,
          type: 'ORDER_UPDATE',
          priority: 'WARNING',
          referenceId: existing.id,
          referenceType: 'SalesOrder',
          actionUrl: `/orders/${existing.id}`,
        });
      } catch (notificationError) {
        console.error('Failed to create notification:', notificationError);
      }

    } else {
      return res.status(400).json({ message: "Invalid status transition" });
    }

    res.json(updatedOrder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ============================================================
// DELETE /api/sales-orders/:id
// ============================================================
export const deleteSalesOrder = async (req, res) => {
  try {
    const order = await prisma.salesOrder.findUnique({ 
      where: { id: req.params.id },
      include: { salesInvoice: true }
    });
    if (!order) return res.status(404).json({ message: "Sales order not found." });
    if (["DISPATCHED", "COMPLETED"].includes(order.status)) {
      return res.status(400).json({ message: "Cannot delete a dispatched or completed order." });
    }

    // Delete associated invoice if exists
    if (order.salesInvoice) {
      await prisma.salesInvoice.delete({
        where: { id: order.salesInvoice.id },
      });
    }

    await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: req.params.id } });
    await prisma.salesOrder.delete({ where: { id: req.params.id } });

    await logAction({
      userId: req.user.id,
      action: "DELETE",
      entity: "SalesOrder",
      entityId: req.params.id,
      module: "Orders",
      description: `${req.user.name} deleted order ${order.orderNumber}`,
      oldValues: { orderNumber: order.orderNumber, totalAmount: order.totalAmount },
      req,
    });

    res.json({ message: "Sales order deleted." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================================================
// BULK ORDER STATUS UPDATE
// ============================================================
export const bulkUpdateOrderStatus = async (req, res) => {
  try {
    const { orderIds, status } = req.body;
    
    if (!orderIds || !orderIds.length) {
      return res.status(400).json({ message: "Order IDs are required." });
    }
    
    if (!status) {
      return res.status(400).json({ message: "Status is required." });
    }
    
    const validStatuses = ["PROCESSING", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status. Only PROCESSING or CANCELLED allowed." });
    }

    const result = await prisma.salesOrder.updateMany({
      where: {
        id: { in: orderIds },
        status: "PENDING",
      },
      data: { status },
    });

    await logAction({
      userId: req.user.id,
      action: "BULK_UPDATE_STATUS",
      entity: "SalesOrder",
      entityId: null,
      module: "Orders",
      description: `${req.user.name} bulk updated ${result.count} orders to ${status}`,
      newValues: { status, count: result.count },
      req,
    });

    try {
      const { createNotification } = await import('./notification.controller.js');
      await createNotification({
        title: `📋 Bulk Order Update: ${result.count} orders ${status.toLowerCase()}`,
        message: `${result.count} orders have been ${status.toLowerCase()} in bulk.`,
        type: 'ORDER_UPDATE',
        priority: 'INFORMATION',
        referenceType: 'SalesOrder',
      });
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError);
    }

    res.json({
      success: true,
      message: `${result.count} orders updated to ${status}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ============================================================
// GET ORDER STATISTICS BY PAYMENT METHOD
// ============================================================
export const getPaymentMethodStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const where = {};
    if (startDate) {
      where.createdAt = { gte: new Date(startDate) };
    }
    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    }

    const stats = await prisma.payment.groupBy({
      by: ["method"],
      where: {
        salesOrder: where,
        status: "COMPLETED",
      },
      _sum: { amount: true },
      _count: true,
    });

    const totalRevenue = stats.reduce((sum, p) => sum + (p._sum.amount || 0), 0);
    const totalOrders = stats.reduce((sum, p) => sum + p._count, 0);

    res.json({
      stats: stats.map(p => ({
        method: p.method,
        totalAmount: p._sum.amount || 0,
        count: p._count,
        percentage: totalRevenue > 0 ? ((p._sum.amount || 0) / totalRevenue) * 100 : 0,
      })),
      summary: {
        totalRevenue,
        totalOrders,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};