// backend/src/controllers/production.controller.js
import prisma from "../config/prisma.js";
import { logAction } from "../utils/auditLog.js";
import { createNotification } from "./notification.controller.js";

// ==================== HELPER FUNCTIONS ====================

const generateBatchNumber = async () => {
  const date = new Date();
  const dateStr = date.getFullYear() + 
                  String(date.getMonth() + 1).padStart(2, '0') + 
                  String(date.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `PROD-${dateStr}-${rand}`;
};

// ==================== GET ALL PRODUCTION BATCHES ====================
export const getAllProductionBatches = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [batches, total] = await Promise.all([
      prisma.productionBatch.findMany({
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              unit: true,
              currentStock: true,
              category: { select: { name: true } }
            }
          },
          createdBy: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: Number(limit),
        skip,
      }),
      prisma.productionBatch.count(),
    ]);

    const formattedBatches = batches.map(batch => ({
      ...batch,
      rawMaterialsUsed: batch.rawMaterialsUsed || []
    }));

    res.json({
      data: formattedBatches,
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

// ==================== GET PRODUCTION BATCH BY ID ====================
export const getProductionBatchById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const batch = await prisma.productionBatch.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
            currentStock: true,
            category: { select: { name: true } }
          }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!batch) {
      return res.status(404).json({ message: "Production batch not found" });
    }

    res.json({
      ...batch,
      rawMaterialsUsed: batch.rawMaterialsUsed || []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ==================== CREATE PRODUCTION BATCH ====================
export const createProductionBatch = async (req, res) => {
  try {
    const {
      productId,
      quantityProduced,
      rawMaterialsUsed,
      startDate,
      notes
    } = req.body;

    console.log('📦 Creating production batch:', { productId, quantityProduced });

    if (!productId) {
      return res.status(400).json({ message: "Product is required" });
    }
    if (!quantityProduced || quantityProduced <= 0) {
      return res.status(400).json({ message: "Valid quantity is required" });
    }
    if (!rawMaterialsUsed || rawMaterialsUsed.length === 0) {
      return res.status(400).json({ message: "At least one raw material is required" });
    }
    
    for (const item of rawMaterialsUsed) {
      if (!item.rawMaterialId || !item.quantity) {
        return res.status(400).json({ 
          message: "Each raw material must have an ID and quantity" 
        });
      }
      if (item.quantity <= 0) {
        return res.status(400).json({ 
          message: "Raw material quantity must be greater than 0" 
        });
      }
    }

    const rawMaterialIds = rawMaterialsUsed.map(item => item.rawMaterialId);
    
    const [product, rawMaterials] = await Promise.all([
      prisma.product.findUnique({
        where: { id: productId },
        select: { 
          id: true, 
          name: true, 
          unit: true, 
          currentStock: true, 
          reorderLevel: true,
          sku: true 
        }
      }),
      prisma.rawMaterial.findMany({
        where: { id: { in: rawMaterialIds } },
        select: { 
          id: true, 
          name: true, 
          unit: true, 
          unitCost: true,
          currentStock: true 
        }
      })
    ]);
    
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    const rawMaterialMap = {};
    rawMaterials.forEach(rm => {
      rawMaterialMap[rm.id] = rm;
    });

    let totalCost = 0;
    const rawMaterialsWithCost = [];
    const rawMaterialUpdates = [];

    for (const item of rawMaterialsUsed) {
      const stock = rawMaterialMap[item.rawMaterialId];
      
      if (!stock) {
        return res.status(404).json({ 
          message: `Raw material not found: ${item.rawMaterialId}` 
        });
      }
      
      if (stock.currentStock < item.quantity) {
        return res.status(400).json({ 
          message: `Insufficient stock for ${stock.name}. Available: ${stock.currentStock} ${stock.unit}, Required: ${item.quantity} ${stock.unit}`
        });
      }
      
      const cost = (stock.unitCost || 0) * item.quantity;
      totalCost += cost;
      
      const newStock = stock.currentStock - item.quantity;
      
      rawMaterialsWithCost.push({
        rawMaterialId: item.rawMaterialId,
        quantity: Number(item.quantity),
        unitCost: stock.unitCost || 0,
        totalCost: cost,
        name: stock.name,
        unit: stock.unit,
        currentStock: stock.currentStock,
        newStock: newStock
      });
      
      rawMaterialUpdates.push({
        id: item.rawMaterialId,
        newStock: newStock,
        quantity: item.quantity,
        previousStock: stock.currentStock,
        name: stock.name
      });
    }
    
    console.log('✅ Validated:', rawMaterialsWithCost.length, 'raw materials');

    const batchNumber = await generateBatchNumber();
    const productNewStock = product.currentStock + Number(quantityProduced);

    let batch;

    try {
      const result = await prisma.$transaction(async (tx) => {
        await Promise.all(rawMaterialUpdates.map(async (item) => {
          await tx.rawMaterial.update({
            where: { id: item.id },
            data: { currentStock: item.newStock }
          });
        }));

        await tx.stockTransaction.createMany({
          data: rawMaterialUpdates.map(item => ({
            rawMaterialId: item.id,
            type: "OUT",
            quantity: item.quantity,
            previousStock: item.previousStock,
            newStock: item.newStock,
            note: `Production: ${product.name}`,
            userId: req.user.id,
          }))
        });

        await tx.product.update({
          where: { id: productId },
          data: { currentStock: productNewStock }
        });

        await tx.stockTransaction.create({
          data: {
            productId: productId,
            type: "IN",
            quantity: Number(quantityProduced),
            previousStock: product.currentStock,
            newStock: productNewStock,
            note: `Production batch ${batchNumber}`,
            userId: req.user.id,
          },
        });

        const newBatch = await tx.productionBatch.create({
          data: {
            batchNumber: batchNumber,
            productId: productId,
            quantityProduced: Number(quantityProduced),
            unit: product.unit,
            rawMaterialsUsed: rawMaterialsWithCost,
            startDate: startDate ? new Date(startDate) : new Date(),
            notes: notes || null,
            createdById: req.user.id,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                unit: true,
                currentStock: true,
                category: { select: { name: true } }
              }
            },
            createdBy: {
              select: { id: true, name: true, email: true }
            }
          }
        });

        return newBatch;
      }, {
        timeout: 10000
      });

      batch = result;

    } catch (txError) {
      console.error('❌ Transaction error:', txError);
      if (txError.code === 'P2028') {
        return res.status(500).json({ 
          message: "Transaction timed out. Please try again with fewer items or contact support.",
          error: txError.message
        });
      }
      return res.status(500).json({ 
        message: txError.message || "Transaction failed. Please try again." 
      });
    }
    
    await logAction(req.user.id, "CREATE_PRODUCTION", "ProductionBatch", batch.id, {
      productId,
      quantityProduced,
      totalCost,
      batchNumber,
      rawMaterialsUsed: rawMaterialsWithCost.map(r => ({ name: r.name, quantity: r.quantity }))
    });

    // ✅ CREATE NOTIFICATION FOR PRODUCTION COMPLETED
    await createNotification({
      title: `🏭 Production Completed: ${batch.batchNumber}`,
      message: `Production batch #${batch.batchNumber} completed. Product: ${product.name}. Quantity: ${quantityProduced} ${product.unit}(s). Total cost: ₹${totalCost.toLocaleString()}.`,
      type: 'STOCK_ADJUSTMENT',
      priority: 'INFORMATION',
      referenceId: batch.id,
      referenceType: 'ProductionBatch',
      actionUrl: `/production/${batch.id}`,
    });
    
    res.status(201).json({
      success: true,
      message: `✅ Production completed! ${quantityProduced} ${product.unit}(s) added to stock.`,
      data: batch,
      summary: {
        totalCost,
        rawMaterialsUpdated: rawMaterialUpdates,
        productNewStock,
        batchNumber
      }
    });

  } catch (err) {
    console.error('❌ Error in createProductionBatch:', err);
    res.status(500).json({ 
      message: err.message || "Failed to create production record" 
    });
  }
};

