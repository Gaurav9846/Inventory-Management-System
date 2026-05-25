// src/controllers/delivery.controller.js
import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";

export const getAllDeliveries = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip  = (Number(page) - 1) * Number(limit);
    const where = { ...(status && { status }) };

    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        include: {
          salesOrder: {
            include: {
              customer: { select: { id: true, name: true, phone: true, deliveryAddress: true } },
              items: { include: { product: { select: { id: true, name: true, unit: true } } } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take:    Number(limit),
        skip,
      }),
      prisma.delivery.count({ where }),
    ]);

    res.json({ data: deliveries, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getDeliveryById = async (req, res) => {
  try {
    const delivery = await prisma.delivery.findUnique({
      where:   { id: req.params.id },
      include: {
        salesOrder: {
          include: { customer: true, items: { include: { product: true } } },
        },
      },
    });
    if (!delivery) return res.status(404).json({ message: "Delivery not found." });
    res.json(delivery);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createDelivery = async (req, res) => {
  try {
    const { salesOrderId, deliveryDate, notes } = req.body;
    if (!salesOrderId)
      return res.status(400).json({ message: "salesOrderId is required." });

    const existing = await prisma.delivery.findUnique({ where: { salesOrderId } });
    if (existing)
      return res.status(409).json({ message: "Delivery already exists for this order." });

    const salesOrder = await prisma.salesOrder.findUnique({ where: { id: salesOrderId } });
    if (!salesOrder) return res.status(404).json({ message: "Sales order not found." });

    const delivery = await prisma.delivery.create({
      data: {
        salesOrderId,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        notes,
      },
      include: { salesOrder: { include: { customer: true } } },
    });

    await logAction(req.user.id, "CREATE", "Delivery", delivery.id, { salesOrderId });
    res.status(201).json(delivery);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateDeliveryStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const valid = ["PENDING", "IN_TRANSIT", "DELIVERED", "RETURNED"];
    if (!valid.includes(status))
      return res.status(400).json({ message: `Status must be one of: ${valid.join(", ")}` });

    const delivery = await prisma.delivery.update({
      where: { id: req.params.id },
      data: {
        status,
        ...(notes !== undefined   && { notes }),
        ...(status === "DELIVERED" && { deliveredAt: new Date() }),
      },
    });

    // Sync sales order status
    if (status === "DELIVERED") {
      await prisma.salesOrder.update({ where: { id: delivery.salesOrderId }, data: { status: "COMPLETED" } });
    } else if (status === "IN_TRANSIT") {
      await prisma.salesOrder.update({ where: { id: delivery.salesOrderId }, data: { status: "DISPATCHED" } });
    }

    await logAction(req.user.id, "UPDATE_STATUS", "Delivery", delivery.id, { status });
    res.json(delivery);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Delivery not found." });
    res.status(500).json({ message: err.message });
  }
};
