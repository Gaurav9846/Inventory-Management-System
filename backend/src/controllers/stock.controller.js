// src/controllers/stock.controller.js
import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";
import { createNotification } from "./notification.controller.js";
import { checkAndTriggerLowStockAlert } from "../utils/lowStockAlert.js";

// GET /api/stock/transactions
export const getStockTransactions = async (req, res) => {
  try {
    const { productId, type, page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      ...(productId && { productId }),
      ...(type && { type }),
    };

    const [transactions, total] = await Promise.all([
      prisma.stockTransaction.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, unit: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: Number(limit),
        skip,
      }),
      prisma.stockTransaction.count({ where }),
    ]);

    res.json({ data: transactions, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/stock/in – goods receipt
export const stockIn = async (req, res) => {
  try {
    const { productId, quantity, note } = req.body;
    if (!productId || !quantity)
      return res.status(400).json({ message: "productId and quantity are required." });
    if (Number(quantity) <= 0)
      return res.status(400).json({ message: "Quantity must be a positive number." });

    const product = await prisma.product.findUnique({ 
      where: { id: productId },
      select: { id: true, name: true, unit: true, currentStock: true, reorderLevel: true }
    });
    if (!product) return res.status(404).json({ message: "Product not found." });

    const previousStock = product.currentStock;
    const newStock = previousStock + Number(quantity);

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

    await logAction({
      userId: req.user.id,
      action: "STOCK_IN",
      entity: "Product",
      entityId: productId,
      module: "Inventory",
      description: `Stock IN: ${quantity} ${product.unit}(s) of ${product.name}`,
      oldValues: { currentStock: previousStock },
      newValues: { currentStock: newStock },
      req,
    });

    await createNotification({
      title: `📦 Stock Added: ${product.name}`,
      message: `${quantity} ${product.unit}(s) of "${product.name}" added to stock. New stock: ${newStock} ${product.unit}(s).`,
      type: 'STOCK_ADJUSTMENT',
      priority: newStock === 0 ? 'CRITICAL' : (newStock <= product.reorderLevel ? 'WARNING' : 'INFORMATION'),
      referenceId: productId,
      referenceType: 'Product',
      actionUrl: `/inventory/products/${productId}`,
    });

    res.status(201).json({ transaction, currentStock: updatedProduct.currentStock });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/stock/out – goods dispatch
export const stockOut = async (req, res) => {
  try {
    const { productId, quantity, note } = req.body;
    if (!productId || !quantity)
      return res.status(400).json({ message: "productId and quantity are required." });
    if (Number(quantity) <= 0)
      return res.status(400).json({ message: "Quantity must be a positive number." });

    const product = await prisma.product.findUnique({ 
      where: { id: productId },
      select: { id: true, name: true, unit: true, currentStock: true, reorderLevel: true }
    });
    if (!product) return res.status(404).json({ message: "Product not found." });

    if (product.currentStock < Number(quantity)) {
      return res.status(400).json({
        message: `Insufficient stock. Available: ${product.currentStock} ${product.unit}(s).`,
      });
    }

    const previousStock = product.currentStock;
    const newStock = previousStock - Number(quantity);

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

    await logAction({
      userId: req.user.id,
      action: "STOCK_OUT",
      entity: "Product",
      entityId: productId,
      module: "Inventory",
      description: `Stock OUT: ${quantity} ${product.unit}(s) of ${product.name}`,
      oldValues: { currentStock: previousStock },
      newValues: { currentStock: newStock },
      req,
    });

    const isOutOfStock = newStock === 0;
    const isLowStock = newStock > 0 && newStock <= product.reorderLevel;
    let priority = 'INFORMATION';
    let statusText = 'Stock Removed';
    
    if (isOutOfStock) {
      priority = 'CRITICAL';
      statusText = '⚠️ OUT OF STOCK';
    } else if (isLowStock) {
      priority = 'WARNING';
      statusText = '⚠️ Low Stock';
    }

    await createNotification({
      title: `${isOutOfStock ? '🚫' : isLowStock ? '⚠️' : '📤'} ${statusText}: ${product.name}`,
      message: `${quantity} ${product.unit}(s) of "${product.name}" removed from stock. New stock: ${newStock} ${product.unit}(s).${isOutOfStock ? ' ⚠️ CRITICAL: Product is OUT OF STOCK!' : isLowStock ? ` ⚠️ Below reorder level (${product.reorderLevel} ${product.unit}(s)).` : ''}`,
      type: 'STOCK_ADJUSTMENT',
      priority: priority,
      referenceId: productId,
      referenceType: 'Product',
      actionUrl: `/inventory/products/${productId}`,
    });

    await checkAndTriggerLowStockAlert(updatedProduct);

    res.status(201).json({ transaction, currentStock: updatedProduct.currentStock });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/stock/adjust – manual physical-count correction
export const adjustStock = async (req, res) => {
  try {
    const { productId, newQuantity, note } = req.body;
    if (!productId || newQuantity === undefined)
      return res.status(400).json({ message: "productId and newQuantity are required." });
    if (Number(newQuantity) < 0)
      return res.status(400).json({ message: "Stock quantity cannot be negative." });

    const product = await prisma.product.findUnique({ 
      where: { id: productId },
      select: { id: true, name: true, unit: true, currentStock: true, reorderLevel: true }
    });
    if (!product) return res.status(404).json({ message: "Product not found." });

    const previousStock = product.currentStock;
    const diff = Number(newQuantity) - previousStock;

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

    await logAction({
      userId: req.user.id,
      action: "STOCK_ADJUST",
      entity: "Product",
      entityId: productId,
      module: "Inventory",
      description: `Stock adjustment: ${product.name} from ${previousStock} to ${newQuantity} ${product.unit}(s)`,
      oldValues: { currentStock: previousStock },
      newValues: { currentStock: Number(newQuantity) },
      req,
    });

    const adjustmentType = diff > 0 ? 'increased' : 'decreased';
    const isOutOfStock = Number(newQuantity) === 0;
    const isLowStock = Number(newQuantity) > 0 && Number(newQuantity) <= product.reorderLevel;
    let priority = 'INFORMATION';
    
    if (isOutOfStock) {
      priority = 'CRITICAL';
    } else if (isLowStock && diff < 0) {
      priority = 'WARNING';
    }

    await createNotification({
      title: `${isOutOfStock ? '🚫' : isLowStock ? '⚠️' : '⚖️'} Stock ${isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'Adjusted'}: ${product.name}`,
      message: `Stock for "${product.name}" ${adjustmentType} from ${previousStock} to ${newQuantity} ${product.unit}(s).${isOutOfStock ? ' ⚠️ CRITICAL: Product is OUT OF STOCK!' : isLowStock ? ` ⚠️ Below reorder level (${product.reorderLevel} ${product.unit}(s)).` : ''} Reason: ${note || 'Manual adjustment'}.`,
      type: 'STOCK_ADJUSTMENT',
      priority: priority,
      referenceId: productId,
      referenceType: 'Product',
      actionUrl: `/inventory/products/${productId}`,
    });

    if (diff < 0) {
      await checkAndTriggerLowStockAlert(updatedProduct);
    }

    res.status(201).json({ transaction, currentStock: updatedProduct.currentStock });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/stock/overview
export const getStockOverview = async (req, res) => {
  try {
    const [rawMaterials, finishedProducts] = await Promise.all([
      prisma.rawMaterial.findMany({
        select: { id: true, name: true, currentStock: true, reorderLevel: true, unit: true, category: true, sku: true }
      }),
      prisma.product.findMany({
        select: { 
          id: true, name: true, currentStock: true, reorderLevel: true, unit: true, 
          category: { select: { name: true } },
          sku: true
        } 
      })
    ]);

    const outOfStockProducts = finishedProducts.filter(p => p.currentStock === 0);
    const outOfStockRawMaterials = rawMaterials.filter(r => r.currentStock === 0);
    const lowStockProducts = finishedProducts.filter(p => p.currentStock > 0 && p.currentStock <= p.reorderLevel);
    const lowStockRawMaterials = rawMaterials.filter(r => r.currentStock > 0 && r.currentStock <= r.reorderLevel);

    const allItems = [
      ...rawMaterials.map(i => ({ currentStock: i.currentStock, reorderLevel: i.reorderLevel })),
      ...finishedProducts.map(i => ({ currentStock: i.currentStock, reorderLevel: i.reorderLevel }))
    ];

    const lowStockCount = allItems.filter(i => i.currentStock > 0 && i.currentStock <= i.reorderLevel).length;
    const outOfStockCount = allItems.filter(i => i.currentStock === 0).length;

    const outOfStockItems = [
      ...outOfStockProducts.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        type: 'PRODUCT',
        category: p.category?.name || 'Uncategorized',
        currentStock: p.currentStock,
        reorderLevel: p.reorderLevel
      })),
      ...outOfStockRawMaterials.map(r => ({
        id: r.id,
        name: r.name,
        sku: r.sku,
        unit: r.unit,
        type: 'RAW_MATERIAL',
        category: r.category || 'Uncategorized',
        currentStock: r.currentStock,
        reorderLevel: r.reorderLevel
      }))
    ];

    const lowStockItems = [
      ...lowStockProducts.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        type: 'PRODUCT',
        category: p.category?.name || 'Uncategorized',
        currentStock: p.currentStock,
        reorderLevel: p.reorderLevel
      })),
      ...lowStockRawMaterials.map(r => ({
        id: r.id,
        name: r.name,
        sku: r.sku,
        unit: r.unit,
        type: 'RAW_MATERIAL',
        category: r.category || 'Uncategorized',
        currentStock: r.currentStock,
        reorderLevel: r.reorderLevel
      }))
    ];

    res.json({
      totalRawMaterials: {
        items: rawMaterials.length,
        quantity: rawMaterials.reduce((sum, i) => sum + i.currentStock, 0)
      },
      totalFinishedProducts: {
        items: finishedProducts.length,
        quantity: finishedProducts.reduce((sum, i) => sum + i.currentStock, 0)
      },
      lowStockCount: lowStockCount,
      outOfStockCount: outOfStockCount,
      outOfStockItems: outOfStockItems,
      lowStockItems: lowStockItems,
      totalItems: allItems.length,
      totalQuantity: allItems.reduce((sum, i) => sum + i.currentStock, 0)
    });
  } catch (err) {
    console.error('Error in getStockOverview:', err);
    res.status(500).json({ message: err.message });
  }
};