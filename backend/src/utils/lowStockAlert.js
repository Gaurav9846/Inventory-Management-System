// src/utils/lowStockAlert.js
import prisma from "../config/prisma.js";
import { sendEmail } from "../config/nodemailer.js";
import { lowStockAlertTemplate } from "./emailTemplates.js";

/**
 * If currentStock <= reorderLevel, create an unread Alert and email all
 * ADMIN + MANAGER users (only if no unread alert already exists for the product).
 * @param {{ id, name, currentStock, reorderLevel, unit }} product
 */
export const checkAndTriggerLowStockAlert = async (product) => {
  if (product.currentStock > product.reorderLevel) return;

  const existing = await prisma.alert.findFirst({
    where: { productId: product.id, isRead: false },
  });
  if (existing) return;

  await prisma.alert.create({
    data: {
      productId: product.id,
      message: `Low stock: "${product.name}" has only ${product.currentStock} ${product.unit}(s) left (reorder level: ${product.reorderLevel}).`,
    },
  });

  const recipients = await prisma.user.findMany({
    where:  { role: { in: ["ADMIN", "MANAGER"] }, isActive: true },
    select: { email: true },
  });

  await Promise.allSettled(
    recipients.map(({ email }) =>
      sendEmail(
        email,
        `⚠️ Low Stock Alert – ${product.name}`,
        lowStockAlertTemplate(product.name, product.currentStock, product.reorderLevel)
      )
    )
  );
};
