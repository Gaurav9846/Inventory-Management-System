// src/controllers/salesOrder.controller.js
import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";
import { generateOrderNumber } from "../utils/generateOrderNumber.js";

// GET /api/sales-orders/dashboard-stats
export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const currentUserId = req.user.id;
    const isStaff = req.user.role === "STAFF";

    // 1. Today's Orders
    const todayOrders = await prisma.salesOrder.count({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
        ...(isStaff && { createdById: currentUserId }),
      },
    });

    // 2. Today's Revenue (only DISPATCHED and COMPLETED)
    const todayRevenueResult = await prisma.salesOrder.aggregate({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
        status: {
          in: ["DISPATCHED", "COMPLETED"],
        },
        ...(isStaff && { createdById: currentUserId }),
      },
      _sum: {
        totalAmount: true,
      },
    });

    // 3. Pending Deliveries
    const pendingDeliveries = await prisma.delivery.count({
      where: {
        status: {
          in: ["PENDING", "IN_TRANSIT"],
        },
      },
    });

    // 4. Payment Breakdown for Today
    const paymentBreakdown = await prisma.payment.groupBy({
      by: ["method"],
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
        status: "COMPLETED",
      },
      _sum: {
        amount: true,
      },
    });

    const paymentMap = {
      CASH: 0,
      ONLINE: 0,
      CREDIT: 0,
      PAY_LATER: 0,
    };

    paymentBreakdown.forEach(p => {
      if (p.method === "CASH") paymentMap.CASH = p._sum.amount || 0;
      else if (p.method === "ONLINE") paymentMap.ONLINE = p._sum.amount || 0;
      else if (p.method === "CREDIT") paymentMap.CREDIT = p._sum.amount || 0;
      else if (p.method === "PAY_LATER") paymentMap.PAY_LATER = p._sum.amount || 0;
    });

    // 5. Credit Sales Total
    const creditSalesResult = await prisma.creditAccount.aggregate({
      _sum: {
        remainingBalance: true,
      },
    });

    // 6. Weekly Trend (Last 7 days)
    const weeklyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const orders = await prisma.salesOrder.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate,
          },
          ...(isStaff && { createdById: currentUserId }),
        },
      });

      const revenueResult = await prisma.salesOrder.aggregate({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate,
          },
          status: {
            in: ["DISPATCHED", "COMPLETED"],
          },
          ...(isStaff && { createdById: currentUserId }),
        },
        _sum: {
          totalAmount: true,
        },
      });

      weeklyTrend.push({
        date: date.toLocaleDateString("en-US", { weekday: "short" }),
        orders,
        revenue: revenueResult._sum.totalAmount || 0,
      });
    }

    res.json({
      todayOrders,
      todayRevenue: todayRevenueResult._sum.totalAmount || 0,
      pendingDeliveries,
      paymentBreakdown: paymentMap,
      creditSales: creditSalesResult._sum.remainingBalance || 0,
      weeklyTrend,
    });
  } catch (err) {
    console.error("Error in getDashboardStats:", err);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/sales-orders/recent
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
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        items: {
          take: 2,
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        payment: true,
        delivery: true,
      },
    });

    const formattedOrders = orders.map(order => ({
      orderId: order.orderNumber,
      customer: order.customer.name,
      phone: order.customer.phone,
      product: order.items[0]?.product.name || "N/A",
      qty: order.items.reduce((sum, item) => sum + item.quantity, 0),
      amount: order.totalAmount,
      payment: order.payment?.method || "N/A",
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

// GET /api/sales-orders - All orders
export const getAllSalesOrders = async (req, res) => {
  try {
    const { status, customerId, search, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const where = {
      ...(status && { status }),
      ...(customerId && { customerId }),
    };

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { customer: { phone: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true, address: true } },
          createdBy: { select: { id: true, name: true } },
          items: { 
            include: { 
              product: { select: { id: true, name: true, unit: true, sellingPrice: true } } 
            } 
          },
          delivery: { select: { status: true, deliveryDate: true, deliveredAt: true } },
          payment: { select: { status: true, method: true, amount: true } },
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
      pages: Math.ceil(total / Number(limit))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/sales-orders/staff - Staff only sees PENDING and PROCESSING
export const getStaffOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      status: {
        in: ["PENDING", "PROCESSING"],
      },
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
          payment: { select: { method: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
        take: Number(limit),
        skip,
      }),
      prisma.salesOrder.count({ where }),
    ]);

    res.json({ data: orders, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/sales-orders/:id
export const getSalesOrderById = async (req, res) => {
  try {
    const order = await prisma.salesOrder.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, unit: true, sellingPrice: true } } } },
        delivery: true,
        payment: true,
      },
    });
    if (!order) return res.status(404).json({ message: "Sales order not found." });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/sales-orders - UPDATED to prevent duplicate customers
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
      deliveryRequired, 
      paymentDetails 
    } = req.body;

    if ((!customerId && !customerName) || !items?.length) {
      return res.status(400).json({ message: "Customer and at least one item are required." });
    }

    // FIND OR CREATE CUSTOMER - Check by phone number first to prevent duplicates
    let customer;
    
    if (customerId) {
      // If customerId provided, use it
      customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) {
        return res.status(404).json({ message: "Customer not found with provided ID." });
      }
    } else {
      // Check if customer already exists by phone number (primary) or name
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          OR: [
            { phone: phoneNumber },
            { name: customerName }
          ]
        }
      });
      
      if (existingCustomer) {
        // Use existing customer instead of creating new one
        customer = existingCustomer;
        
        // Update customer info if needed (new address, etc.)
        const updateData = {};
        if (address && !customer.address) updateData.address = address;
        if (deliveryAddress && !customer.deliveryAddress) updateData.deliveryAddress = deliveryAddress;
        
        if (Object.keys(updateData).length > 0) {
          await prisma.customer.update({
            where: { id: customer.id },
            data: updateData
          });
        }
      } else {
        // Create new customer only if doesn't exist
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
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        return res.status(404).json({ message: `Product ${item.productId} not found.` });
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
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      totalAmount += (item.unitPrice || product.sellingPrice) * item.quantity;
    }

    // Create sales order
    const order = await prisma.salesOrder.create({
      data: {
        orderNumber: generateOrderNumber("SO"),
        customerId: customer.id,
        notes,
        totalAmount,
        createdById: req.user.id,
        status: "PENDING",
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: Number(item.quantity),
            unitPrice: item.unitPrice || null,
            totalPrice: (item.unitPrice || 0) * Number(item.quantity),
          })),
        },
      },
      include: { customer: true, items: { include: { product: true } } },
    });

    // Handle payment based on type
    if (paymentType === "CASH" || paymentType === "ONLINE") {
      await prisma.payment.create({
        data: {
          salesOrderId: order.id,
          method: paymentType,
          amount: totalAmount,
          status: "COMPLETED",
          verifiedAt: new Date(),
          khaltiTransactionId: paymentDetails?.transactionId || null,
        },
      });
    } else if (paymentType === "CREDIT") {
      await prisma.payment.create({
        data: {
          salesOrderId: order.id,
          method: "CREDIT",
          amount: totalAmount,
          status: "PENDING",
        },
      });

      let creditAccount = await prisma.creditAccount.findUnique({
        where: { customerId: customer.id },
      });

      if (creditAccount) {
        await prisma.creditAccount.update({
          where: { customerId: customer.id },
          data: {
            totalCredit: creditAccount.totalCredit + totalAmount,
            remainingBalance: creditAccount.remainingBalance + totalAmount,
            status: creditAccount.remainingBalance + totalAmount === 0 ? "PAID" : "PARTIAL",
          },
        });
      } else {
        await prisma.creditAccount.create({
          data: {
            customerId: customer.id,
            totalCredit: totalAmount,
            paidAmount: 0,
            remainingBalance: totalAmount,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: "PENDING",
          },
        });
      }

      await prisma.customer.update({
        where: { id: customer.id },
        data: { outstandingCredit: { increment: totalAmount } },
      });
    } else if (paymentType === "PAY_LATER") {
      await prisma.payment.create({
        data: {
          salesOrderId: order.id,
          method: "PAY_LATER",
          amount: totalAmount,
          status: "PENDING",
        },
      });
    }

    await logAction(req.user.id, "CREATE", "SalesOrder", order.id, { orderNumber: order.orderNumber });
    res.status(201).json(order);
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/sales-orders/:id/status
// Add this to your salesOrder.controller.js in the updateSalesOrderStatus function

