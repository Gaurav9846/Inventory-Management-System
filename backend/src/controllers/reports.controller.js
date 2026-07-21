// src/controllers/reports.controller.js

import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";

// ==================== EXPORTED CONTROLLER FUNCTIONS ====================

/**
 * GET /api/reports/dashboard
 * Comprehensive dashboard report with full filtering and pagination
 */
export const getDashboardReport = async (req, res) => {
  try {
    const {
      dateRange = 'last30days',
      fromDate,
      toDate,
      employeeId,
      productId,
      supplierId,
      customerId,
      paymentMethod,
      metric = 'revenue',
      sortBy = 'revenue',
      paymentDisplayMode = 'amount',
      page = 1,
      limit = 10,
    } = req.query;

    const userRole = req.user.role;
    const userId = req.user.id;

    const { dateFilter, groupBy } = buildDateFilterWithGrouping(dateRange, fromDate, toDate);
    const whereClause = buildWhereClause({ 
      employeeId, 
      productId, 
      supplierId, 
      customerId, 
      paymentMethod, 
      dateFilter,
      userRole,
      userId 
    });
    const context = getContext({ employeeId, productId, supplierId, customerId, paymentMethod });

    const [
      revenueData,
      ordersData,
      creditData,
      inventoryData,
      paymentBreakdownData,
      topProductsData,
      customerData,
      weeklyTrendData,
      filteredOrdersResult,
      topSuppliers,
      topCustomers,
      lowStockProducts,
      supplierData,
      customerDataDetailed,
      employeeData,
      paymentData,
      purchaseOrders,
    ] = await Promise.all([
      getRevenueSummary(whereClause, dateFilter, groupBy, supplierId),
      getOrderStats(whereClause),
      getCreditSummary(whereClause),
      getInventoryValue(whereClause),
      getPaymentBreakdown(whereClause, paymentMethod),
      getTopProducts(whereClause, sortBy, 5, productId),
      getActiveCustomers(whereClause),
      getWeeklyTrend(whereClause, dateFilter, groupBy),
      getFilteredOrders(whereClause, productId, supplierId, customerId, employeeId, userRole, userId, page, limit),
      getTopSuppliers(whereClause),
      getTopCustomers(whereClause),
      getLowStockProducts(),
      supplierId && supplierId !== 'all' ? getSupplierDetails(whereClause, supplierId, dateFilter) : Promise.resolve(null),
      customerId && customerId !== 'all' ? getCustomerDetails(whereClause, customerId, dateFilter) : Promise.resolve(null),
      employeeId && employeeId !== 'all' ? getEmployeeDetails(whereClause, employeeId) : Promise.resolve(null),
      paymentMethod && paymentMethod !== 'all' ? getPaymentDetails(whereClause, paymentMethod, dateFilter) : Promise.resolve(null),
      supplierId && supplierId !== 'all' ? getFilteredPurchaseOrders(supplierId, dateFilter) : Promise.resolve([]),
    ]);

    // If supplier filter is active, merge purchase orders with filtered orders
    let finalFilteredOrders = filteredOrdersResult.data || [];
    let pagination = filteredOrdersResult.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 };
    
    if (supplierId && supplierId !== 'all' && purchaseOrders.length > 0) {
      finalFilteredOrders = [...finalFilteredOrders, ...purchaseOrders];
      pagination.total += purchaseOrders.length;
      pagination.totalPages = Math.ceil(pagination.total / pagination.limit);
    }

    const summary = buildSummary({
      revenueData,
      ordersData,
      inventoryData,
      creditData,
      customerData,
      topProductsData,
      context,
      employeeId,
      productId,
      supplierId,
      customerId,
      paymentMethod,
      employeeData,
      customerDataDetailed,
    });

    const response = {
      summary,
      revenueTrend: revenueData,
      paymentMethods: buildPaymentMethods(paymentBreakdownData, paymentDisplayMode),
      topProducts: topProductsData,
      weeklyTrend: weeklyTrendData,
      creditSummary: creditData,
      inventoryOverview: inventoryData,
      filteredOrders: finalFilteredOrders,
      pagination,
      lowStock: lowStockProducts,
      topSuppliers,
      topCustomers,
      groupBy,
      dateRange,
      ...(supplierData && { supplierData }),
      ...(customerDataDetailed && { customerDataDetailed }),
      ...(employeeData && { employeeData }),
      ...(paymentData && { paymentData }),
    };

    await logAction(req.user.id, "VIEW_REPORT", "Report", null, {
      dateRange,
      filters: { employeeId, productId, supplierId, customerId, paymentMethod },
      page,
      limit,
    });

    res.json({ success: true, data: response, filters: { dateRange, employeeId, productId, supplierId, customerId, paymentMethod } });
  } catch (error) {
    console.error("Error in getDashboardReport:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== HELPER FUNCTIONS ====================

const getContext = ({ employeeId, productId, supplierId, customerId, paymentMethod }) => {
  if (employeeId && employeeId !== 'all') return 'employee';
  if (productId && productId !== 'all') return 'product';
  if (supplierId && supplierId !== 'all') return 'supplier';
  if (customerId && customerId !== 'all') return 'customer';
  if (paymentMethod && paymentMethod !== 'all') return 'payment';
  return 'overview';
};

const buildDateFilterWithGrouping = (dateRange, fromDate, toDate) => {
  const now = new Date();
  let start = new Date();
  let end = new Date();
  let groupBy = 'day';

  if (dateRange === 'custom' && fromDate && toDate) {
    start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);
    end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) groupBy = 'hour';
    else if (diffDays <= 31) groupBy = 'day';
    else if (diffDays <= 180) groupBy = 'week';
    else groupBy = 'month';
    
    return { dateFilter: { gte: start, lte: end }, groupBy };
  }

  switch (dateRange) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      groupBy = 'hour';
      break;
    case 'yesterday':
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      groupBy = 'hour';
      break;
    case 'last7days':
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      groupBy = 'day';
      break;
    case 'last30days':
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      groupBy = 'day';
      break;
    case 'thisMonth':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      groupBy = 'day';
      break;
    case 'lastMonth':
      start.setMonth(now.getMonth() - 1);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      groupBy = 'day';
      break;
    case 'last3Months':
      start.setMonth(now.getMonth() - 3);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      groupBy = 'week';
      break;
    case 'last6Months':
      start.setMonth(now.getMonth() - 6);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      groupBy = 'month';
      break;
    case 'thisYear':
      start.setMonth(0);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      groupBy = 'month';
      break;
    default:
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      groupBy = 'day';
  }
  return { dateFilter: { gte: start, lte: end }, groupBy };
};

const buildDateFilter = (dateRange, fromDate, toDate) => {
  const { dateFilter } = buildDateFilterWithGrouping(dateRange, fromDate, toDate);
  return dateFilter;
};

const buildWhereClause = ({ employeeId, productId, supplierId, customerId, paymentMethod, dateFilter, userRole, userId }) => {
  const where = {};
  
  if (dateFilter) where.createdAt = dateFilter;

  if (!employeeId || employeeId === 'all') {
    if (userRole === 'MANAGER') {
      where.createdBy = { role: 'STAFF' };
    }
  }

  if (employeeId && employeeId !== 'all') {
    where.createdById = employeeId;
  }

  if (customerId && customerId !== 'all') {
    where.customerId = customerId;
  }

  if (paymentMethod && paymentMethod !== 'all') {
    where.payment = {
      method: paymentMethod.toUpperCase(),
      status: "COMPLETED",
    };
  }

  if (productId && productId !== 'all') {
    where.items = {
      some: {
        productId: productId,
      },
    };
  }

  if (supplierId && supplierId !== 'all') {
    where.items = {
      some: {
        product: {
          supplierId: supplierId,
        },
      },
    };
  }

  return where;
};

