// src/controllers/purchaseOrder.controller.js
import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";
import { generateOrderNumber } from "../utils/generateOrderNumber.js";
import { sendEmail } from "../config/nodemailer.js";
import { purchaseOrderTemplate } from "../utils/emailTemplates.js";

// GET /api/purchase-orders
export const getAllPurchaseOrders = async (req, res) => {
  try {
    const { status, supplierId, page = 1, limit = 20 } = req.query;
    const skip  = (Number(page) - 1) * Number(limit);
    const where = {
      ...(status     && { status }),
      ...(supplierId && { supplierId }),
    };

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier:  { select: { id: true, name: true, phone: true } },
          createdBy: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, unit: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take:    Number(limit),
        skip,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    res.json({ data: orders, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/purchase-orders/:id
export const getPurchaseOrderById = async (req, res) => {
  try {
    const order = await prisma.purchaseOrder.findUnique({
      where:   { id: req.params.id },
      include: {
        supplier:  true,
        createdBy: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, unit: true, currentStock: true } } } },
      },
    });
    if (!order) return res.status(404).json({ message: "Purchase order not found." });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/purchase-orders
// body: { supplierId, notes, items: [{ productId, quantity, unitPrice }] }
export const createPurchaseOrder = async (req, res) => {
  try {
    const { supplierId, notes, items } = req.body;
    if (!supplierId || !items?.length)
      return res.status(400).json({ message: "supplierId and at least one item are required." });

    const totalAmount = items.reduce((sum, i) => sum + (i.unitPrice || 0) * i.quantity, 0);

    const order = await prisma.purchaseOrder.create({
      data: {
        orderNumber: generateOrderNumber("PO"),
        supplierId, notes, totalAmount,
        createdById: req.user.id,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity:  Number(i.quantity),
            unitPrice: i.unitPrice ? Number(i.unitPrice) : null,
          })),
        },
      },
      include: {
        supplier: true,
        items: { include: { product: { select: { id: true, name: true } } } },
      },
    });

    await logAction(req.user.id, "CREATE", "PurchaseOrder", order.id, { orderNumber: order.orderNumber });

    if (order.supplier.email) {
      await sendEmail(
        order.supplier.email,
        `Purchase Order – ${order.orderNumber}`,
        purchaseOrderTemplate(order)
      );
    }

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/purchase-orders/:id/status
export const updatePurchaseOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ["PENDING", "APPROVED", "RECEIVED", "CANCELLED"];
    if (!valid.includes(status))
      return res.status(400).json({ message: `Status must be one of: ${valid.join(", ")}` });

    const order = await prisma.purchaseOrder.update({
      where:   { id: req.params.id },
      data:    { status },
      include: { items: { include: { product: true } } },
    });

    // Auto stock-IN when marked RECEIVED
    if (status === "RECEIVED") {
      for (const item of order.items) {
        const prev     = item.product.currentStock;
        const newStock = prev + item.quantity;

        await prisma.$transaction([
          prisma.product.update({ where: { id: item.productId }, data: { currentStock: newStock } }),
          prisma.stockTransaction.create({
            data: {
              productId: item.productId, type: "IN",
              quantity: item.quantity, previousStock: prev, newStock,
              note:    `Received via PO ${order.orderNumber}`,
              userId:  req.user.id,
            },
          }),
          prisma.purchaseOrderItem.update({ where: { id: item.id }, data: { receivedQty: item.quantity } }),
        ]);
      }
    }

    await logAction(req.user.id, "UPDATE_STATUS", "PurchaseOrder", order.id, { status });
    res.json(order);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Purchase order not found." });
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/purchase-orders/:id
export const deletePurchaseOrder = async (req, res) => {
  try {
    const order = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ message: "Purchase order not found." });
    if (order.status === "RECEIVED")
      return res.status(400).json({ message: "Cannot delete a received purchase order." });

    await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: req.params.id } });
    await prisma.purchaseOrder.delete({ where: { id: req.params.id } });
    await logAction(req.user.id, "DELETE", "PurchaseOrder", req.params.id);
    res.json({ message: "Purchase order deleted." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