export const updateSalesOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const staffAllowed = ["PROCESSING", "CANCELLED"];

    if (!staffAllowed.includes(status)) {
      return res.status(403).json({
        message: "Staff can only change status to PROCESSING or CANCELLED. Use delivery section for dispatch/complete.",
      });
    }

    const existing = await prisma.salesOrder.findUnique({
      where: { id: req.params.id },
      include: { 
        items: { include: { product: true } }, 
        delivery: true,
        payment: true,
      },
    });

    if (!existing) return res.status(404).json({ message: "Sales order not found." });

    let updatedOrder;

    if (status === "PROCESSING" && existing.status === "PENDING") {
      const delivery = await prisma.delivery.create({
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
      
    } else if (status === "CANCELLED") {
      // ✅ REVERSE CREDIT ACCOUNT IF ORDER WAS ON CREDIT
      if (existing.payment?.method === "CREDIT") {
        // Find credit account for this customer
        const creditAccount = await prisma.creditAccount.findUnique({
          where: { customerId: existing.customerId },
        });
        
        if (creditAccount) {
          // Reverse the credit amount
          const newTotalCredit = creditAccount.totalCredit - existing.totalAmount;
          const newRemainingBalance = creditAccount.remainingBalance - existing.totalAmount;
          
          if (newTotalCredit <= 0 || newRemainingBalance <= 0) {
            // Delete credit account if fully reversed
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
            // Update credit account with reversed amount
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
          
          // Update payment record to cancelled
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

      if (existing.delivery) {
        await prisma.delivery.update({
          where: { salesOrderId: existing.id },
          data: { status: "RETURNED" },
        });
      }
    } else {
      return res.status(400).json({ message: "Invalid status transition" });
    }

    await logAction(req.user.id, "UPDATE_STATUS", "SalesOrder", updatedOrder.id, { status });
    res.json(updatedOrder);
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/sales-orders/:id
export const deleteSalesOrder = async (req, res) => {
  try {
    const order = await prisma.salesOrder.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ message: "Sales order not found." });
    if (["DISPATCHED", "COMPLETED"].includes(order.status)) {
      return res.status(400).json({ message: "Cannot delete a dispatched or completed order." });
    }

    await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: req.params.id } });
    await prisma.salesOrder.delete({ where: { id: req.params.id } });
    await logAction(req.user.id, "DELETE", "SalesOrder", req.params.id);
    res.json({ message: "Sales order deleted." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};