// ==================== CUSTOMER HELPER FUNCTIONS ====================

const getCustomerPurchaseHistory = async (whereClause, customerId) => {
  if (!customerId || customerId === 'all') return { history: [], totalPurchased: 0, totalPaid: 0, creditRemaining: 0, orders: [] };
  
  try {
    const orders = await prisma.salesOrder.findMany({
      where: { 
        ...whereClause, 
        customerId, 
        status: { in: ["DISPATCHED", "COMPLETED"] } 
      },
      select: { 
        id: true,
        totalAmount: true, 
        createdAt: true,
        orderNumber: true,
        status: true,
        payment: {
          select: {
            method: true,
            amount: true,
            status: true,
          }
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    const creditAccount = await prisma.creditAccount.findUnique({
      where: { customerId: customerId },
      select: {
        totalCredit: true,
        paidAmount: true,
        remainingBalance: true,
        dueDate: true,
      },
    });

    const cashOnlinePayments = await prisma.payment.findMany({
      where: {
        salesOrder: {
          customerId: customerId,
        },
        status: "COMPLETED",
        method: {
          not: "CREDIT",
        },
      },
      select: {
        amount: true,
        salesOrderId: true,
      },
    });

    const paidPerOrder = {};
    for (const payment of cashOnlinePayments) {
      const orderId = payment.salesOrderId;
      if (!paidPerOrder[orderId]) paidPerOrder[orderId] = 0;
      paidPerOrder[orderId] += payment.amount || 0;
    }

    // IMPORTANT: Use creditAccount.paidAmount as the total paid for credit orders
    const totalPaid = creditAccount?.paidAmount || 0;
    const totalPurchased = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const creditRemaining = creditAccount?.remainingBalance || Math.max(0, totalPurchased - totalPaid);

    const creditOrders = orders.filter(o => o.payment?.method === "CREDIT");
    const totalCreditAmount = creditOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const grouped = {};
    for (const order of orders) {
      const month = order.createdAt.toISOString().slice(0, 7);
      if (!grouped[month]) {
        grouped[month] = { 
          month, 
          purchaseAmount: 0,
          orderCount: 0,
          totalPaid: 0,
        };
      }
      grouped[month].purchaseAmount += order.totalAmount || 0;
      grouped[month].orderCount += 1;
      
      let paidForOrder = 0;
      if (order.payment?.method === "CREDIT" && totalCreditAmount > 0 && creditAccount) {
        const proportion = (order.totalAmount || 0) / totalCreditAmount;
        paidForOrder = creditAccount.paidAmount * proportion;
      } else if (order.payment?.status === "COMPLETED" && order.payment?.method !== "CREDIT") {
        paidForOrder = paidPerOrder[order.id] || 0;
      }
      grouped[month].totalPaid += paidForOrder;
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      const monthData = grouped[key];
      result.push({ 
        month: monthNames[d.getMonth()], 
        purchaseAmount: monthData?.purchaseAmount || 0,
        totalPaid: monthData?.totalPaid || 0,
        orderCount: monthData?.orderCount || 0,
        creditRemaining: Math.max(0, (monthData?.purchaseAmount || 0) - (monthData?.totalPaid || 0)),
      });
    }
    
    return {
      history: result,
      totalPurchased,
      totalPaid,
      creditRemaining,
      creditAccount,
      orders: orders.map(order => {
        let paidForOrder = 0;
        if (order.payment?.method === "CREDIT" && totalCreditAmount > 0 && creditAccount) {
          const proportion = (order.totalAmount || 0) / totalCreditAmount;
          paidForOrder = creditAccount.paidAmount * proportion;
        } else if (order.payment?.status === "COMPLETED" && order.payment?.method !== "CREDIT") {
          paidForOrder = paidPerOrder[order.id] || 0;
        }
        
        return {
          ...order,
          paidAmount: paidForOrder,
          creditRemaining: order.payment?.method === "CREDIT" 
            ? Math.max(0, (order.totalAmount || 0) - paidForOrder)
            : 0,
        };
      }),
    };
  } catch (error) {
    console.error("Error in getCustomerPurchaseHistory:", error);
    return { history: [], totalPurchased: 0, totalPaid: 0, creditRemaining: 0, orders: [] };
  }
};

const getCustomerPaymentMethods = async (whereClause, customerId) => {
  if (!customerId || customerId === 'all') return [];
  
  try {
    const payments = await prisma.payment.findMany({
      where: {
        salesOrder: { 
          customerId, 
          ...whereClause 
        },
        status: "COMPLETED",
        method: {
          not: "CREDIT",
        },
      },
      select: { 
        method: true, 
        amount: true 
      },
    });
    
    const creditAccount = await prisma.creditAccount.findUnique({
      where: { customerId: customerId },
      select: {
        paidAmount: true,
        totalCredit: true,
        remainingBalance: true,
      },
    });
    
    const grouped = {};
    
    for (const payment of payments) {
      const method = payment.method?.toLowerCase() || 'unknown';
      if (!grouped[method]) {
        grouped[method] = { 
          name: method.charAt(0).toUpperCase() + method.slice(1), 
          value: 0 
        };
      }
      grouped[method].value += payment.amount || 0;
    }
    
    if (creditAccount && creditAccount.paidAmount > 0) {
      grouped['credit'] = {
        name: 'Credit',
        value: creditAccount.paidAmount,
      };
    }
    
    if (Object.keys(grouped).length === 0) {
      return [];
    }
    
    return Object.values(grouped);
  } catch (error) {
    console.error("Error in getCustomerPaymentMethods:", error);
    return [];
  }
};

// ==================== FIXED: getCustomerOrders ====================

const getCustomerOrders = async (customerId, dateFilter) => {
  if (!customerId || customerId === 'all') return [];
  
  try {
    const where = { customerId };
    if (dateFilter) where.createdAt = dateFilter;

    const orders = await prisma.salesOrder.findMany({
      where,
      include: { 
        customer: true, 
        payment: true, 
        items: { include: { product: true } }, 
        delivery: true 
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const creditAccount = await prisma.creditAccount.findUnique({
      where: { customerId: customerId },
      select: {
        id: true,
        remainingBalance: true,
        totalCredit: true,
        paidAmount: true,
      },
    });

    const creditOrders = orders.filter(o => o.payment?.method === "CREDIT");
    const totalCreditAmount = creditOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const cashOnlinePayments = await prisma.payment.findMany({
      where: {
        salesOrder: {
          customerId: customerId,
        },
        status: "COMPLETED",
        method: {
          not: "CREDIT",
        },
      },
      select: {
        amount: true,
        salesOrderId: true,
      },
    });

    const paidPerOrder = {};
    for (const payment of cashOnlinePayments) {
      const orderId = payment.salesOrderId;
      if (!paidPerOrder[orderId]) paidPerOrder[orderId] = 0;
      paidPerOrder[orderId] += payment.amount || 0;
    }

    return orders.map(order => {
      const isCredit = order.payment?.method === "CREDIT";
      let paidAmountForOrder = 0;
      let creditRemainingForOrder = 0;
      
      if (isCredit && creditAccount) {
        // IMPORTANT: Use proportional distribution from credit account
        if (totalCreditAmount > 0) {
          const proportion = (order.totalAmount || 0) / totalCreditAmount;
          paidAmountForOrder = creditAccount.paidAmount * proportion;
        }
        creditRemainingForOrder = Math.max(0, (order.totalAmount || 0) - paidAmountForOrder);
      } else if (isCredit && !creditAccount) {
        paidAmountForOrder = 0;
        creditRemainingForOrder = order.totalAmount || 0;
      } else {
        if (order.payment?.status === "COMPLETED") {
          paidAmountForOrder = paidPerOrder[order.id] || order.payment?.amount || 0;
        }
      }

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        date: order.createdAt,
        customer: order.customer?.name || 'Unknown',
        products: order.items.map(i => i.product?.name || 'Unknown').join(', '),
        quantity: order.items.reduce((s, i) => s + i.quantity, 0),
        totalAmount: order.totalAmount || 0,
        paidAmount: paidAmountForOrder,
        creditRemaining: Math.max(0, creditRemainingForOrder),
        status: order.status,
        paymentMethod: order.payment?.method || 'N/A',
        paymentStatus: order.payment?.status || 'N/A',
        deliveryStatus: order.delivery?.status || 'PENDING',
        items: order.items.map(i => ({ 
          name: i.product?.name || 'Unknown', 
          quantity: i.quantity, 
          unitPrice: i.unitPrice || 0, 
          totalPrice: i.totalPrice || 0 
        })),
      };
    });
  } catch (error) {
    console.error("Error in getCustomerOrders:", error);
    return [];
  }
};

// ==================== FIXED: getCustomerDetails ====================

const getCustomerDetails = async (whereClause, customerId, dateFilter) => {
  try {
    const purchaseHistoryData = await getCustomerPurchaseHistory(whereClause, customerId);
    const [paymentMethods, orders] = await Promise.all([
      getCustomerPaymentMethods(whereClause, customerId),
      getCustomerOrders(customerId, dateFilter),
    ]);
    
    const creditAccount = await prisma.creditAccount.findUnique({
      where: { customerId: customerId },
      select: {
        totalCredit: true,
        paidAmount: true,
        remainingBalance: true,
        dueDate: true,
      },
    });

    const finalCreditRemaining = creditAccount?.remainingBalance || 0;
    const finalTotalPaid = creditAccount?.paidAmount || 0;
    
    return { 
      purchaseHistory: purchaseHistoryData.history || [],
      totalPurchased: purchaseHistoryData.totalPurchased || 0,
      totalPaid: finalTotalPaid,
      creditRemaining: finalCreditRemaining,
      paymentMethods, 
      orders,
      creditAccount,
    };
  } catch (error) {
    console.error("Error in getCustomerDetails:", error);
    return { 
      purchaseHistory: [], 
      totalPurchased: 0, 
      totalPaid: 0, 
      creditRemaining: 0, 
      paymentMethods: [], 
      orders: [],
      creditAccount: null 
    };
  }
};

// ==================== FIXED: getFilteredOrders ====================

const getFilteredOrders = async (whereClause, productId, supplierId, customerId, employeeId, userRole, userId, page = 1, limit = 10) => {
  try {
    const orderWhere = { ...whereClause };
    const skip = (page - 1) * limit;
    const take = Number(limit);

    if (employeeId && employeeId !== 'all') {
      orderWhere.createdById = employeeId;
    } else if (!employeeId || employeeId === 'all') {
      if (userRole === 'MANAGER') {
        orderWhere.createdBy = { role: 'STAFF' };
      }
    }

    if (productId && productId !== 'all') orderWhere.items = { some: { productId } };
    if (supplierId && supplierId !== 'all') orderWhere.items = { some: { product: { supplierId } } };
    if (customerId && customerId !== 'all') orderWhere.customerId = customerId;

    const total = await prisma.salesOrder.count({ where: orderWhere });

    const orders = await prisma.salesOrder.findMany({
      where: orderWhere,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        payment: { select: { method: true, amount: true, status: true } },
        items: { include: { product: { select: { id: true, name: true, unit: true, currentStock: true } } } },
        createdBy: { select: { id: true, name: true, role: true } },
        delivery: { select: { status: true, deliveredAt: true } },
      },
      skip: Number(skip),
      take: Number(take),
      orderBy: { createdAt: 'desc' },
    });

    // Get credit accounts for all customers in these orders
    const customerIds = [...new Set(orders.filter(o => o.customerId).map(o => o.customerId))];
    let creditAccountsMap = {};
    
    if (customerIds.length > 0) {
      const creditAccounts = await prisma.creditAccount.findMany({
        where: {
          customerId: { in: customerIds },
        },
        select: {
          customerId: true,
          totalCredit: true,
          paidAmount: true,
          remainingBalance: true,
        },
      });
      
      for (const account of creditAccounts) {
        creditAccountsMap[account.customerId] = account;
      }
    }

    // Get cash/online payments for these orders
    const orderIds = orders.map(o => o.id);
    let cashPaymentsMap = {};
    if (orderIds.length > 0) {
      const cashPayments = await prisma.payment.findMany({
        where: {
          salesOrderId: { in: orderIds },
          status: "COMPLETED",
          method: {
            not: "CREDIT",
          },
        },
        select: {
          amount: true,
          salesOrderId: true,
        },
      });
      
      for (const payment of cashPayments) {
        if (payment.salesOrderId) {
          if (!cashPaymentsMap[payment.salesOrderId]) cashPaymentsMap[payment.salesOrderId] = 0;
          cashPaymentsMap[payment.salesOrderId] += payment.amount || 0;
        }
      }
    }

    const formattedOrders = orders.map(order => {
      const customerId = order.customerId;
      const creditAccount = creditAccountsMap[customerId];
      
      let paidAmountForOrder = 0;
      let creditRemainingForOrder = 0;
      
      // IMPORTANT: Check if this is a credit order
      if (order.payment?.method === "CREDIT") {
        // For credit orders, ONLY use the credit account data
        if (creditAccount) {
          // Get all credit orders for this customer
          const creditOrders = orders.filter(o => 
            o.payment?.method === "CREDIT" && o.customerId === customerId
          );
          const totalCreditAmount = creditOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
          
          if (totalCreditAmount > 0) {
            // Proportional distribution of paid amount from credit account
            const proportion = (order.totalAmount || 0) / totalCreditAmount;
            paidAmountForOrder = creditAccount.paidAmount * proportion;
          }
          
          creditRemainingForOrder = Math.max(0, (order.totalAmount || 0) - paidAmountForOrder);
        } else {
          // No credit account found - show 0 paid, full amount as credit remaining
          paidAmountForOrder = 0;
          creditRemainingForOrder = order.totalAmount || 0;
        }
      } else {
        // For cash/online payments, use the payment amount if completed
        if (order.payment?.status === "COMPLETED") {
          paidAmountForOrder = cashPaymentsMap[order.id] || order.payment?.amount || 0;
        }
      }

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        date: order.createdAt,
        customer: order.customer?.name || 'Unknown',
        customerPhone: order.customer?.phone || '',
        product: order.items.map(i => i.product?.name).filter(Boolean).join(', ') || 'N/A',
        quantity: order.items.reduce((sum, i) => sum + i.quantity, 0),
        totalAmount: order.totalAmount || 0,
        status: order.status,
        paymentMethod: order.payment?.method || 'N/A',
        paymentStatus: order.payment?.status || 'N/A',
        deliveryStatus: order.delivery?.status || 'PENDING',
        createdBy: order.createdBy?.name || 'System',
        createdByRole: order.createdBy?.role || 'UNKNOWN',
        items: order.items.map(i => ({
          name: i.product?.name || 'Unknown',
          quantity: i.quantity,
          unitPrice: i.unitPrice || 0,
          totalPrice: i.totalPrice || 0,
          product: i.product,
        })),
        payment: order.payment,
        creditRemaining: creditRemainingForOrder,
        paidAmount: paidAmountForOrder,
        customerCreditPaid: creditAccount?.paidAmount || 0,
        customerCreditRemaining: creditAccount?.remainingBalance || 0,
      };
    });

    return {
      data: formattedOrders,
      pagination: {
        total,
        page: Number(page),
        limit: Number(take),
        totalPages: Math.ceil(total / take),
      },
    };
  } catch (error) {
    console.error("Error in getFilteredOrders:", error);
    return {
      data: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
    };
  }
};

// ==================== CORE DATA FETCHERS ====================

const getRevenueSummary = async (whereClause, dateFilter, groupBy = 'day', supplierId) => {
  try {
    const orders = await prisma.salesOrder.findMany({
      where: { ...whereClause, status: { in: ["DISPATCHED", "COMPLETED"] } },
      select: { totalAmount: true, createdAt: true, customerId: true },
    });

    let purchaseOrders = [];
    if (supplierId && supplierId !== 'all') {
      const poWhere = { supplierId };
      if (dateFilter) poWhere.createdAt = dateFilter;
      
      const pos = await prisma.purchaseOrder.findMany({
        where: poWhere,
        select: { totalAmount: true, createdAt: true },
      });
      purchaseOrders = pos;
    }

    const grouped = {};
    const formatMap = {
      hour: (date) => date.toISOString().slice(0, 13) + ':00',
      day: (date) => date.toISOString().slice(0, 10),
      week: (date) => {
        const d = new Date(date);
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - d.getDay());
        return startOfWeek.toISOString().slice(0, 10);
      },
      month: (date) => date.toISOString().slice(0, 7),
    };

    const labelMap = {
      hour: (date) => {
        const d = new Date(date);
        return d.getHours().toString().padStart(2, '0') + ':00';
      },
      day: (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      },
      week: (date) => {
        const d = new Date(date);
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - d.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      },
      month: (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      },
    };

    for (const order of orders) {
      const key = formatMap[groupBy](order.createdAt);
      if (!grouped[key]) {
        grouped[key] = { 
          label: labelMap[groupBy](order.createdAt),
          revenue: 0, 
          orders: 0, 
          customers: new Set() 
        };
      }
      grouped[key].revenue += order.totalAmount || 0;
      grouped[key].orders += 1;
      if (order.customerId) grouped[key].customers.add(order.customerId);
    }

    for (const po of purchaseOrders) {
      const key = formatMap[groupBy](po.createdAt);
      if (!grouped[key]) {
        grouped[key] = { 
          label: labelMap[groupBy](po.createdAt),
          revenue: 0, 
          orders: 0, 
          customers: new Set() 
        };
      }
      grouped[key].revenue += po.totalAmount || 0;
      grouped[key].orders += 1;
    }

    const sortedKeys = Object.keys(grouped).sort();
    return sortedKeys.map(key => ({
      label: grouped[key].label,
      revenue: grouped[key].revenue,
      orders: grouped[key].orders,
      customers: grouped[key].customers.size,
    }));
  } catch (error) {
    console.error("Error in getRevenueSummary:", error);
    return [];
  }
};

const getOrderStats = async (whereClause) => {
  try {
    const [total, completed, pending, cancelled, processing, dispatched] = await Promise.all([
      prisma.salesOrder.count({ where: whereClause }),
      prisma.salesOrder.count({ where: { ...whereClause, status: "COMPLETED" } }),
      prisma.salesOrder.count({ where: { ...whereClause, status: "PENDING" } }),
      prisma.salesOrder.count({ where: { ...whereClause, status: "CANCELLED" } }),
      prisma.salesOrder.count({ where: { ...whereClause, status: "PROCESSING" } }),
      prisma.salesOrder.count({ where: { ...whereClause, status: "DISPATCHED" } }),
    ]);
    return { total, completed, pending, cancelled, processing, dispatched };
  } catch (error) {
    console.error("Error in getOrderStats:", error);
    return { total: 0, completed: 0, pending: 0, cancelled: 0, processing: 0, dispatched: 0 };
  }
};

const getFilteredPurchaseOrders = async (supplierId, dateFilter) => {
  if (!supplierId || supplierId === 'all') return [];
  
  try {
    const where = { supplierId };
    if (dateFilter) where.createdAt = dateFilter;

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true, phone: true, email: true } },
        items: { 
          include: { 
            rawMaterial: { select: { id: true, name: true, unit: true } } 
          } 
        },
        payments: { select: { amount: true, paymentDate: true, paymentMethod: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return orders.map(order => {
      const totalPaid = order.payments.reduce((s, p) => s + (p.amount || 0), 0);
      
      const formattedItems = order.items.map(item => ({
        name: item.rawMaterial?.name || 'Unknown',
        quantity: item.quantity,
        unitPrice: item.unitPrice || 0,
        totalPrice: (item.unitPrice || 0) * item.quantity,
      }));

      const productDisplay = order.items.map(item => 
        `${item.rawMaterial?.name || 'Unknown'} → ${item.quantity} × NPR ${(item.unitPrice || 0).toFixed(2)} = NPR ${((item.unitPrice || 0) * item.quantity).toFixed(2)}`
      ).join('\n');

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        date: order.createdAt,
        supplier: order.supplier?.name || 'Unknown',
        supplierPhone: order.supplier?.phone || '',
        product: productDisplay,
        productList: formattedItems,
        quantity: order.items.reduce((s, i) => s + i.quantity, 0),
        totalAmount: order.totalAmount || 0,
        totalPaid,
        outstanding: (order.totalAmount || 0) - totalPaid,
        status: order.status,
        paymentStatus: order.paymentStatus,
        expectedDeliveryDate: order.expectedDeliveryDate,
        createdBy: order.createdBy?.name || 'System',
        items: formattedItems,
        payments: order.payments,
        type: 'PURCHASE_ORDER',
        isPurchaseOrder: true,
      };
    });
  } catch (error) {
    console.error("Error in getFilteredPurchaseOrders:", error);
    return [];
  }
};

const getWeeklyTrend = async (whereClause, dateFilter, groupBy = 'day') => {
  try {
    const orders = await prisma.salesOrder.findMany({
      where: { ...whereClause },
      select: { createdAt: true, totalAmount: true },
    });

    const grouped = {};
    const formatMap = {
      hour: (date) => date.toISOString().slice(0, 13) + ':00',
      day: (date) => date.toISOString().slice(0, 10),
      week: (date) => {
        const d = new Date(date);
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - d.getDay());
        return startOfWeek.toISOString().slice(0, 10);
      },
      month: (date) => date.toISOString().slice(0, 7),
    };

    const labelMap = {
      hour: (date) => {
        const d = new Date(date);
        return d.getHours().toString().padStart(2, '0') + ':00';
      },
      day: (date) => {
        const d = new Date(date);
        return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
      },
      week: (date) => {
        const d = new Date(date);
        return `Week ${Math.ceil(d.getDate() / 7)}`;
      },
      month: (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short' });
      },
    };

    for (const order of orders) {
      const key = formatMap[groupBy](order.createdAt);
      if (!grouped[key]) {
        grouped[key] = { label: labelMap[groupBy](order.createdAt), orders: 0, revenue: 0 };
      }
      grouped[key].orders += 1;
      grouped[key].revenue += order.totalAmount || 0;
    }

    const sortedKeys = Object.keys(grouped).sort();
    return sortedKeys.map(key => ({
      label: grouped[key].label,
      orders: grouped[key].orders,
      revenue: grouped[key].revenue,
    }));
  } catch (error) {
    console.error("Error in getWeeklyTrend:", error);
    return [];
  }
};

const getCreditSummary = async (whereClause) => {
  try {
    const dateFilter = whereClause.createdAt;
    const creditAccounts = await prisma.creditAccount.findMany({
      where: { customerId: { not: undefined } },
      select: {
        id: true,
        totalCredit: true,
        paidAmount: true,
        remainingBalance: true,
        customerId: true,
        dueDate: true,
        payments: { where: dateFilter ? { createdAt: dateFilter } : {}, select: { amount: true } },
      },
    });

    let filtered = creditAccounts;
    if (dateFilter) {
      const customerIds = await prisma.salesOrder.findMany({
        where: { createdAt: dateFilter, status: { not: "CANCELLED" } },
        select: { customerId: true },
        distinct: ['customerId'],
      }).then(r => r.map(c => c.customerId));
      filtered = creditAccounts.filter(acc => customerIds.includes(acc.customerId));
    }

    return {
      totalRemaining: filtered.reduce((s, a) => s + (a.remainingBalance || 0), 0),
      totalPaid: filtered.reduce((s, a) => s + a.payments.reduce((p, pm) => p + (pm.amount || 0), 0), 0),
      totalCreditOutstanding: filtered.reduce((s, a) => s + (a.totalCredit || 0), 0),
      totalCreditAccounts: filtered.length,
      overdueAccounts: filtered.filter(a => a.dueDate && new Date(a.dueDate) < new Date() && a.remainingBalance > 0).length,
    };
  } catch (error) {
    console.error("Error in getCreditSummary:", error);
    return { totalRemaining: 0, totalPaid: 0, totalCreditOutstanding: 0, totalCreditAccounts: 0, overdueAccounts: 0 };
  }
};

const getInventoryValue = async (whereClause) => {
  try {
    const productWhere = {};
    if (whereClause.items?.some?.product?.supplierId) productWhere.supplierId = whereClause.items.some.product.supplierId;
    if (whereClause.items?.some?.productId) productWhere.id = whereClause.items.some.productId;

    const [products, rawMaterials] = await Promise.all([
      prisma.product.findMany({ where: productWhere, select: { id: true, name: true, currentStock: true, costPrice: true, sellingPrice: true, reorderLevel: true } }),
      prisma.rawMaterial.findMany({ select: { id: true, name: true, currentStock: true, unitCost: true, reorderLevel: true } }),
    ]);

    const productValue = products.reduce((s, p) => s + (p.currentStock * (p.costPrice || 0)), 0);
    const rawMaterialValue = rawMaterials.reduce((s, r) => s + (r.currentStock * (r.unitCost || 0)), 0);

    return {
      totalValue: productValue + rawMaterialValue,
      productValue,
      rawMaterialValue,
      totalProducts: products.length,
      totalRawMaterials: rawMaterials.length,
      lowStockCount: products.filter(p => p.currentStock > 0 && p.currentStock <= p.reorderLevel).length,
      outOfStockCount: products.filter(p => p.currentStock === 0).length,
      products: products.map(p => ({ id: p.id, name: p.name, currentStock: p.currentStock, costPrice: p.costPrice, sellingPrice: p.sellingPrice, reorderLevel: p.reorderLevel })),
    };
  } catch (error) {
    console.error("Error in getInventoryValue:", error);
    return { totalValue: 0, productValue: 0, rawMaterialValue: 0, totalProducts: 0, totalRawMaterials: 0, lowStockCount: 0, outOfStockCount: 0, products: [] };
  }
};

const getPaymentBreakdown = async (whereClause, paymentMethod) => {
  try {
    const salesOrders = await prisma.salesOrder.findMany({
      where: whereClause,
      select: { payment: { select: { method: true, amount: true, status: true } } },
    });

    const result = { cash: 0, online: 0, credit: 0, pay_later: 0 };
    for (const order of salesOrders) {
      if (order.payment?.status === "COMPLETED") {
        const method = order.payment.method?.toLowerCase() || 'unknown';
        if (result[method] !== undefined) result[method] += order.payment.amount || 0;
      }
    }
    return result;
  } catch (error) {
    console.error("Error in getPaymentBreakdown:", error);
    return { cash: 0, online: 0, credit: 0, pay_later: 0 };
  }
};

const getTopProducts = async (whereClause, sortBy = 'revenue', limit = 5, productId) => {
  try {
    const itemWhere = {};
    
    if (whereClause.createdAt) {
      itemWhere.salesOrder = { 
        createdAt: whereClause.createdAt, 
        status: { in: ["DISPATCHED", "COMPLETED"] } 
      };
    }
    if (whereClause.createdById) {
      itemWhere.salesOrder = { 
        ...itemWhere.salesOrder, 
        createdById: whereClause.createdById 
      };
    }
    if (whereClause.customerId) {
      itemWhere.salesOrder = { 
        ...itemWhere.salesOrder, 
        customerId: whereClause.customerId 
      };
    }
    if (whereClause.createdBy?.role) {
      itemWhere.salesOrder = {
        ...itemWhere.salesOrder,
        createdBy: {
          role: whereClause.createdBy.role,
        },
      };
    }
    if (productId && productId !== 'all') itemWhere.productId = productId;
    if (whereClause.items?.some?.product?.supplierId) {
      itemWhere.product = { supplierId: whereClause.items.some.product.supplierId };
    }

    const orderItems = await prisma.salesOrderItem.groupBy({
      by: ["productId"],
      where: itemWhere,
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { [sortBy === 'revenue' ? 'totalPrice' : 'quantity']: 'desc' } },
      take: Number(limit),
    });

    if (!orderItems.length) return [];

    const products = await prisma.product.findMany({
      where: { id: { in: orderItems.map(i => i.productId) } },
      select: { id: true, name: true, unit: true, sellingPrice: true, currentStock: true, costPrice: true },
    });
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    return orderItems.map(item => {
      const product = productMap[item.productId];
      const revenue = item._sum.totalPrice || 0;
      return {
        id: item.productId,
        name: product?.name || "Unknown",
        units: item._sum.quantity || 0,
        revenue: revenue,
        unit: product?.unit || "piece",
        stock: product?.currentStock || 0,
        profit: revenue * 0.25,
        sellingPrice: product?.sellingPrice || 0,
      };
    });
  } catch (error) {
    console.error("Error in getTopProducts:", error);
    return [];
  }
};

