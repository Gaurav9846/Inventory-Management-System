// src/controllers/rawMaterial.controller.js
import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";
import { createNotification } from "./notification.controller.js";

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
      ...(category && { category: { name: category } }),
      ...(supplierId && { supplierId }),
      ...(lowStock === "true" && { currentStock: { lte: prisma.rawMaterial.fields.reorderLevel } }),
      isArchived: false, // ✅ Only show non-archived by default
    };
    
    const [rawMaterials, total] = await Promise.all([
      prisma.rawMaterial.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
        },
        orderBy: { name: "asc" },
        skip,
        take: Number(limit),
      }),
      prisma.rawMaterial.count({ where }),
    ]);
    
    const transformedMaterials = rawMaterials.map(rm => ({
      ...rm,
      category: rm.category?.name,
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

// ==================== GET RAW MATERIAL CATEGORIES ====================
export const getRawMaterialCategories = async (req, res) => {
  try {
    const categories = await prisma.rawMaterialCategory.findMany({
      include: {
        _count: {
          select: { rawMaterials: true }
        }
      },
      orderBy: { name: "asc" },
    });
    
    res.json({
      success: true,
      data: categories,
    });
  } catch (err) {
    console.error("Error fetching raw material categories:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== GET RAW MATERIAL BY ID ====================
export const getRawMaterialById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const rawMaterial = await prisma.rawMaterial.findUnique({
      where: { id },
      include: {
        supplier: true,
        category: true,
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
        goodsReceivingItems: {
          take: 10,
          orderBy: { grn: { receivedDate: "desc" } },
          include: {
            grn: {
              select: {
                grnNumber: true,
                receivedDate: true,
              },
            },
          },
        },
      },
    });
    
    if (!rawMaterial) {
      return res.status(404).json({ success: false, message: "Raw material not found" });
    }
    
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
      name,
      sku,
      description,
      unit,
      categoryId,
      currentStock,
      reorderLevel,
      unitCost,
      supplierId,
      imageUrl,
      status,
    } = req.body;
    
    if (!name || !categoryId) {
      return res.status(400).json({ success: false, message: "Name and category are required" });
    }
    
    // ✅ Check if category exists
    const categoryExists = await prisma.rawMaterialCategory.findUnique({
      where: { id: categoryId },
    });
    
    if (!categoryExists) {
      return res.status(400).json({ success: false, message: "Invalid category" });
    }
    
    // ✅ If supplier is provided, check if they supply this category
    if (supplierId) {
      const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId },
        include: { categories: true },
      });
      
      if (supplier) {
        const supplierCategories = supplier.categories.map(c => c.id);
        if (!supplierCategories.includes(categoryId)) {
          return res.status(400).json({ 
            success: false, 
            message: "This supplier does not supply the selected category" 
          });
        }
      }
    }
    
    const rawMaterial = await prisma.rawMaterial.create({
      data: {
        name,
        sku: sku || null,
        description: description || null,
        unit: unit || "piece",
        categoryId,
        currentStock: currentStock || 0,
        reorderLevel: reorderLevel || 10,
        unitCost: unitCost ? parseFloat(unitCost) : null,
        supplierId: supplierId || null,
        imageUrl: imageUrl || null,
        status: status || "Active",
        isArchived: false,
      },
      include: {
        supplier: true,
        category: true,
      },
    });
    
    await logAction(req.user.id, "CREATE", "RawMaterial", rawMaterial.id, { name, categoryId });

    await createNotification({
      title: `🆕 New Raw Material: ${rawMaterial.name}`,
      message: `Raw Material "${rawMaterial.name}" has been added. Category: ${rawMaterial.category?.name}. Initial stock: ${rawMaterial.currentStock} ${rawMaterial.unit}(s).`,
      type: 'STOCK_ADJUSTMENT',
      priority: 'INFORMATION',
      referenceId: rawMaterial.id,
      referenceType: 'RawMaterial',
      actionUrl: `/raw-materials/${rawMaterial.id}`,
    });
    
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
      name,
      sku,
      description,
      unit,
      categoryId,
      currentStock,
      reorderLevel,
      unitCost,
      supplierId,
      imageUrl,
      status,
    } = req.body;
    
    // ✅ Check if raw material exists
    const existing = await prisma.rawMaterial.findUnique({
      where: { id },
      include: { category: true },
    });
    
    if (!existing) {
      return res.status(404).json({ success: false, message: "Raw material not found" });
    }
    
    // ✅ If category is changing, validate
    if (categoryId && categoryId !== existing.categoryId) {
      const categoryExists = await prisma.rawMaterialCategory.findUnique({
        where: { id: categoryId },
      });
      
      if (!categoryExists) {
        return res.status(400).json({ success: false, message: "Invalid category" });
      }
      
      // ✅ If supplier is provided, check if they supply this category
      if (supplierId) {
        const supplier = await prisma.supplier.findUnique({
          where: { id: supplierId },
          include: { categories: true },
        });
        
        if (supplier) {
          const supplierCategories = supplier.categories.map(c => c.id);
          if (!supplierCategories.includes(categoryId)) {
            return res.status(400).json({ 
              success: false, 
              message: "This supplier does not supply the selected category" 
            });
          }
        }
      }
    }
    
    const rawMaterial = await prisma.rawMaterial.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(sku !== undefined && { sku }),
        ...(description !== undefined && { description }),
        ...(unit !== undefined && { unit }),
        ...(categoryId !== undefined && { categoryId }),
        ...(currentStock !== undefined && { currentStock: parseInt(currentStock) }),
        ...(reorderLevel !== undefined && { reorderLevel: parseInt(reorderLevel) }),
        ...(unitCost !== undefined && { unitCost: parseFloat(unitCost) }),
        ...(supplierId !== undefined && { supplierId: supplierId || null }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(status !== undefined && { status }),
      },
      include: {
        supplier: true,
        category: true,
      },
    });
    
    await logAction(req.user.id, "UPDATE", "RawMaterial", rawMaterial.id, req.body);

    await createNotification({
      title: `✏️ Raw Material Updated: ${rawMaterial.name}`,
      message: `Raw Material "${rawMaterial.name}" details have been updated. Status: ${rawMaterial.status}.`,
      type: 'SYSTEM_WARNING',
      priority: 'INFORMATION',
      referenceId: rawMaterial.id,
      referenceType: 'RawMaterial',
      actionUrl: `/raw-materials/${rawMaterial.id}`,
    });
    
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

