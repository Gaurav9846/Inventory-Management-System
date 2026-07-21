// src/controllers/productCatalog.controller.js
import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";
import { createNotification } from "./notification.controller.js";

// ==================== GET PRODUCT CATALOG ====================
export const getProductCatalog = async (req, res) => {
  try {
    const { 
      search, 
      type, 
      category, 
      status, 
      page = 1, 
      limit = 20 
    } = req.query;
    
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);
    
    // Build where clause for products
    const productWhere = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(category && { categoryId: category }),
      ...(status === "archived" && { isArchived: true }),
      ...(status === "active" && { isArchived: false }),
      ...(status !== "archived" && status !== "active" && { isArchived: false }),
    };
    
    // Build where clause for raw materials
    const rawWhere = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(category && { categoryId: category }),
      ...(status === "archived" && { isArchived: true }),
      ...(status === "active" && { isArchived: false }),
      ...(status !== "archived" && status !== "active" && { isArchived: false }),
    };
    
    // ✅ Get counts
    const productCount = await prisma.product.count({ where: productWhere });
    const rawCount = await prisma.rawMaterial.count({ where: rawWhere });
    
    let products = [];
    let rawMaterials = [];
    let totalCount = 0;
    
    // ✅ SIMPLE FIX: When type is "all", fetch both with the same pagination
    if (type === "all") {
      // Fetch products with pagination
      const productResult = await prisma.product.findMany({
        where: productWhere,
        include: {
          category: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
        },
        orderBy: { name: "asc" },
        take: take,
        skip: skip,
      });
      products = productResult || [];
      
      // Fetch raw materials with pagination
      const rawResult = await prisma.rawMaterial.findMany({
        where: rawWhere,
        include: {
          category: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
        },
        orderBy: { name: "asc" },
        take: take,
        skip: skip,
      });
      rawMaterials = rawResult || [];
      
      totalCount = productCount + rawCount;
      
    } else if (type === "PRODUCT") {
      const productResult = await prisma.product.findMany({
        where: productWhere,
        include: {
          category: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
        },
        orderBy: { name: "asc" },
        take: take,
        skip: skip,
      });
      products = productResult || [];
      totalCount = productCount;
      
    } else if (type === "RAW_MATERIAL") {
      const rawResult = await prisma.rawMaterial.findMany({
        where: rawWhere,
        include: {
          category: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
        },
        orderBy: { name: "asc" },
        take: take,
        skip: skip,
      });
      rawMaterials = rawResult || [];
      totalCount = rawCount;
      
    } else {
      // Default: fetch both
      const productResult = await prisma.product.findMany({
        where: productWhere,
        include: {
          category: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
        },
        orderBy: { name: "asc" },
        take: take,
        skip: skip,
      });
      products = productResult || [];
      
      const rawResult = await prisma.rawMaterial.findMany({
        where: rawWhere,
        include: {
          category: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
        },
        orderBy: { name: "asc" },
        take: take,
        skip: skip,
      });
      rawMaterials = rawResult || [];
      
      totalCount = productCount + rawCount;
    }
    
    // Format response
    const formattedProducts = products.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      type: "PRODUCT",
      category: p.category?.name || "Uncategorized",
      categoryId: p.categoryId,
      unit: p.unit,
      status: p.isArchived ? "Archived" : "Active",
      isArchived: p.isArchived,
      supplier: p.supplier?.name,
      supplierId: p.supplierId,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      productionCost: p.productionCost,
      reorderLevel: p.reorderLevel,
      description: p.description,
      imageUrl: p.imageUrl,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
    
    const formattedRawMaterials = rawMaterials.map(r => ({
      id: r.id,
      name: r.name,
      sku: r.sku,
      type: "RAW_MATERIAL",
      category: r.category?.name || "Uncategorized",
      categoryId: r.categoryId,
      unit: r.unit,
      status: r.isArchived ? "Archived" : "Active",
      isArchived: r.isArchived,
      supplier: r.supplier?.name,
      supplierId: r.supplierId,
      costPrice: r.unitCost,
      sellingPrice: null,
      productionCost: null,
      reorderLevel: r.reorderLevel,
      description: r.description,
      imageUrl: r.imageUrl,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
    
    // Combine and sort
    const allItems = [...formattedProducts, ...formattedRawMaterials].sort((a, b) => 
      a.name.localeCompare(b.name)
    );
    
    // Get summary stats (for the cards)
    const totalProducts = await prisma.product.count({ where: { isArchived: false } });
    const totalRawMaterials = await prisma.rawMaterial.count({ where: { isArchived: false } });
    const archivedProducts = await prisma.product.count({ where: { isArchived: true } });
    const archivedRawMaterials = await prisma.rawMaterial.count({ where: { isArchived: true } });
    
    res.json({
      success: true,
      data: allItems,
      stats: {
        totalProducts,
        totalRawMaterials,
        archived: archivedProducts + archivedRawMaterials,
        total: totalProducts + totalRawMaterials,
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / Number(limit)),
      },
    });
  } catch (err) {
    console.error("Error in getProductCatalog:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== CREATE PRODUCT ====================
export const createCatalogProduct = async (req, res) => {
  try {
    const {
      name,
      sku,
      type,
      categoryId,
      unit,
      costPrice,
      sellingPrice,
      productionCost,
      reorderLevel,
      description,
      supplierId,
    } = req.body;
    
    if (!name || !type || !categoryId) {
      return res.status(400).json({ 
        success: false, 
        message: "Name, type, and category are required." 
      });
    }
    
    let result;
    
    if (type === "PRODUCT") {
      result = await prisma.product.create({
        data: {
          name,
          sku: sku || null,
          categoryId,
          unit: unit || "piece",
          costPrice: costPrice ? parseFloat(costPrice) : null,
          sellingPrice: sellingPrice ? parseFloat(sellingPrice) : null,
          productionCost: productionCost ? parseFloat(productionCost) : null,
          reorderLevel: reorderLevel ? parseInt(reorderLevel) : 10,
          description: description || null,
          isArchived: false,
          supplierId: null,
        },
        include: {
          category: { select: { name: true } },
        },
      });
    } else if (type === "RAW_MATERIAL") {
      result = await prisma.rawMaterial.create({
        data: {
          name,
          sku: sku || null,
          categoryId,
          unit: unit || "piece",
          unitCost: costPrice ? parseFloat(costPrice) : null,
          reorderLevel: reorderLevel ? parseInt(reorderLevel) : 10,
          description: description || null,
          supplierId: supplierId || null,
          isArchived: false,
          status: "Active",
        },
        include: {
          category: { select: { name: true } },
          supplier: { select: { name: true } },
        },
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid type. Must be PRODUCT or RAW_MATERIAL." 
      });
    }
    
    await logAction(req.user.id, "CREATE", type, result.id, { name, type });
    
    await createNotification({
      title: `🆕 New ${type === "PRODUCT" ? "Product" : "Raw Material"}: ${result.name}`,
      message: `${type === "PRODUCT" ? "Product" : "Raw Material"} "${result.name}" has been added to the catalog.`,
      type: 'SYSTEM_WARNING',
      priority: 'INFORMATION',
      referenceId: result.id,
      referenceType: type,
      actionUrl: `/admin/catalog/${result.id}`,
    });
    
    res.status(201).json({
      success: true,
      data: {
        ...result,
        type,
        category: result.category?.name,
        supplier: result.supplier?.name,
      },
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ 
        success: false, 
        message: "SKU already exists." 
      });
    }
    console.error("Error in createCatalogProduct:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== UPDATE PRODUCT ====================
export const updateCatalogProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;
    const {
      name,
      sku,
      categoryId,
      unit,
      costPrice,
      sellingPrice,
      productionCost,
      reorderLevel,
      description,
      supplierId,
    } = req.body;
    
    if (!type || !["PRODUCT", "RAW_MATERIAL"].includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message: "Valid type parameter is required." 
      });
    }
    
    let result;
    const updateData = {
      ...(name !== undefined && { name }),
      ...(sku !== undefined && { sku: sku || null }),
      ...(categoryId !== undefined && { categoryId }),
      ...(unit !== undefined && { unit }),
      ...(description !== undefined && { description: description || null }),
      ...(reorderLevel !== undefined && { reorderLevel: parseInt(reorderLevel) || 10 }),
    };
    
    if (type === "PRODUCT") {
      updateData.costPrice = costPrice !== undefined ? (costPrice ? parseFloat(costPrice) : null) : undefined;
      updateData.sellingPrice = sellingPrice !== undefined ? (sellingPrice ? parseFloat(sellingPrice) : null) : undefined;
      updateData.productionCost = productionCost !== undefined ? (productionCost ? parseFloat(productionCost) : null) : undefined;
      
      result = await prisma.product.update({
        where: { id },
        data: updateData,
        include: {
          category: { select: { name: true } },
        },
      });
    } else {
      updateData.unitCost = costPrice !== undefined ? (costPrice ? parseFloat(costPrice) : null) : undefined;
      updateData.supplierId = supplierId !== undefined ? (supplierId || null) : undefined;
      
      result = await prisma.rawMaterial.update({
        where: { id },
        data: updateData,
        include: {
          category: { select: { name: true } },
          supplier: { select: { name: true } },
        },
      });
    }
    
    await logAction(req.user.id, "UPDATE", type, result.id, req.body);
    
    await createNotification({
      title: `✏️ ${type === "PRODUCT" ? "Product" : "Raw Material"} Updated: ${result.name}`,
      message: `${type === "PRODUCT" ? "Product" : "Raw Material"} "${result.name}" details have been updated.`,
      type: 'SYSTEM_WARNING',
      priority: 'INFORMATION',
      referenceId: result.id,
      referenceType: type,
      actionUrl: `/admin/catalog/${result.id}`,
    });
    
    res.json({
      success: true,
      data: {
        ...result,
        type,
        category: result.category?.name,
        supplier: result.supplier?.name,
      },
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ 
        success: false, 
        message: "SKU already exists." 
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ 
        success: false, 
        message: "Item not found." 
      });
    }
    console.error("Error in updateCatalogProduct:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== ARCHIVE PRODUCT ====================
export const archiveCatalogProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;
    
    if (!type || !["PRODUCT", "RAW_MATERIAL"].includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message: "Valid type parameter is required." 
      });
    }
    
    let result;
    let name;
    
    if (type === "PRODUCT") {
      const product = await prisma.product.findUnique({ where: { id } });
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found." });
      }
      name = product.name;
      result = await prisma.product.update({
        where: { id },
        data: { isArchived: true },
      });
    } else {
      const rawMaterial = await prisma.rawMaterial.findUnique({ where: { id } });
      if (!rawMaterial) {
        return res.status(404).json({ success: false, message: "Raw material not found." });
      }
      name = rawMaterial.name;
      result = await prisma.rawMaterial.update({
        where: { id },
        data: { isArchived: true },
      });
    }
    
    await logAction(req.user.id, "ARCHIVE", type, id);
    
    await createNotification({
      title: `📦 ${type === "PRODUCT" ? "Product" : "Raw Material"} Archived: ${name}`,
      message: `${type === "PRODUCT" ? "Product" : "Raw Material"} "${name}" has been archived. It will no longer appear in transactions.`,
      type: 'SYSTEM_WARNING',
      priority: 'INFORMATION',
      referenceId: id,
      referenceType: type,
    });
    
    res.json({ 
      success: true, 
      message: `${type === "PRODUCT" ? "Product" : "Raw Material"} archived successfully.` 
    });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ 
        success: false, 
        message: "Item not found." 
      });
    }
    console.error("Error in archiveCatalogProduct:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== RESTORE PRODUCT ====================
export const restoreCatalogProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;
    
    if (!type || !["PRODUCT", "RAW_MATERIAL"].includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message: "Valid type parameter is required." 
      });
    }
    
    let result;
    let name;
    
    if (type === "PRODUCT") {
      const product = await prisma.product.findUnique({ where: { id } });
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found." });
      }
      name = product.name;
      result = await prisma.product.update({
        where: { id },
        data: { isArchived: false },
      });
    } else {
      const rawMaterial = await prisma.rawMaterial.findUnique({ where: { id } });
      if (!rawMaterial) {
        return res.status(404).json({ success: false, message: "Raw material not found." });
      }
      name = rawMaterial.name;
      result = await prisma.rawMaterial.update({
        where: { id },
        data: { isArchived: false },
      });
    }
    
    await logAction(req.user.id, "RESTORE", type, id);
    
    await createNotification({
      title: `↩️ ${type === "PRODUCT" ? "Product" : "Raw Material"} Restored: ${name}`,
      message: `${type === "PRODUCT" ? "Product" : "Raw Material"} "${name}" has been restored from archive.`,
      type: 'SYSTEM_WARNING',
      priority: 'INFORMATION',
      referenceId: id,
      referenceType: type,
    });
    
    res.json({ 
      success: true, 
      message: `${type === "PRODUCT" ? "Product" : "Raw Material"} restored successfully.` 
    });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ 
        success: false, 
        message: "Item not found." 
      });
    }
    console.error("Error in restoreCatalogProduct:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== GET PRODUCT CATALOG STATS ====================
export const getCatalogStats = async (req, res) => {
  try {
    const [totalProducts, totalRawMaterials, archivedProducts, archivedRawMaterials] = await Promise.all([
      prisma.product.count({ where: { isArchived: false } }),
      prisma.rawMaterial.count({ where: { isArchived: false } }),
      prisma.product.count({ where: { isArchived: true } }),
      prisma.rawMaterial.count({ where: { isArchived: true } }),
    ]);
    
    res.json({
      success: true,
      data: {
        totalProducts,
        totalRawMaterials,
        archived: archivedProducts + archivedRawMaterials,
        total: totalProducts + totalRawMaterials,
      },
    });
  } catch (err) {
    console.error("Error in getCatalogStats:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== GET PRODUCT CATALOG CATEGORIES ====================
export const getCatalogCategories = async (req, res) => {
  try {
    const [productCategories, rawMaterialCategories] = await Promise.all([
      prisma.productCategory.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.rawMaterialCategory.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);
    
    res.json({
      success: true,
      data: {
        productCategories,
        rawMaterialCategories,
      },
    });
  } catch (err) {
    console.error("Error in getCatalogCategories:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== CREATE PRODUCT CATEGORY ====================
export const createProductCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: "Category name is required." 
      });
    }
    
    const category = await prisma.productCategory.create({
      data: {
        name,
        description: description || null,
      },
    });
    
    await logAction(req.user.id, "CREATE", "ProductCategory", category.id, { name });
    
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
    console.error("Error in createProductCategory:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== CREATE RAW MATERIAL CATEGORY ====================
export const createRawMaterialCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    
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