const getActiveCustomers = async (whereClause) => {
  try {
    const [total, active] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { salesOrders: { some: { ...whereClause, status: { not: "CANCELLED" } } } } }),
    ]);
    return { total, active };
  } catch (error) {
    console.error("Error in getActiveCustomers:", error);
    return { total: 0, active: 0 };
  }
};

const getLowStockProducts = async () => {
  try {
    const products = await prisma.product.findMany({
      where: { currentStock: { lte: prisma.product.fields.reorderLevel } },
      select: { id: true, name: true, currentStock: true, reorderLevel: true, unit: true, sku: true, category: { select: { name: true } } },
      orderBy: { currentStock: 'asc' },
      take: 10,
    });
    return products.map(p => ({
      id: p.id,
      name: p.name,
      currentStock: p.currentStock,
      reorderLevel: p.reorderLevel,
      unit: p.unit,
      sku: p.sku,
      category: p.category?.name || 'Uncategorized',
      status: p.currentStock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
    }));
  } catch (error) {
    console.error("Error in getLowStockProducts:", error);
    return [];
  }
};

const getTopSuppliers = async (whereClause) => {
  try {
    const orders = await prisma.salesOrder.findMany({
      where: { ...whereClause, status: { in: ["DISPATCHED", "COMPLETED"] } },
      select: { 
        totalAmount: true, 
        items: { 
          select: { 
            product: { 
              select: { 
                supplierId: true, 
                supplier: { 
                  select: { id: true, name: true, phone: true } 
                } 
              } 
            } 
          } 
        } 
      },
    });

    const map = {};
    for (const order of orders) {
      for (const item of order.items) {
        if (item.product?.supplierId) {
          const id = item.product.supplierId;
          if (!map[id]) {
            map[id] = { 
              id, 
              name: item.product.supplier?.name || 'Unknown', 
              phone: item.product.supplier?.phone || '', 
              purchaseValue: 0, 
              frequency: 0 
            };
          }
          map[id].purchaseValue += order.totalAmount || 0;
          map[id].frequency += 1;
        }
      }
    }
    return Object.values(map).sort((a, b) => b.purchaseValue - a.purchaseValue).slice(0, 5);
  } catch (error) {
    console.error("Error in getTopSuppliers:", error);
    return [];
  }
};

