// src/controllers/salesOrder.controller.js
import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";
import { generateOrderNumber } from "../utils/generateOrderNumber.js";
import { checkAndTriggerLowStockAlert } from "../utils/lowStockAlert.js";

// GET /api/sales-orders
export const getAllSalesOrders = async (req, res) => {
  try {
    const { status, customerId, page = 1, limit = 20 } = req.query;
    const skip  = (Number(page) - 1) * Number(limit);
    const where = {
      ...(status     && { status }),
      ...(customerId && { customerId }),
    };

    const [orders, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        include: {
          customer:  { select: { id: true, name: true, phone: true } },
          createdBy: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, unit: true } } } },
          delivery:  { select: { status: true, deliveryDate: true } },
          payment:   { select: { status: true, method: true, amount: true } },
        },
        orderBy: { createdAt: "desc" },
        take:    Number(limit),
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
      where:   { id: req.params.id },
      include: {
        customer:  true,
        createdBy: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, unit: true, sellingPrice: true } } } },
        delivery:  true,
        payment:   true,
      },
    });
    if (!order) return res.status(404).json({ message: "Sales order not found." });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/sales-orders
// body: { customerId, notes, items: [{ productId, quantity, unitPrice }] }
export const createSalesOrder = async (req, res) => {
  try {
    const { customerId, notes, items } = req.body;
    if (!customerId || !items?.length)
      return res.status(400).json({ message: "customerId and at least one item are required." });

    // Stock availability check
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product)
        return res.status(404).json({ message: `Product ${item.productId} not found.` });
      if (product.currentStock < Number(item.quantity))
        return res.status(400).json({
          message: `Insufficient stock for "${product.name}". Available: ${product.currentStock} ${product.unit}(s).`,
        });
    }

    const totalAmount = items.reduce((sum, i) => sum + (i.unitPrice || 0) * i.quantity, 0);

    const order = await prisma.salesOrder.create({
      data: {
        orderNumber: generateOrderNumber("SO"),
        customerId, notes, totalAmount,
        createdById: req.user.id,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity:  Number(i.quantity),
            unitPrice: i.unitPrice  ? Number(i.unitPrice)  : null,
            totalPrice: i.unitPrice ? Number(i.unitPrice) * Number(i.quantity) : null,
          })),
        },
      },
      include: {
        customer: true,
        items: { include: { product: { select: { id: true, name: true } } } },
      },
    });

    await logAction(req.user.id, "CREATE", "SalesOrder", order.id, { orderNumber: order.orderNumber });
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/sales-orders/:id/status
export const updateSalesOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ["PENDING", "PROCESSING", "DISPATCHED", "COMPLETED", "CANCELLED"];
    if (!valid.includes(status))
      return res.status(400).json({ message: `Status must be one of: ${valid.join(", ")}` });

    const existing = await prisma.salesOrder.findUnique({
      where:   { id: req.params.id },
      include: { items: { include: { product: true } } },
    });
    if (!existing) return res.status(404).json({ message: "Sales order not found." });

    // Auto stock-OUT on DISPATCHED
    if (status === "DISPATCHED" && existing.status !== "DISPATCHED") {
      for (const item of existing.items) {
        const { product } = item;
        if (product.currentStock < item.quantity)
          return res.status(400).json({ message: `Insufficient stock for "${product.name}" to dispatch.` });

        const newStock = product.currentStock - item.quantity;

        await prisma.$transaction([
          prisma.product.update({ where: { id: item.productId }, data: { currentStock: newStock } }),
          prisma.stockTransaction.create({
            data: {
              productId: item.productId, type: "OUT",
              quantity: item.quantity, previousStock: product.currentStock, newStock,
              note:   `Dispatched via SO ${existing.orderNumber}`,
              userId: req.user.id,
            },
          }),
        ]);

        await checkAndTriggerLowStockAlert({ ...product, currentStock: newStock });
      }
    }

    const order = await prisma.salesOrder.update({
      where: { id: req.params.id },
      data:  { status },
    });

    await logAction(req.user.id, "UPDATE_STATUS", "SalesOrder", order.id, { status });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/sales-orders/:id
export const deleteSalesOrder = async (req, res) => {
  try {
    const order = await prisma.salesOrder.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ message: "Sales order not found." });
    if (["DISPATCHED", "COMPLETED"].includes(order.status))
      return res.status(400).json({ message: "Cannot delete a dispatched or completed order." });

    await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: req.params.id } });
    await prisma.salesOrder.delete({ where: { id: req.params.id } });
    await logAction(req.user.id, "DELETE", "SalesOrder", req.params.id);
    res.json({ message: "Sales order deleted." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
