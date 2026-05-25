// src/controllers/product.controller.js
import prisma from "../config/prisma.js";
import { uploadBuffer, deleteImage } from "../config/cloudinary.js";
import { logAction } from "../utils/auditLog.js";

// GET /api/products
export const getAllProducts = async (req, res) => {
  try {
    const { categoryId, supplierId, search } = req.query;
    const lowStock = req.query.lowStock === "true";

    // lowStock uses a raw query (field comparison in WHERE)
    if (lowStock) {
      const products = await prisma.$queryRaw`
        SELECT p.*, c.name AS "categoryName", s.name AS "supplierName"
        FROM "Product" p
        LEFT JOIN "Category" c ON p."categoryId" = c.id
        LEFT JOIN "Supplier" s ON p."supplierId" = s.id
        WHERE p."currentStock" <= p."reorderLevel"
        ORDER BY p."currentStock" ASC
      `;
      return res.json(products);
    }

    const where = {
      ...(categoryId && { categoryId }),
      ...(supplierId && { supplierId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { sku:  { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const products = await prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/products/:id
export const getProductById = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where:   { id: req.params.id },
      include: {
        category: true,
        supplier: { select: { id: true, name: true, phone: true, email: true } },
        stockTransactions: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: { user: { select: { name: true } } },
        },
        alerts: { where: { isRead: false } },
      },
    });
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/products
export const createProduct = async (req, res) => {
  try {
    const {
      name, sku, description, unit, reorderLevel,
      currentStock, costPrice, sellingPrice, categoryId, supplierId,
    } = req.body;

    if (!name || !categoryId)
      return res.status(400).json({ message: "Name and categoryId are required." });

    let imageUrl = null;
    let imagePublicId = null;

    if (req.file) {
      const result = await uploadBuffer(req.file.buffer, "ims/products");
      imageUrl = result.url;
      imagePublicId = result.publicId;
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku:          sku       || null,
        description:  description || null,
        unit:         unit       || "piece",
        reorderLevel: Number(reorderLevel)  || 10,
        currentStock: Number(currentStock)  || 0,
        costPrice:    costPrice  ? Number(costPrice)    : null,
        sellingPrice: sellingPrice ? Number(sellingPrice) : null,
        categoryId,
        supplierId:   supplierId || null,
        imageUrl,
        imagePublicId,
      },
    });

    await logAction(req.user.id, "CREATE", "Product", product.id, { name, sku });
    res.status(201).json(product);
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ message: "SKU already exists." });
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/products/:id
export const updateProduct = async (req, res) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Product not found." });

    let imageUrl      = undefined;
    let imagePublicId = undefined;

    if (req.file) {
      // Delete old image from Cloudinary first
      if (existing.imagePublicId) await deleteImage(existing.imagePublicId);
      const result = await uploadBuffer(req.file.buffer, "ims/products");
      imageUrl      = result.url;
      imagePublicId = result.publicId;
    }

    const {
      name, sku, description, unit, reorderLevel,
      costPrice, sellingPrice, categoryId, supplierId,
    } = req.body;

    const data = {
      ...(name         !== undefined && { name }),
      ...(sku          !== undefined && { sku }),
      ...(description  !== undefined && { description }),
      ...(unit         !== undefined && { unit }),
      ...(reorderLevel !== undefined && { reorderLevel: Number(reorderLevel) }),
      ...(costPrice    !== undefined && { costPrice: Number(costPrice) }),
      ...(sellingPrice !== undefined && { sellingPrice: Number(sellingPrice) }),
      ...(categoryId   !== undefined && { categoryId }),
      ...(supplierId   !== undefined && { supplierId: supplierId || null }),
      ...(imageUrl      !== undefined && { imageUrl }),
      ...(imagePublicId !== undefined && { imagePublicId }),
    };

    const product = await prisma.product.update({ where: { id: req.params.id }, data });
    await logAction(req.user.id, "UPDATE", "Product", product.id, data);
    res.json(product);
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ message: "SKU already exists." });
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/products/:id
export const deleteProduct = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ message: "Product not found." });

    if (product.imagePublicId) await deleteImage(product.imagePublicId);

    await prisma.product.delete({ where: { id: req.params.id } });
    await logAction(req.user.id, "DELETE", "Product", req.params.id);
    res.json({ message: "Product deleted." });
  } catch (err) {
    if (err.code === "P2003") return res.status(400).json({ message: "Cannot delete product with existing transactions." });
    res.status(500).json({ message: err.message });
  }
};