const getTopCustomers = async (whereClause) => {
  try {
    const orders = await prisma.salesOrder.findMany({
      where: { ...whereClause, status: { in: ["DISPATCHED", "COMPLETED"] } },
      select: { 
        totalAmount: true, 
        customerId: true, 
        createdAt: true, 
        customer: { select: { id: true, name: true, phone: true } } 
      },
    });

    const map = {};
    for (const order of orders) {
      if (order.customerId) {
        if (!map[order.customerId]) {
          map[order.customerId] = { 
            id: order.customerId, 
            name: order.customer?.name || 'Unknown', 
            phone: order.customer?.phone || '', 
            purchaseValue: 0, 
            orders: 0, 
            lastPurchase: null 
          };
        }
        map[order.customerId].purchaseValue += order.totalAmount || 0;
        map[order.customerId].orders += 1;
        if (!map[order.customerId].lastPurchase || order.createdAt > map[order.customerId].lastPurchase) {
          map[order.customerId].lastPurchase = order.createdAt;
        }
      }
    }
    return Object.values(map).sort((a, b) => b.purchaseValue - a.purchaseValue).slice(0, 5);
  } catch (error) {
    console.error("Error in getTopCustomers:", error);
    return [];
  }
};

// ==================== DETAILED FILTER-SPECIFIC DATA ====================