// ==================== DELETE PRODUCTION BATCH ====================
export const deleteProductionBatch = async (req, res) => {
  try {
    const { id } = req.params;

    const batch = await prisma.productionBatch.findUnique({
      where: { id },
      include: { product: { select: { name: true } } }
    });

    if (!batch) {
      return res.status(404).json({ message: "Production batch not found" });
    }

    await prisma.productionBatch.delete({
      where: { id }
    });

    await logAction(req.user.id, "DELETE", "ProductionBatch", id);

    // ✅ CREATE NOTIFICATION FOR PRODUCTION BATCH DELETION
    await createNotification({
      title: `🗑️ Production Batch Deleted: ${batch.batchNumber}`,
      message: `Production batch #${batch.batchNumber} for product "${batch.product.name}" has been deleted.`,
      type: 'SYSTEM_WARNING',
      priority: 'WARNING',
      referenceId: id,
      referenceType: 'ProductionBatch',
    });

    res.json({ success: true, message: "Production record deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ==================== GET PRODUCTION STATS ====================
export const getProductionStats = async (req, res) => {
  try {
    const [total, totalProduced] = await Promise.all([
      prisma.productionBatch.count(),
      prisma.productionBatch.aggregate({
        _sum: { quantityProduced: true }
      })
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentProduction = await prisma.productionBatch.aggregate({
      where: {
        createdAt: { gte: thirtyDaysAgo }
      },
      _sum: {
        quantityProduced: true
      }
    });

    const allBatches = await prisma.productionBatch.findMany({
      select: { rawMaterialsUsed: true }
    });

    let totalRawUsed = 0;
    let totalCost = 0;
    allBatches.forEach(batch => {
      const materials = batch.rawMaterialsUsed || [];
      materials.forEach(item => {
        totalRawUsed += (item.quantity || 0);
        totalCost += (item.unitCost || 0) * (item.quantity || 0);
      });
    });

    const recentBatches = await prisma.productionBatch.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { name: true, sku: true, unit: true } }
      }
    });

    res.json({
      stats: {
        total,
        totalProduced: totalProduced._sum.quantityProduced || 0,
        recentProduction: recentProduction._sum.quantityProduced || 0,
        totalRawUsed,
        totalCost
      },
      recentBatches
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};