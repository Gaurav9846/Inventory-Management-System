// src/controllers/stock.controller.js
import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";
import { checkAndTriggerLowStockAlert } from "../utils/lowStockAlert.js";

// GET /api/stock/transactions
export const getStockTransactions = async (req, res) => {
  try {
    const { productId, type, page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      ...(productId && { productId }),
      ...(type      && { type }),
    };

    const [transactions, total] = await Promise.all([
      prisma.stockTransaction.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, unit: true } },
          user:    { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take:    Number(limit),
        skip,
      }),
      prisma.stockTransaction.count({ where }),
    ]);

    res.json({ data: transactions, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/stock/in  – goods receipt
export const stockIn = async (req, res) => {
  try {
    const { productId, quantity, note } = req.body;
    if (!productId || !quantity)
      return res.status(400).json({ message: "productId and quantity are required." });
    if (Number(quantity) <= 0)
      return res.status(400).json({ message: "Quantity must be a positive number." });

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ message: "Product not found." });

    const previousStock = product.currentStock;
    const newStock      = previousStock + Number(quantity);

    const [updatedProduct, transaction] = await prisma.$transaction([
      prisma.product.update({ where: { id: productId }, data: { currentStock: newStock } }),
      prisma.stockTransaction.create({
        data: {
          productId, type: "IN",
          quantity: Number(quantity), previousStock, newStock,
          note, userId: req.user.id,
        },
      }),
    ]);

    await logAction(req.user.id, "STOCK_IN", "StockTransaction", transaction.id, { productId, quantity, newStock });
    res.status(201).json({ transaction, currentStock: updatedProduct.currentStock });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/stock/out  – goods dispatch (FIFO)
export const stockOut = async (req, res) => {
  try {
    const { productId, quantity, note } = req.body;
    if (!productId || !quantity)
      return res.status(400).json({ message: "productId and quantity are required." });
    if (Number(quantity) <= 0)
      return res.status(400).json({ message: "Quantity must be a positive number." });

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ message: "Product not found." });

    if (product.currentStock < Number(quantity)) {
      return res.status(400).json({
        message: `Insufficient stock. Available: ${product.currentStock} ${product.unit}(s).`,
      });
    }

    const previousStock = product.currentStock;
    const newStock      = previousStock - Number(quantity);

    const [updatedProduct, transaction] = await prisma.$transaction([
      prisma.product.update({ where: { id: productId }, data: { currentStock: newStock } }),
      prisma.stockTransaction.create({
        data: {
          productId, type: "OUT",
          quantity: Number(quantity), previousStock, newStock,
          note, userId: req.user.id,
        },
      }),
    ]);

    await logAction(req.user.id, "STOCK_OUT", "StockTransaction", transaction.id, { productId, quantity, newStock });
    await checkAndTriggerLowStockAlert(updatedProduct);

    res.status(201).json({ transaction, currentStock: updatedProduct.currentStock });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/stock/adjust  – manual physical-count correction
export const adjustStock = async (req, res) => {
  try {
    const { productId, newQuantity, note } = req.body;
    if (!productId || newQuantity === undefined)
      return res.status(400).json({ message: "productId and newQuantity are required." });
    if (Number(newQuantity) < 0)
      return res.status(400).json({ message: "Stock quantity cannot be negative." });

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ message: "Product not found." });

    const previousStock = product.currentStock;
    const diff          = Number(newQuantity) - previousStock;

    const [updatedProduct, transaction] = await prisma.$transaction([
      prisma.product.update({ where: { id: productId }, data: { currentStock: Number(newQuantity) } }),
      prisma.stockTransaction.create({
        data: {
          productId, type: "ADJUSTMENT",
          quantity: Math.abs(diff), previousStock, newStock: Number(newQuantity),
          note: note || `Manual adjustment (${diff >= 0 ? "+" : ""}${diff})`,
          userId: req.user.id,
        },
      }),
    ]);

    await logAction(req.user.id, "STOCK_ADJUST", "StockTransaction", transaction.id, { productId, previousStock, newQuantity });

    if (diff < 0) await checkAndTriggerLowStockAlert(updatedProduct);

    res.status(201).json({ transaction, currentStock: updatedProduct.currentStock });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