const getSupplierDetails = async (whereClause, supplierId, dateFilter) => {
  try {
    const [purchaseTrend, products, purchaseOrders] = await Promise.all([
      getSupplierPurchaseTrend(whereClause, dateFilter, supplierId),
      getSupplierProducts(supplierId),
      getPurchaseOrders(supplierId, dateFilter),
    ]);
    return { purchaseTrend, products, purchaseOrders };
  } catch (error) {
    console.error("Error in getSupplierDetails:", error);
    return { purchaseTrend: [], products: [], purchaseOrders: [] };
  }
};

const getSupplierPurchaseTrend = async (whereClause, dateFilter, supplierId) => {
  if (!supplierId || supplierId === 'all') return [];
  try {
    const orders = await prisma.salesOrder.findMany({
      where: { ...whereClause, status: { in: ["DISPATCHED", "COMPLETED"] }, items: { some: { product: { supplierId } } } },
      select: { totalAmount: true, createdAt: true },
    });

    const grouped = {};
    for (const order of orders) {
      const month = order.createdAt.toISOString().slice(0, 7);
      if (!grouped[month]) grouped[month] = { month, purchaseValue: 0 };
      grouped[month].purchaseValue += order.totalAmount || 0;
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result = [];
    const startDate = dateFilter?.gte || new Date(new Date().setMonth(new Date().getMonth() - 6));
    const endDate = dateFilter?.lte || new Date();

    for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
      const key = d.toISOString().slice(0, 7);
      result.push({ month: monthNames[d.getMonth()], purchaseValue: grouped[key]?.purchaseValue || 0 });
    }
    return result;
  } catch (error) {
    console.error("Error in getSupplierPurchaseTrend:", error);
    return [];
  }
};

