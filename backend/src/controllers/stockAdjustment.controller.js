// src/controllers/stockAdjustment.controller.js
import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";
import { generateOrderNumber } from "../utils/generateOrderNumber.js";

// Predefined reasons (should match frontend)
const VALID_REASONS = [
  "Damaged Inventory",
  "Production Wastage",
  "Quality Control Rejection",
  "Physical Count Mismatch",
  "Stock Audit Correction",
  "Wrong Stock Entry",
  "Supplier Quantity Shortage",
  "Supplier Quantity Excess",
  "Returned Goods",
  "Expired Products",
  "Theft/Shrinkage",
  "Lost Inventory",
  "Other"
];

// ==================== HELPER FUNCTIONS ====================

const getItemType = async (productId) => {
  // Check if product exists in Product table (finished goods)
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true }
  });
  
  if (product) {
    return { type: "PRODUCT", item: product };
  }
  
  // Check if it's a raw material
  const rawMaterial = await prisma.rawMaterial.findUnique({
    where: { id: productId },
    select: { id: true }
  });
  
  if (rawMaterial) {
    return { type: "RAW_MATERIAL", item: rawMaterial };
  }
  
  return null;
};

const getCurrentStock = async (productId, itemType) => {
  if (itemType === "PRODUCT") {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { currentStock: true, name: true, unit: true }
    });
    return product;
  } else {
    const rawMaterial = await prisma.rawMaterial.findUnique({
      where: { id: productId },
      select: { currentStock: true, name: true, unit: true }
    });
    return rawMaterial;
  }
};

const updateStock = async (tx, productId, itemType, newStock) => {
  if (itemType === "PRODUCT") {
    return await tx.product.update({
      where: { id: productId },
      data: { currentStock: newStock }
    });
  } else {
    return await tx.rawMaterial.update({
      where: { id: productId },
      data: { currentStock: newStock }
    });
  }
};

// ==================== STAFF FUNCTIONS ====================

