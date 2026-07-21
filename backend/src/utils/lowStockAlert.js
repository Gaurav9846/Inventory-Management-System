// src/utils/lowStockAlert.js

import prisma from "../config/prisma.js";
import { checkAndCreateStockAlert, checkAndCreateLowStockNotification } from "../controllers/notification.controller.js";

/**
 * Check and trigger low stock/out of stock alert
 * Uses the notification controller which handles email sending
 */
export const checkAndTriggerLowStockAlert = async (product) => {
  if (!product) return;
  
  // Check if product is out of stock or low stock
  if (product.currentStock === 0 || product.currentStock <= product.reorderLevel) {
    await checkAndCreateStockAlert(product);
  }
};

/**
 * Check all products for low stock and out of stock (run on schedule)
 */
export const checkAllProductsLowStock = async () => {
  try {
    // Get all products that are either out of stock or below reorder level
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { currentStock: 0 }, // Out of stock
          { currentStock: { lte: prisma.product.fields.reorderLevel } } // Low stock
        ]
      },
      select: {
        id: true,
        name: true,
        currentStock: true,
        reorderLevel: true,
        unit: true,
        sku: true,
        category: { select: { name: true } }
      },
    });
    
    let createdCount = 0;
    
    for (const product of products) {
      // ✅ Use the exported function
      const notification = await checkAndCreateLowStockNotification(product);
      if (notification) createdCount++;
    }
    
    return createdCount;
  } catch (error) {
    console.error('Error checking low stock:', error);
    throw error;
  }
};

/**
 * Check specific product for out of stock
 */
export const checkOutOfStockProducts = async () => {
  try {
    const outOfStockProducts = await prisma.product.findMany({
      where: { currentStock: 0 },
      select: {
        id: true,
        name: true,
        currentStock: true,
        reorderLevel: true,
        unit: true,
        sku: true,
        category: { select: { name: true } }
      }
    });
    
    let createdCount = 0;
    
    for (const product of outOfStockProducts) {
      // Check if there's already an unread notification
      const existing = await prisma.notification.findFirst({
        where: {
          type: 'OUT_OF_STOCK',
          referenceId: product.id,
          isRead: false,
        },
      });
      
      if (!existing) {
        // ✅ Use the exported function
        const notification = await checkAndCreateLowStockNotification(product);
        if (notification) createdCount++;
      }
    }
    
    return createdCount;
  } catch (error) {
    console.error('Error checking out of stock products:', error);
    throw error;
  }
};

/**
 * Check raw materials for low stock and out of stock
 */
export const checkRawMaterialsStock = async () => {
  try {
    const rawMaterials = await prisma.rawMaterial.findMany({
      where: {
        OR: [
          { currentStock: 0 },
          { currentStock: { lte: prisma.rawMaterial.fields.reorderLevel } }
        ]
      },
      select: {
        id: true,
        name: true,
        currentStock: true,
        reorderLevel: true,
        unit: true,
        sku: true,
        category: { select: { name: true } }
      }
    });
    
    let createdCount = 0;
    
    for (const rawMaterial of rawMaterials) {
      const existing = await prisma.notification.findFirst({
        where: {
          type: rawMaterial.currentStock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
          referenceId: rawMaterial.id,
          referenceType: 'RawMaterial',
          isRead: false,
        },
      });
      
      if (!existing) {
        // ✅ Use the exported function
        const notification = await checkAndCreateLowStockNotification(rawMaterial);
        if (notification) createdCount++;
      }
    }
    
    return createdCount;
  } catch (error) {
    console.error('Error checking raw materials stock:', error);
    throw error;
  }
};