const getSupplierProducts = async (supplierId) => {
  if (!supplierId || supplierId === 'all') return [];
  try {
    const products = await prisma.product.findMany({
      where: { supplierId },
      select: { id: true, name: true, currentStock: true, sellingPrice: true, costPrice: true, unit: true },
      take: 10,
    });
    return products.map(p => ({ id: p.id, name: p.name, stock: p.currentStock, sellingPrice: p.sellingPrice, costPrice: p.costPrice, unit: p.unit }));
  } catch (error) {
    console.error("Error in getSupplierProducts:", error);
    return [];
  }
};

const getPurchaseOrders = async (supplierId, dateFilter) => {
  if (!supplierId || supplierId === 'all') return [];
  try {
    const where = { supplierId };
    if (dateFilter) where.createdAt = dateFilter;

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true, phone: true } },
        items: { include: { rawMaterial: { select: { id: true, name: true, unit: true } } } },
        payments: { select: { amount: true, paymentDate: true, paymentMethod: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return orders.map(order => {
      const totalPaid = order.payments.reduce((s, p) => s + (p.amount || 0), 0);
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        date: order.createdAt,
        supplier: order.supplier?.name || 'Unknown',
        product: order.items.map(i => i.rawMaterial?.name || 'Unknown').join(', '),
        quantity: order.items.reduce((s, i) => s + i.quantity, 0),
        totalAmount: order.totalAmount || 0,
        totalPaid,
        outstanding: (order.totalAmount || 0) - totalPaid,
        status: order.status,
        paymentStatus: order.paymentStatus,
        expectedDeliveryDate: order.expectedDeliveryDate,
        items: order.items.map(i => ({ name: i.rawMaterial?.name || 'Unknown', quantity: i.quantity, unitPrice: i.unitPrice || 0, totalPrice: (i.unitPrice || 0) * i.quantity })),
        payments: order.payments,
      };
    });
  } catch (error) {
    console.error("Error in getPurchaseOrders:", error);
    return [];
  }
};

const getEmployeeDetails = async (whereClause, employeeId) => {
  if (!employeeId || employeeId === 'all') return null;
  
  try {
    const [topProducts, paymentCollections, employeeStats] = await Promise.all([
      getEmployeeTopProducts(whereClause, employeeId),
      getEmployeePaymentCollections(whereClause, employeeId),
      getEmployeeStats(whereClause, employeeId),
    ]);
    
    return { topProducts, paymentCollections, stats: employeeStats };
  } catch (error) {
    console.error("Error in getEmployeeDetails:", error);
    return { topProducts: [], paymentCollections: [], stats: null };
  }
};

const getEmployeeTopProducts = async (whereClause, employeeId) => {
  if (!employeeId || employeeId === 'all') return [];
  try {
    const itemWhere = { 
      salesOrder: { 
        createdById: employeeId,
      }
    };
    if (whereClause.createdAt) {
      itemWhere.salesOrder.createdAt = whereClause.createdAt;
    }
    if (whereClause.customerId) {
      itemWhere.salesOrder.customerId = whereClause.customerId;
    }

    const items = await prisma.salesOrderItem.groupBy({
      by: ["productId"],
      where: itemWhere,
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: 5,
    });

    if (!items.length) return [];
    const products = await prisma.product.findMany({
      where: { id: { in: items.map(i => i.productId) } },
      select: { id: true, name: true, unit: true },
    });
    const map = Object.fromEntries(products.map(p => [p.id, p]));

    return items.map(item => ({
      id: item.productId,
      name: map[item.productId]?.name || "Unknown",
      units: item._sum.quantity || 0,
      revenue: item._sum.totalPrice || 0,
      unit: map[item.productId]?.unit || "piece",
    }));
  } catch (error) {
    console.error("Error in getEmployeeTopProducts:", error);
    return [];
  }
};