// ==================== DELETE RAW MATERIAL (Soft Delete - Archive) ====================
export const deleteRawMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    
    const rawMaterial = await prisma.rawMaterial.findUnique({
      where: { id },
      select: { name: true, isArchived: true }
    });
    
    if (!rawMaterial) {
      return res.status(404).json({ success: false, message: "Raw material not found" });
    }
    
    // ✅ Check if it has purchase orders
    const hasPurchaseOrders = await prisma.purchaseOrderRawMaterial.count({
      where: { rawMaterialId: id },
    });
    
    if (hasPurchaseOrders > 0) {
      // ✅ Soft delete - archive instead of hard delete
      await prisma.rawMaterial.update({
        where: { id },
        data: { isArchived: true },
      });
      
      await logAction(req.user.id, "ARCHIVE", "RawMaterial", id);
      
      await createNotification({
        title: `📦 Raw Material Archived: ${rawMaterial.name}`,
        message: `Raw Material "${rawMaterial.name}" has been archived due to existing purchase orders.`,
        type: 'SYSTEM_WARNING',
        priority: 'INFORMATION',
        referenceId: id,
        referenceType: 'RawMaterial',
      });
      
      return res.json({ 
        success: true, 
        message: "Raw material archived successfully (has existing purchase orders)" 
      });
    }
    
    // ✅ If no purchase orders, hard delete
    await prisma.rawMaterial.delete({ where: { id } });
    await logAction(req.user.id, "DELETE", "RawMaterial", id);

    await createNotification({
      title: `🗑️ Raw Material Deleted: ${rawMaterial.name}`,
      message: `Raw Material "${rawMaterial.name}" has been deleted from the system.`,
      type: 'SYSTEM_WARNING',
      priority: 'WARNING',
      referenceId: id,
      referenceType: 'RawMaterial',
    });
    
    res.json({ success: true, message: "Raw material deleted successfully" });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ success: false, message: "Raw material not found" });
    }
    console.error("Error in deleteRawMaterial:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== ARCHIVE RAW MATERIAL ====================
export const archiveRawMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    
    const rawMaterial = await prisma.rawMaterial.findUnique({
      where: { id },
      select: { name: true, isArchived: true }
    });
    
    if (!rawMaterial) {
      return res.status(404).json({ success: false, message: "Raw material not found" });
    }
    
    if (rawMaterial.isArchived) {
      return res.status(400).json({ success: false, message: "Raw material is already archived" });
    }
    
    await prisma.rawMaterial.update({
      where: { id },
      data: { isArchived: true },
    });
    
    await logAction(req.user.id, "ARCHIVE", "RawMaterial", id);
    
    await createNotification({
      title: `📦 Raw Material Archived: ${rawMaterial.name}`,
      message: `Raw Material "${rawMaterial.name}" has been archived. It will no longer appear in transactions.`,
      type: 'SYSTEM_WARNING',
      priority: 'INFORMATION',
      referenceId: id,
      referenceType: 'RawMaterial',
    });
    
    res.json({ 
      success: true, 
      message: "Raw material archived successfully" 
    });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ success: false, message: "Raw material not found" });
    }
    console.error("Error in archiveRawMaterial:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== RESTORE RAW MATERIAL ====================
export const restoreRawMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    
    const rawMaterial = await prisma.rawMaterial.findUnique({
      where: { id },
      select: { name: true, isArchived: true }
    });
    
    if (!rawMaterial) {
      return res.status(404).json({ success: false, message: "Raw material not found" });
    }
    
    if (!rawMaterial.isArchived) {
      return res.status(400).json({ success: false, message: "Raw material is not archived" });
    }
    
    await prisma.rawMaterial.update({
      where: { id },
      data: { isArchived: false },
    });
    
    await logAction(req.user.id, "RESTORE", "RawMaterial", id);
    
    await createNotification({
      title: `↩️ Raw Material Restored: ${rawMaterial.name}`,
      message: `Raw Material "${rawMaterial.name}" has been restored from archive.`,
      type: 'SYSTEM_WARNING',
      priority: 'INFORMATION',
      referenceId: id,
      referenceType: 'RawMaterial',
    });
    
    res.json({ 
      success: true, 
      message: "Raw material restored successfully" 
    });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ success: false, message: "Raw material not found" });
    }
    console.error("Error in restoreRawMaterial:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== UPDATE RAW MATERIAL STOCK ====================
export const updateRawMaterialStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, type, note } = req.body;
    
    const rawMaterial = await prisma.rawMaterial.findUnique({ 
      where: { id },
      select: {
        id: true,
        name: true,
        unit: true,
        currentStock: true,
        reorderLevel: true,
      }
    });
    
    if (!rawMaterial) {
      return res.status(404).json({ success: false, message: "Raw material not found" });
    }
    
    let newStock;
    if (type === "IN") {
      newStock = rawMaterial.currentStock + Number(quantity);
    } else if (type === "OUT") {
      if (rawMaterial.currentStock < quantity) {
        return res.status(400).json({ success: false, message: "Insufficient stock" });
      }
      newStock = rawMaterial.currentStock - Number(quantity);
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
          quantity: Number(quantity),
          previousStock: rawMaterial.currentStock,
          newStock,
          note: note || null,
          userId: req.user.id,
        },
      }),
    ]);
    
    await logAction(req.user.id, "STOCK_UPDATE", "RawMaterial", id, { quantity, type, newStock });

    const isOutOfStock = newStock === 0;
    const isLowStock = newStock > 0 && newStock <= rawMaterial.reorderLevel;
    let priority = 'INFORMATION';
    let statusText = '';
    
    if (isOutOfStock) {
      priority = 'CRITICAL';
      statusText = 'OUT OF STOCK';
    } else if (isLowStock) {
      priority = 'WARNING';
      statusText = 'Low Stock';
    }
    
    await createNotification({
      title: `${isOutOfStock ? '🚫' : isLowStock ? '⚠️' : '📦'} Raw Material ${isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'Stock Updated'}: ${rawMaterial.name}`,
      message: `Stock for "${rawMaterial.name}" ${type === 'IN' ? 'increased' : 'decreased'} by ${quantity} ${rawMaterial.unit}(s). New stock: ${newStock} ${rawMaterial.unit}(s).${isOutOfStock ? ' ⚠️ CRITICAL: Item is OUT OF STOCK!' : isLowStock ? ` ⚠️ Below reorder level (${rawMaterial.reorderLevel} ${rawMaterial.unit}(s)).` : ''}`,
      type: 'STOCK_ADJUSTMENT',
      priority: priority,
      referenceId: rawMaterial.id,
      referenceType: 'RawMaterial',
      actionUrl: `/raw-materials/${rawMaterial.id}`,
    });
    
    res.json({ success: true, data: updated, transaction });
  } catch (err) {
    console.error("Error in updateRawMaterialStock:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== GET RAW MATERIAL STOCK OVERVIEW ====================
export const getRawMaterialStockOverview = async (req, res) => {
  try {
    const rawMaterials = await prisma.rawMaterial.findMany({
      where: { isArchived: false },
      select: {
        id: true,
        name: true,
        currentStock: true,
        reorderLevel: true,
        unit: true,
        sku: true,
        category: { select: { name: true } },
        supplier: { select: { name: true } }
      }
    });

    const outOfStock = rawMaterials.filter(r => r.currentStock === 0);
    const lowStock = rawMaterials.filter(r => r.currentStock > 0 && r.currentStock <= r.reorderLevel);
    const inStock = rawMaterials.filter(r => r.currentStock > r.reorderLevel);

    res.json({
      success: true,
      data: {
        total: rawMaterials.length,
        outOfStock: outOfStock.length,
        lowStock: lowStock.length,
        inStock: inStock.length,
        outOfStockItems: outOfStock,
        lowStockItems: lowStock,
        allItems: rawMaterials
      }
    });
  } catch (err) {
    console.error("Error in getRawMaterialStockOverview:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== GET RAW MATERIALS BY CATEGORY ====================
export const getRawMaterialsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    const rawMaterials = await prisma.rawMaterial.findMany({
      where: { 
        categoryId,
        isArchived: false,
      },
      include: {
        supplier: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });
    
    res.json({
      success: true,
      data: rawMaterials,
    });
  } catch (err) {
    console.error("Error in getRawMaterialsByCategory:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== GET RAW MATERIALS BY SUPPLIER ====================
export const getRawMaterialsBySupplier = async (req, res) => {
  try {
    const { supplierId } = req.params;
    
    const rawMaterials = await prisma.rawMaterial.findMany({
      where: { 
        supplierId,
        isArchived: false,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });
    
    res.json({
      success: true,
      data: rawMaterials,
    });
  } catch (err) {
    console.error("Error in getRawMaterialsBySupplier:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== CREATE RAW MATERIAL CATEGORY ====================
export const createRawMaterialCategory = async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: "Category name is required." 
      });
    }
    
    const category = await prisma.rawMaterialCategory.create({
      data: {
        name,
        description: description || null,
        icon: icon || null,
      },
    });
    
    await logAction(req.user.id, "CREATE", "RawMaterialCategory", category.id, { name });
    
    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ 
        success: false, 
        message: "Category with this name already exists." 
      });
    }
    console.error("Error in createRawMaterialCategory:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== UPDATE RAW MATERIAL CATEGORY ====================
export const updateRawMaterialCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon } = req.body;
    
    const category = await prisma.rawMaterialCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
      },
    });
    
    await logAction(req.user.id, "UPDATE", "RawMaterialCategory", category.id, req.body);
    
    res.json({
      success: true,
      data: category,
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ 
        success: false, 
        message: "Category with this name already exists." 
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ 
        success: false, 
        message: "Category not found." 
      });
    }
    console.error("Error in updateRawMaterialCategory:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== DELETE RAW MATERIAL CATEGORY ====================
export const deleteRawMaterialCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // ✅ Check if category has raw materials
    const hasRawMaterials = await prisma.rawMaterial.count({
      where: { categoryId: id },
    });
    
    if (hasRawMaterials > 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot delete category with existing raw materials. Archive the raw materials first." 
      });
    }
    
    await prisma.rawMaterialCategory.delete({
      where: { id },
    });
    
    await logAction(req.user.id, "DELETE", "RawMaterialCategory", id);
    
    res.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ 
        success: false, 
        message: "Category not found." 
      });
    }
    console.error("Error in deleteRawMaterialCategory:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};