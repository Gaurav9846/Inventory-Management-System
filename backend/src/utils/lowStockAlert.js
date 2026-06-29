// src/utils/lowStockAlert.js
import { checkAndCreateLowStockNotification } from "../controllers/notification.controller.js";

/**
 * Check product stock and trigger notification if low
 * @param {Object} product - Product object with currentStock and reorderLevel
 */
export const checkAndTriggerLowStockAlert = async (product) => {
  await checkAndCreateLowStockNotification(product);
};

/**
 * Check all products for low stock (run on schedule)
 */
export const checkAllProductsLowStock = async () => {
  const products = await prisma.product.findMany({
    where: {
      currentStock: { lte: prisma.product.fields.reorderLevel },
    },
  });
  
  for (const product of products) {
    await checkAndCreateLowStockNotification(product);
  }
};