const getEmployeePaymentCollections = async (whereClause, employeeId) => {
  if (!employeeId || employeeId === 'all') return [];
  try {
    const paymentWhere = {
      status: "COMPLETED",
      salesOrder: {
        createdById: employeeId,
      },
    };
    
    if (whereClause.createdAt) {
      paymentWhere.createdAt = whereClause.createdAt;
    }
    if (whereClause.customerId) {
      paymentWhere.salesOrder.customerId = whereClause.customerId;
    }

    const payments = await prisma.payment.groupBy({
      by: ["method"],
      where: paymentWhere,
      _sum: { amount: true },
    });
    
    return payments.map(p => ({
      name: p.method?.charAt(0).toUpperCase() + p.method?.slice(1).toLowerCase() || 'Unknown',
      value: p._sum.amount || 0,
    }));
  } catch (error) {
    console.error("Error in getEmployeePaymentCollections:", error);
    return [];
  }
};

const getEmployeeStats = async (whereClause, employeeId) => {
  if (!employeeId || employeeId === 'all') return null;
  try {
    const paymentWhere = {
      status: "COMPLETED",
      salesOrder: {
        createdById: employeeId,
      },
    };
    
    if (whereClause.createdAt) {
      paymentWhere.createdAt = whereClause.createdAt;
    }
    if (whereClause.customerId) {
      paymentWhere.salesOrder.customerId = whereClause.customerId;
    }
    
    const paymentResult = await prisma.payment.aggregate({
      where: paymentWhere,
      _sum: { amount: true },
    });
    
    const orderWhere = {
      createdById: employeeId,
    };
    if (whereClause.createdAt) {
      orderWhere.createdAt = whereClause.createdAt;
    }
    if (whereClause.customerId) {
      orderWhere.customerId = whereClause.customerId;
    }
    
    const orderCount = await prisma.salesOrder.count({
      where: orderWhere,
    });
    
    return {
      paymentsCollected: paymentResult._sum.amount || 0,
      ordersProcessed: orderCount,
    };
  } catch (error) {
    console.error("Error in getEmployeeStats:", error);
    return { paymentsCollected: 0, ordersProcessed: 0 };
  }
};

const getPaymentDetails = async (whereClause, paymentMethod, dateFilter) => {
  try {
    const [cashTrend, onlineTrend, creditTrend, supplierTrend, cashFlow] = await Promise.all([
      getPaymentMethodTrend(whereClause, dateFilter, 'CASH'),
      getPaymentMethodTrend(whereClause, dateFilter, 'ONLINE'),
      getPaymentMethodTrend(whereClause, dateFilter, 'CREDIT'),
      getSupplierPaymentTrend(dateFilter),
      getCashFlowSummary(whereClause),
    ]);
    return { cashTrend, onlineTrend, creditTrend, supplierTrend, cashFlow };
  } catch (error) {
    console.error("Error in getPaymentDetails:", error);
    return { cashTrend: [], onlineTrend: [], creditTrend: [], supplierTrend: [], cashFlow: { incoming: 0, outgoing: 0, net: 0 } };
  }
};

const getPaymentMethodTrend = async (whereClause, dateFilter, method) => {
  try {
    const paymentWhere = { method, status: "COMPLETED" };
    if (whereClause.createdAt) paymentWhere.createdAt = whereClause.createdAt;

    const payments = await prisma.payment.findMany({
      where: paymentWhere,
      select: { amount: true, createdAt: true },
    });

    const grouped = {};
    for (const payment of payments) {
      const month = payment.createdAt.toISOString().slice(0, 7);
      if (!grouped[month]) grouped[month] = { month, revenue: 0 };
      grouped[month].revenue += payment.amount || 0;
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result = [];
    const startDate = dateFilter?.gte || new Date(new Date().setMonth(new Date().getMonth() - 6));
    const endDate = dateFilter?.lte || new Date();

    for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
      const key = d.toISOString().slice(0, 7);
      result.push({ month: monthNames[d.getMonth()], revenue: grouped[key]?.revenue || 0 });
    }
    return result;
  } catch (error) {
    console.error("Error in getPaymentMethodTrend:", error);
    return [];
  }
};

const getSupplierPaymentTrend = async (dateFilter) => {
  try {
    const paymentWhere = {};
    if (dateFilter) paymentWhere.paymentDate = dateFilter;

    const payments = await prisma.purchaseOrderPayment.findMany({
      where: paymentWhere,
      select: { amount: true, paymentDate: true },
    });

    const grouped = {};
    for (const payment of payments) {
      const month = payment.paymentDate.toISOString().slice(0, 7);
      if (!grouped[month]) grouped[month] = { month, amount: 0 };
      grouped[month].amount += payment.amount || 0;
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result = [];
    const startDate = dateFilter?.gte || new Date(new Date().setMonth(new Date().getMonth() - 6));
    const endDate = dateFilter?.lte || new Date();

    for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
      const key = d.toISOString().slice(0, 7);
      result.push({ month: monthNames[d.getMonth()], amount: grouped[key]?.amount || 0 });
    }
    return result;
  } catch (error) {
    console.error("Error in getSupplierPaymentTrend:", error);
    return [];
  }
};

const getCashFlowSummary = async (whereClause) => {
  try {
    const incomingWhere = { status: "COMPLETED" };
    if (whereClause.createdAt) incomingWhere.createdAt = whereClause.createdAt;

    const [incoming, outgoing] = await Promise.all([
      prisma.payment.aggregate({ where: incomingWhere, _sum: { amount: true } }),
      prisma.purchaseOrderPayment.aggregate({ _sum: { amount: true } }).catch(() => ({ _sum: { amount: 0 } })),
    ]);

    const incomingAmount = incoming._sum.amount || 0;
    const outgoingAmount = outgoing._sum?.amount || 0;
    return { incoming: incomingAmount, outgoing: outgoingAmount, net: incomingAmount - outgoingAmount };
  } catch (error) {
    console.error("Error in getCashFlowSummary:", error);
    return { incoming: 0, outgoing: 0, net: 0 };
  }
};

// ==================== SUMMARY & UTILITY FUNCTIONS ====================

const buildSummary = ({ 
  revenueData, 
  ordersData, 
  inventoryData, 
  creditData, 
  customerData, 
  topProductsData, 
  context, 
  employeeId, 
  productId, 
  supplierId, 
  customerId, 
  paymentMethod,
  employeeData,
  customerDataDetailed,
}) => {
  const totalRevenue = revenueData.reduce((s, i) => s + i.revenue, 0);
  const growth = revenueData.length > 1 ? ((revenueData[revenueData.length - 1].revenue - revenueData[revenueData.length - 2].revenue) / (revenueData[revenueData.length - 2].revenue || 1)) * 100 : 0;

  const base = {
    totalRevenue,
    monthlyRevenue: revenueData[revenueData.length - 1]?.revenue || 0,
    netProfit: totalRevenue * 0.25,
    ordersCompleted: ordersData.completed || 0,
    ordersTotal: ordersData.total || 0,
    ordersPending: ordersData.pending || 0,
    ordersCancelled: ordersData.cancelled || 0,
    inventoryValue: inventoryData.totalValue || 0,
    creditOutstanding: creditData.totalRemaining || 0,
    activeCustomers: customerData.active || 0,
    totalCustomers: customerData.total || 0,
    topProduct: topProductsData[0]?.name || 'N/A',
    revenueGrowth: Math.round(growth * 10) / 10,
  };

  if (context === 'employee') {
    const employeeStats = employeeData?.stats || {};
    return { 
      ...base, 
      revenueGenerated: totalRevenue, 
      ordersProcessed: employeeStats.ordersProcessed || ordersData.total || 0, 
      customersServed: customerData.active || 0, 
      paymentsCollected: employeeStats.paymentsCollected || 0,
      averageOrderValue: ordersData.total > 0 ? totalRevenue / ordersData.total : 0 
    };
  }
  if (context === 'product') {
    const totalUnits = revenueData.reduce((s, i) => s + i.orders, 0);
    return { ...base, unitsSold: totalUnits, profitGenerated: totalRevenue * 0.25, remainingStock: inventoryData.totalProducts || 0, averageSellingPrice: totalUnits > 0 ? totalRevenue / totalUnits : 0 };
  }
  if (context === 'supplier') {
    return { ...base, purchaseValue: totalRevenue, purchaseCost: totalRevenue * 0.7, productsPurchased: revenueData.reduce((s, i) => s + i.orders, 0), pendingPayments: creditData.totalRemaining || 0, outstandingPayment: creditData.totalRemaining || 0, deliveryCount: ordersData.total || 0 };
  }
  if (context === 'customer') {
    const customerCreditRemaining = customerDataDetailed?.creditRemaining || creditData?.totalRemaining || 0;
    const customerTotalPaid = customerDataDetailed?.totalPaid || 0;
    return { 
      ...base, 
      totalPurchases: totalRevenue, 
      totalOrders: ordersData.total || 0, 
      orders: ordersData.total || 0, 
      creditRemaining: customerCreditRemaining,
      paymentsMade: customerTotalPaid,
      lastPurchase: customerDataDetailed?.orders?.[0]?.date || new Date().toISOString(), 
      favouriteProduct: topProductsData[0]?.name || 'N/A', 
      averageOrderValue: ordersData.total > 0 ? totalRevenue / ordersData.total : 0 
    };
  }
  if (context === 'payment') {
    return { ...base, totalCashIncome: paymentMethod === 'cash' ? totalRevenue : 0, totalOnlineIncome: paymentMethod === 'online' ? totalRevenue : 0, customerCreditRemaining: creditData.totalRemaining || 0, supplierOutstandingPayment: creditData.totalRemaining || 0 };
  }
  return base;
};