// GET /api/stock-adjustments/my-requests
export const getMyAdjustmentRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const where = {
      requestedById: req.user.id,
      ...(status && { status: status.toUpperCase() }),
    };

    const [requests, total] = await Promise.all([
      prisma.stockAdjustment.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              unit: true,
              currentStock: true,
              category: { select: { name: true } }
            },
          },
          requestedBy: {
            select: { id: true, name: true, email: true },
          },
          approvedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: Number(limit),
        skip,
      }),
      prisma.stockAdjustment.count({ where }),
    ]);

    // Transform to include item type info
    const formattedRequests = requests.map(req => ({
      id: req.id,
      requestNumber: req.requestNumber,
      product: {
        ...req.product,
        itemType: req.itemType,
      },
      adjustmentType: req.adjustmentType,
      currentStock: req.currentStock,
      requestedQuantity: req.requestedQuantity,
      newStock: req.newStock,
      reason: req.reason,
      status: req.status,
      requestedBy: req.requestedBy,
      approvedBy: req.approvedBy,
      rejectionReason: req.rejectionReason,
      createdAt: req.createdAt,
      approvedAt: req.approvedAt,
    }));

    res.json({
      data: formattedRequests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// POST /api/stock-adjustments/request
export const createAdjustmentRequest = async (req, res) => {
  try {
    const {
      productId,
      adjustmentType,
      requestedQuantity,
      reason,
    } = req.body;

    // Validation
    if (!productId) {
      return res.status(400).json({ message: "Product is required" });
    }
    if (!requestedQuantity || requestedQuantity === 0) {
      return res.status(400).json({ message: "Quantity is required and cannot be zero" });
    }
    if (!reason) {
      return res.status(400).json({ message: "Reason is required" });
    }
    
    // Validate reason is from predefined list
    if (!VALID_REASONS.includes(reason)) {
      return res.status(400).json({ message: "Invalid reason selected" });
    }

    // Determine if product is raw material or finished product
    const itemInfo = await getItemType(productId);
    if (!itemInfo) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Get current stock
    const stockInfo = await getCurrentStock(productId, itemInfo.type);
    if (!stockInfo) {
      return res.status(404).json({ message: "Product not found" });
    }

    const currentStock = stockInfo.currentStock;
    const requestedQty = Number(requestedQuantity);
    const newStock = currentStock + requestedQty;

    // Validate
    if (newStock < 0) {
      return res.status(400).json({ 
        message: `Cannot adjust stock below zero. Current stock: ${currentStock}, Requested change: ${requestedQty}` 
      });
    }

    // Create adjustment request
    const adjustment = await prisma.stockAdjustment.create({
      data: {
        requestNumber: generateOrderNumber("ADJ"),
        productId,
        itemType: itemInfo.type,
        adjustmentType,
        currentStock,
        requestedQuantity: requestedQty,
        newStock,
        reason,
        requestedById: req.user.id,
        status: "PENDING",
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
          },
        },
        requestedBy: {
          select: { id: true, name: true },
        },
      },
    });

    await logAction(req.user.id, "CREATE", "StockAdjustment", adjustment.id, {
      productId,
      itemType: itemInfo.type,
      requestedQuantity,
      reason,
    });

    res.status(201).json({
      success: true,
      message: "Stock adjustment request submitted successfully",
      data: adjustment,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/stock-adjustments/:id
export const getAdjustmentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const adjustment = await prisma.stockAdjustment.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
            currentStock: true,
            sellingPrice: true,
          },
        },
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!adjustment) {
      return res.status(404).json({ message: "Adjustment request not found" });
    }

    res.json(adjustment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ==================== MANAGER FUNCTIONS ====================

// GET /api/stock-adjustments/pending
export const getPendingAdjustments = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = { status: "PENDING" };

    const [requests, total] = await Promise.all([
      prisma.stockAdjustment.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              unit: true,
              currentStock: true,
              category: { select: { name: true } }
            },
          },
          requestedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "asc" },
        take: Number(limit),
        skip,
      }),
      prisma.stockAdjustment.count({ where }),
    ]);

    // Transform to include item type
    const formattedRequests = requests.map(req => ({
      id: req.id,
      requestNumber: req.requestNumber,
      product: {
        ...req.product,
        itemType: req.itemType,
      },
      adjustmentType: req.adjustmentType,
      currentStock: req.currentStock,
      requestedQuantity: req.requestedQuantity,
      newStock: req.newStock,
      reason: req.reason,
      status: req.status,
      requestedBy: req.requestedBy,
      createdAt: req.createdAt,
    }));

    res.json({
      data: formattedRequests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/stock-adjustments/all
export const getAllAdjustments = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const where = {
      ...(status && { status: status.toUpperCase() }),
      ...(type && { adjustmentType: type.toUpperCase() }),
    };

    const [requests, total] = await Promise.all([
      prisma.stockAdjustment.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              unit: true,
              category: { select: { name: true } }
            },
          },
          requestedBy: {
            select: { id: true, name: true, email: true },
          },
          approvedBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: Number(limit),
        skip,
      }),
      prisma.stockAdjustment.count({ where }),
    ]);

    const formattedRequests = requests.map(req => ({
      id: req.id,
      requestNumber: req.requestNumber,
      product: {
        ...req.product,
        itemType: req.itemType,
      },
      adjustmentType: req.adjustmentType,
      currentStock: req.currentStock,
      requestedQuantity: req.requestedQuantity,
      newStock: req.newStock,
      reason: req.reason,
      status: req.status,
      requestedBy: req.requestedBy,
      approvedBy: req.approvedBy,
      rejectionReason: req.rejectionReason,
      createdAt: req.createdAt,
      approvedAt: req.approvedAt,
    }));

    res.json({
      data: formattedRequests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/stock-adjustments/:id/approve
export const approveAdjustment = async (req, res) => {
  try {
    const { id } = req.params;

    const adjustment = await prisma.stockAdjustment.findUnique({
      where: { id },
    });

    if (!adjustment) {
      return res.status(404).json({ message: "Adjustment request not found" });
    }

    if (adjustment.status !== "PENDING") {
      return res.status(400).json({ 
        message: `Cannot approve request with status: ${adjustment.status}` 
      });
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update product/raw material stock based on itemType
      const updatedItem = await updateStock(tx, adjustment.productId, adjustment.itemType, adjustment.newStock);

      // Create stock transaction record
      const stockTransaction = await tx.stockTransaction.create({
        data: {
          productId: adjustment.itemType === "PRODUCT" ? adjustment.productId : null,
          rawMaterialId: adjustment.itemType === "RAW_MATERIAL" ? adjustment.productId : null,
          type: adjustment.requestedQuantity > 0 ? "IN" : "OUT",
          quantity: Math.abs(adjustment.requestedQuantity),
          previousStock: adjustment.currentStock,
          newStock: adjustment.newStock,
          note: `Stock adjustment approved: ${adjustment.reason}. Request #${adjustment.requestNumber}`,
          userId: req.user.id,
        },
      });

      // Update adjustment request
      const updatedAdjustment = await tx.stockAdjustment.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedById: req.user.id,
          approvedAt: new Date(),
        },
      });

      return { updatedAdjustment, updatedItem, stockTransaction };
    });

    await logAction(req.user.id, "APPROVE", "StockAdjustment", id, {
      productId: adjustment.productId,
      itemType: adjustment.itemType,
      requestedQuantity: adjustment.requestedQuantity,
      newStock: adjustment.newStock,
    });

    res.json({
      success: true,
      message: "Stock adjustment approved and stock updated",
      data: result.updatedAdjustment,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/stock-adjustments/:id/reject
export const rejectAdjustment = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    const adjustment = await prisma.stockAdjustment.findUnique({
      where: { id },
    });

    if (!adjustment) {
      return res.status(404).json({ message: "Adjustment request not found" });
    }

    if (adjustment.status !== "PENDING") {
      return res.status(400).json({ 
        message: `Cannot reject request with status: ${adjustment.status}` 
      });
    }

    const updatedAdjustment = await prisma.stockAdjustment.update({
      where: { id },
      data: {
        status: "REJECTED",
        approvedById: req.user.id,
        approvedAt: new Date(),
        rejectionReason,
      },
    });

    await logAction(req.user.id, "REJECT", "StockAdjustment", id, {
      rejectionReason,
    });

    res.json({
      success: true,
      message: "Stock adjustment request rejected",
      data: updatedAdjustment,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/stock-adjustments/stats
export const getAdjustmentStats = async (req, res) => {
  try {
    const [pending, approved, rejected] = await Promise.all([
      prisma.stockAdjustment.count({ where: { status: "PENDING" } }),
      prisma.stockAdjustment.count({ where: { status: "APPROVED" } }),
      prisma.stockAdjustment.count({ where: { status: "REJECTED" } }),
    ]);

    const recentRequests = await prisma.stockAdjustment.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { name: true } },
        requestedBy: { select: { name: true } },
      },
    });

    const totalAdjusted = await prisma.stockAdjustment.aggregate({
      where: { status: "APPROVED" },
      _sum: { requestedQuantity: true },
    });

    res.json({
      pending,
      approved,
      rejected,
      totalRequests: pending + approved + rejected,
      totalAdjusted: totalAdjusted._sum.requestedQuantity || 0,
      recentRequests,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};