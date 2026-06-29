// src/controllers/delivery.controller.js
import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";

// GET /api/deliveries
export const getAllDeliveries = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = { ...(status && { status }) };

    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        include: {
          salesOrder: {
            include: {
              customer: { select: { id: true, name: true, phone: true, address: true, deliveryAddress: true } },
              items: { include: { product: { select: { id: true, name: true, unit: true } } } },
              payment: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: Number(limit),
        skip,
      }),
      prisma.delivery.count({ where }),
    ]);

    res.json({ data: deliveries, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/deliveries/kanban - For Kanban board view
export const getDeliveriesKanban = async (req, res) => {
  try {
    const deliveries = await prisma.delivery.findMany({
      where: {
        salesOrder: {
          status: {
            notIn: ["CANCELLED", "PENDING"],
          },
        },
      },
      include: {
        salesOrder: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
                address: true,
                deliveryAddress: true,
              },
            },
            items: {
              include: {
                product: { select: { id: true, name: true, unit: true, sellingPrice: true } },
              },
            },
            payment: { select: { method: true, status: true, amount: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const kanbanData = {
      PENDING: deliveries.filter(d => d.status === "PENDING"),
      IN_TRANSIT: deliveries.filter(d => d.status === "IN_TRANSIT"),
      DELIVERED: deliveries.filter(d => d.status === "DELIVERED"),
      RETURNED: deliveries.filter(d => d.status === "RETURNED"),
    };

    res.json(kanbanData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/deliveries/:id
export const getDeliveryById = async (req, res) => {
  try {
    const delivery = await prisma.delivery.findUnique({
      where: { id: req.params.id },
      include: {
        salesOrder: {
          include: {
            customer: true,
            items: { include: { product: true } },
          },
        },
      },
    });
    if (!delivery) return res.status(404).json({ message: "Delivery not found." });
    res.json(delivery);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/deliveries
export const createDelivery = async (req, res) => {
  try {
    const { salesOrderId, deliveryDate, notes } = req.body;
    if (!salesOrderId) {
      return res.status(400).json({ message: "salesOrderId is required." });
    }

    const existing = await prisma.delivery.findUnique({ where: { salesOrderId } });
    if (existing) {
      return res.status(409).json({ message: "Delivery already exists for this order." });
    }

    const salesOrder = await prisma.salesOrder.findUnique({ where: { id: salesOrderId } });
    if (!salesOrder) return res.status(404).json({ message: "Sales order not found." });

    const delivery = await prisma.delivery.create({
      data: {
        salesOrderId,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        notes,
        status: "PENDING",
      },
      include: { salesOrder: { include: { customer: true } } },
    });

    await logAction(req.user.id, "CREATE", "Delivery", delivery.id, { salesOrderId });
    res.status(201).json(delivery);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/deliveries/:id/status - Delivery staff updates status
export const updateDeliveryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ["IN_TRANSIT", "DELIVERED", "RETURNED"];

    if (!valid.includes(status)) {
      return res.status(400).json({
        message: `Status must be one of: ${valid.join(", ")}`,
      });
    }

    const delivery = await prisma.delivery.findUnique({
      where: { id: req.params.id },
      include: {
        salesOrder: {
          include: {
            items: { include: { product: true } },
            payment: true,
          },
        },
      },
    });

    if (!delivery) return res.status(404).json({ message: "Delivery not found." });

    let updatedDelivery;
    let updatedOrder;

    // When status changes to IN_TRANSIT - DEDUCT STOCK
    if (status === "IN_TRANSIT" && delivery.status === "PENDING") {
      // Deduct stock for all items
      for (const item of delivery.salesOrder.items) {
        const product = item.product;
        const newStock = product.currentStock - item.quantity;

        await prisma.$transaction([
          prisma.product.update({
            where: { id: item.productId },
            data: { currentStock: newStock },
          }),
          prisma.stockTransaction.create({
            data: {
              productId: item.productId,
              type: "OUT",
              quantity: item.quantity,
              previousStock: product.currentStock,
              newStock: newStock,
              note: `Dispatched with delivery for order ${delivery.salesOrder.orderNumber}`,
              userId: req.user.id,
            },
          }),
        ]);
      }

      updatedDelivery = await prisma.delivery.update({
        where: { id: req.params.id },
        data: {
          status: "IN_TRANSIT",
          deliveryDate: new Date(),
        },
      });

      updatedOrder = await prisma.salesOrder.update({
        where: { id: delivery.salesOrderId },
        data: { status: "DISPATCHED" },
      });
    }
    // When status changes to DELIVERED - COMPLETE ORDER
    else if (status === "DELIVERED" && delivery.status === "IN_TRANSIT") {
      updatedDelivery = await prisma.delivery.update({
        where: { id: req.params.id },
        data: {
          status: "DELIVERED",
          deliveredAt: new Date(),
        },
      });

      updatedOrder = await prisma.salesOrder.update({
        where: { id: delivery.salesOrderId },
        data: { status: "COMPLETED" },
      });

      // If payment was CREDIT, mark as completed
      if (
        delivery.salesOrder.payment?.method === "CREDIT" &&
        delivery.salesOrder.payment?.status === "PENDING"
      ) {
        await prisma.payment.update({
          where: { salesOrderId: delivery.salesOrderId },
          data: { status: "COMPLETED", verifiedAt: new Date() },
        });
      }
    }
    // Handle RETURNED
    else if (status === "RETURNED") {
      updatedDelivery = await prisma.delivery.update({
        where: { id: req.params.id },
        data: { status: "RETURNED" },
      });

      updatedOrder = await prisma.salesOrder.update({
        where: { id: delivery.salesOrderId },
        data: { status: "CANCELLED" },
      });

      // Restore stock if it was deducted
      if (delivery.status === "IN_TRANSIT") {
        for (const item of delivery.salesOrder.items) {
          const product = item.product;
          const newStock = product.currentStock + item.quantity;

          await prisma.$transaction([
            prisma.product.update({
              where: { id: item.productId },
              data: { currentStock: newStock },
            }),
            prisma.stockTransaction.create({
              data: {
                productId: item.productId,
                type: "IN",
                quantity: item.quantity,
                previousStock: product.currentStock,
                newStock: newStock,
                note: `Stock restored from returned delivery for order ${delivery.salesOrder.orderNumber}`,
                userId: req.user.id,
              },
            }),
          ]);
        }
      }
    } else {
      updatedDelivery = await prisma.delivery.update({
        where: { id: req.params.id },
        data: { status },
      });
    }

    await logAction(req.user.id, "UPDATE_STATUS", "Delivery", updatedDelivery.id, { status });
    res.json({ delivery: updatedDelivery, order: updatedOrder });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/deliveries/history
export const getOrderHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, customer, orderStatus, paymentMethod } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};

    if (customer) {
      where.customer = {
        name: { contains: customer, mode: "insensitive" },
      };
    }

    if (orderStatus && orderStatus !== "all") {
      where.status = orderStatus;
    }

    if (paymentMethod && paymentMethod !== "all") {
      where.payment = {
        method: paymentMethod,
      };
    }

    const [orders, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        include: {
          customer: true,
          items: { include: { product: true } },
          payment: true,
          delivery: true,
        },
        orderBy: { createdAt: "desc" },
        take: Number(limit),
        skip,
      }),
      prisma.salesOrder.count({ where }),
    ]);

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

    res.json({
      data: formattedOrders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};