const buildPaymentMethods = (data, displayMode) => {
  const methods = [
    { name: 'Cash', value: data.cash || 0 },
    { name: 'Online', value: data.online || 0 },
    { name: 'Credit', value: data.credit || 0 },
    { name: 'Pay Later', value: data.pay_later || 0 },
  ].filter(p => p.value > 0);

  if (!methods.length) return [{ name: 'No Data', value: 1 }];

  if (displayMode === 'percentage') {
    const total = methods.reduce((s, m) => s + m.value, 0);
    return methods.map(m => ({ ...m, value: total > 0 ? (m.value / total) * 100 : 0 }));
  }
  return methods;
};

// ==================== ADDITIONAL EXPORTED FUNCTIONS ====================

export const getRevenueReport = async (req, res) => {
  try {
    const { dateRange = 'last30days', fromDate, toDate, employeeId, productId, supplierId, customerId, paymentMethod } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;
    const { dateFilter, groupBy } = buildDateFilterWithGrouping(dateRange, fromDate, toDate);
    const whereClause = buildWhereClause({ employeeId, productId, supplierId, customerId, paymentMethod, dateFilter, userRole, userId });
    const data = await getRevenueSummary(whereClause, dateFilter, groupBy, supplierId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTopProductsReport = async (req, res) => {
  try {
    const { limit = 10, sortBy = 'revenue', dateRange = 'last30days', fromDate, toDate, employeeId, supplierId, customerId, paymentMethod } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;
    const dateFilter = buildDateFilter(dateRange, fromDate, toDate);
    const whereClause = buildWhereClause({ employeeId, productId: null, supplierId, customerId, paymentMethod, dateFilter, userRole, userId });
    const data = await getTopProducts(whereClause, sortBy, Number(limit), null);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPaymentBreakdownReport = async (req, res) => {
  try {
    const { dateRange = 'last30days', fromDate, toDate, employeeId, productId, supplierId, customerId, paymentMethod } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;
    const dateFilter = buildDateFilter(dateRange, fromDate, toDate);
    const whereClause = buildWhereClause({ employeeId, productId, supplierId, customerId, paymentMethod, dateFilter, userRole, userId });
    const breakdown = await getPaymentBreakdown(whereClause, paymentMethod);
    const data = [
      { name: 'Cash', value: breakdown.cash || 0 },
      { name: 'Online', value: breakdown.online || 0 },
      { name: 'Credit', value: breakdown.credit || 0 },
      { name: 'Pay Later', value: breakdown.pay_later || 0 },
    ].filter(p => p.value > 0);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCreditSummaryReport = async (req, res) => {
  try {
    const { dateRange = 'last30days', fromDate, toDate, customerId } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;
    const dateFilter = buildDateFilter(dateRange, fromDate, toDate);
    const whereClause = buildWhereClause({ customerId, dateFilter, userRole, userId });
    const data = await getCreditSummary(whereClause);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getInventoryReport = async (req, res) => {
  try {
    const { supplierId, productId } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;
    const whereClause = buildWhereClause({ supplierId, productId, userRole, userId });
    const data = await getInventoryValue(whereClause);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportReport = async (req, res) => {
  try {
    const { format = 'csv', dateRange = 'last30days', fromDate, toDate, employeeId, productId, supplierId, customerId, paymentMethod, type = 'full' } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;
    const { dateFilter, groupBy } = buildDateFilterWithGrouping(dateRange, fromDate, toDate);
    const whereClause = buildWhereClause({ employeeId, productId, supplierId, customerId, paymentMethod, dateFilter, userRole, userId });

    let data = {};
    let filename = `report-${formatDate(new Date())}`;

    switch (type) {
      case 'revenue':
        data = await getRevenueSummary(whereClause, dateFilter, groupBy, supplierId);
        filename = `revenue-report-${formatDate(new Date())}`;
        break;
      case 'orders':
        const ordersResult = await getFilteredOrders(whereClause, productId, supplierId, customerId, employeeId, userRole, userId, 1, 1000);
        data = ordersResult.data;
        filename = `orders-report-${formatDate(new Date())}`;
        break;
      case 'products':
        data = await getTopProducts(whereClause, 'revenue', 20, productId);
        filename = `top-products-${formatDate(new Date())}`;
        break;
      case 'payments':
        data = await getPaymentBreakdown(whereClause, paymentMethod);
        filename = `payment-breakdown-${formatDate(new Date())}`;
        break;
      default:
        const [revenue, orders, credit, inventory, payments, products, customers, suppliers] = await Promise.all([
          getRevenueSummary(whereClause, dateFilter, groupBy, supplierId),
          getOrderStats(whereClause),
          getCreditSummary(whereClause),
          getInventoryValue(whereClause),
          getPaymentBreakdown(whereClause, paymentMethod),
          getTopProducts(whereClause, 'revenue', 10, productId),
          getActiveCustomers(whereClause),
          getTopSuppliers(whereClause)
        ]);
        data = { revenue, orders, credit, inventory, payments, products, customers, suppliers, filters: { employeeId, productId, supplierId, customerId, paymentMethod, dateRange }, generatedAt: new Date().toISOString() };
        filename = `full-report-${formatDate(new Date())}`;
    }

    const exportData = format === 'csv' ? convertToCSV(data) : JSON.stringify(data, null, 2);
    const contentType = format === 'csv' ? 'text/csv' : 'application/json';
    filename += format === 'csv' ? '.csv' : '.json';

    await logAction(req.user.id, "EXPORT_REPORT", "Report", null, { format, type });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exportData);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const convertToCSV = (data) => {
  if (Array.isArray(data) && data.length) {
    const headers = Object.keys(data[0]);
    return [headers.join(','), ...data.map(row => headers.map(h => {
      const val = row[h];
      if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) return `"${val.replace(/"/g, '""')}"`;
      return val;
    }).join(','))].join('\n');
  }
  return typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
};

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};