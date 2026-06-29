// src/controllers/rawMaterial.controller.js
import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";

// ==================== GET ALL RAW MATERIALS ====================
export const getAllRawMaterials = async (req, res) => {
  try {
    const { search, category, supplierId, lowStock, page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(category && { category: { name: category } }), // Changed to filter by category name
      ...(supplierId && { supplierId }),
      ...(lowStock === "true" && { currentStock: { lte: prisma.rawMaterial.fields.reorderLevel } }),
    };
    
    const [rawMaterials, total] = await Promise.all([
      prisma.rawMaterial.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } }, // ✅ Include category relation
        },
        orderBy: { name: "asc" },
        skip,
        take: Number(limit),
      }),
      prisma.rawMaterial.count({ where }),
    ]);
    
    // Transform to include category name as a string for frontend convenience
    const transformedMaterials = rawMaterials.map(rm => ({
      ...rm,
      category: rm.category?.name, // ✅ Add category name as string
      categoryName: rm.category?.name,
    }));
    
    res.json({
      success: true,
      data: transformedMaterials,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("Error in getAllRawMaterials:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Also update getRawMaterialById
export const getRawMaterialById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const rawMaterial = await prisma.rawMaterial.findUnique({
      where: { id },
      include: {
        supplier: true,
        category: true, // ✅ Include category
        purchaseOrderItems: {
          include: {
            purchaseOrder: { select: { orderNumber: true, createdAt: true, status: true } },
          },
          orderBy: { purchaseOrder: { createdAt: "desc" } },
          take: 10,
        },
        stockTransactions: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { user: { select: { name: true } } },
        },
      },
    });
    
    if (!rawMaterial) {
      return res.status(404).json({ success: false, message: "Raw material not found" });
    }
    
    // Transform to include category name
    const transformed = {
      ...rawMaterial,
      category: rawMaterial.category?.name,
      categoryName: rawMaterial.category?.name,
    };
    
    res.json({ success: true, data: transformed });
  } catch (err) {
    console.error("Error in getRawMaterialById:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== CREATE RAW MATERIAL ====================
export const createRawMaterial = async (req, res) => {
  try {
    const {
      name, sku, description, unit, category, currentStock,
      reorderLevel, unitCost, supplierId, imageUrl, status,
    } = req.body;
    
    if (!name || !category) {
      return res.status(400).json({ success: false, message: "Name and category are required" });
    }
    
    const rawMaterial = await prisma.rawMaterial.create({
      data: {
        name,
        sku: sku || null,
        description: description || null,
        unit: unit || "piece",
        category,
        currentStock: currentStock || 0,
        reorderLevel: reorderLevel || 10,
        unitCost: unitCost ? parseFloat(unitCost) : null,
        supplierId: supplierId || null,
        imageUrl: imageUrl || null,
        status: status || "Active",
      },
      include: { supplier: true },
    });
    
    await logAction(req.user.id, "CREATE", "RawMaterial", rawMaterial.id, { name, category });
    
    res.status(201).json({ success: true, data: rawMaterial });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ success: false, message: "SKU already exists" });
    }
    console.error("Error in createRawMaterial:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== UPDATE RAW MATERIAL ====================
export const updateRawMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, sku, description, unit, category, currentStock,
      reorderLevel, unitCost, supplierId, imageUrl, status,
    } = req.body;
    
    const rawMaterial = await prisma.rawMaterial.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(sku !== undefined && { sku }),
        ...(description !== undefined && { description }),
        ...(unit !== undefined && { unit }),
        ...(category !== undefined && { category }),
        ...(currentStock !== undefined && { currentStock: parseInt(currentStock) }),
        ...(reorderLevel !== undefined && { reorderLevel: parseInt(reorderLevel) }),
        ...(unitCost !== undefined && { unitCost: parseFloat(unitCost) }),
        ...(supplierId !== undefined && { supplierId: supplierId || null }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(status !== undefined && { status }),
      },
    });
    
    await logAction(req.user.id, "UPDATE", "RawMaterial", rawMaterial.id, req.body);
    
    res.json({ success: true, data: rawMaterial });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ success: false, message: "SKU already exists" });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ success: false, message: "Raw material not found" });
    }
    console.error("Error in updateRawMaterial:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== DELETE RAW MATERIAL ====================
export const deleteRawMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    
    const hasPurchaseOrders = await prisma.purchaseOrderRawMaterial.count({
      where: { rawMaterialId: id },
    });
    
    if (hasPurchaseOrders > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete raw material with existing purchase orders",
      });
    }
    
    await prisma.rawMaterial.delete({ where: { id } });
    await logAction(req.user.id, "DELETE", "RawMaterial", id);
    
    res.json({ success: true, message: "Raw material deleted successfully" });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ success: false, message: "Raw material not found" });
    }
    console.error("Error in deleteRawMaterial:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== UPDATE RAW MATERIAL STOCK ====================
export const updateRawMaterialStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, type, note } = req.body;
    
    const rawMaterial = await prisma.rawMaterial.findUnique({ where: { id } });
    if (!rawMaterial) {
      return res.status(404).json({ success: false, message: "Raw material not found" });
    }
    
    let newStock;
    if (type === "IN") {
      newStock = rawMaterial.currentStock + quantity;
    } else if (type === "OUT") {
      if (rawMaterial.currentStock < quantity) {
        return res.status(400).json({ success: false, message: "Insufficient stock" });
      }
      newStock = rawMaterial.currentStock - quantity;
    } else {
      return res.status(400).json({ success: false, message: "Invalid type" });
    }
    
    const [updated, transaction] = await prisma.$transaction([
      prisma.rawMaterial.update({
        where: { id },
        data: { currentStock: newStock },
      }),
      prisma.stockTransaction.create({
        data: {
          rawMaterialId: id,
          type: type === "IN" ? "IN" : "OUT",
          quantity,
          previousStock: rawMaterial.currentStock,
          newStock,
          note: note || null,
          userId: req.user.id,
        },
      }),
    ]);
    
    await logAction(req.user.id, "STOCK_UPDATE", "RawMaterial", id, { quantity, type, newStock });
    
    res.json({ success: true, data: updated, transaction });
  } catch (err) {
    console.error("Error in updateRawMaterialStock:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};