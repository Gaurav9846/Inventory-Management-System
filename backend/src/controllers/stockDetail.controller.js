// src/controllers/stockDetail.controller.js
import prisma from "../config/prisma.js";

// ==================== GET PRODUCT DETAIL ====================
export const getProductDetail = async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        supplier: { 
          select: { 
            id: true, 
            name: true, 
            phone: true, 
            email: true 
          } 
        },
        stockTransactions: {
          take: 20,
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { name: true } },
          },
        },
        productionBatches: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            batchNumber: true,
            quantityProduced: true,
            createdAt: true,
          },
        },
        salesOrderItems: {
          take: 20,
          orderBy: { salesOrder: { createdAt: "desc" } },
          include: {
            salesOrder: {
              select: {
                id: true,
                orderNumber: true,
                createdAt: true,
                customer: { select: { name: true } },
              },
            },
          },
        },
      },
    });
    
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }
    
    // Get last production batch
    const lastProduction = await prisma.productionBatch.findFirst({
      where: { productId: id },
      orderBy: { createdAt: "desc" },
      select: {
        quantityProduced: true,
        createdAt: true,
      },
    });
    
    // Get last sale
    const lastSale = await prisma.salesOrderItem.findFirst({
      where: { productId: id },
      orderBy: { salesOrder: { createdAt: "desc" } },
      include: {
        salesOrder: {
          select: {
            createdAt: true,
            customer: { select: { name: true } },
          },
        },
      },
    });
    
    // Calculate total stock value
    const totalStockValue = product.currentStock * (product.costPrice || 0);
    
    // Format recent activity
    const recentActivity = product.stockTransactions.slice(0, 10).map(tx => ({
      type: tx.type,
      quantity: tx.quantity,
      note: tx.note,
      createdAt: tx.createdAt,
      user: tx.user?.name,
    }));
    
    res.json({
      success: true,
      data: {
        ...product,
        totalStockValue,
        lastProduction: lastProduction ? {
          quantity: lastProduction.quantityProduced,
          date: lastProduction.createdAt,
        } : null,
        lastSale: lastSale ? {
          date: lastSale.salesOrder.createdAt,
          customer: lastSale.salesOrder.customer?.name,
          quantity: lastSale.quantity,
        } : null,
        recentActivity,
      },
    });
  } catch (err) {
    console.error("Error in getProductDetail:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== GET RAW MATERIAL DETAIL ====================
export const getRawMaterialDetail = async (req, res) => {
  try {
    const { id } = req.params;
    
    const rawMaterial = await prisma.rawMaterial.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        supplier: { 
          select: { 
            id: true, 
            name: true, 
            phone: true, 
            email: true 
          } 
        },
        stockTransactions: {
          take: 20,
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { name: true } },
          },
        },
        purchaseOrderItems: {
          take: 10,
          orderBy: { purchaseOrder: { createdAt: "desc" } },
          include: {
            purchaseOrder: {
              select: {
                id: true,
                orderNumber: true,
                createdAt: true,
                supplier: { select: { name: true } },
              },
            },
          },
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
      return res.status(404).json({ success: false, message: "Raw material not found." });
    }
    
    // Calculate total stock value
    const totalStockValue = rawMaterial.currentStock * (rawMaterial.unitCost || 0);
    
    // Get last purchase
    const lastPurchase = await prisma.purchaseOrderRawMaterial.findFirst({
      where: { rawMaterialId: id },
      orderBy: { purchaseOrder: { createdAt: "desc" } },
      include: {
        purchaseOrder: {
          select: {
            createdAt: true,
            supplier: { select: { name: true } },
          },
        },
      },
    });
    
    // Get products that use this raw material
    const usedInProducts = await prisma.$queryRaw`
      SELECT DISTINCT p.id, p.name, p.unit 
      FROM "Product" p
      WHERE p.id IN (
        SELECT DISTINCT st."productId" 
        FROM "StockTransaction" st 
        WHERE st."rawMaterialId" = ${id}
        AND st."productId" IS NOT NULL
      )
      LIMIT 10
    `;
    
    // Format recent activity
    const recentActivity = rawMaterial.stockTransactions.slice(0, 10).map(tx => ({
      type: tx.type,
      quantity: tx.quantity,
      note: tx.note,
      createdAt: tx.createdAt,
      user: tx.user?.name,
    }));
    
    res.json({
      success: true,
      data: {
        ...rawMaterial,
        totalStockValue,
        lastPurchase: lastPurchase ? {
          date: lastPurchase.purchaseOrder.createdAt,
          supplier: lastPurchase.purchaseOrder.supplier?.name,
          unitPrice: lastPurchase.unitPrice,
          quantity: lastPurchase.quantity,
        } : null,
        usedInProducts: usedInProducts || [],
        recentActivity,
      },
    });
  } catch (err) {
    console.error("Error in getRawMaterialDetail:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};