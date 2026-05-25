// src/utils/auditLog.js
import prisma from "../config/prisma.js";

/**
 * Write an audit log entry (non-fatal).
 * @param {string} userId
 * @param {string} action   – "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | …
 * @param {string} entity   – "Product" | "PurchaseOrder" | …
 * @param {string|null} entityId
 * @param {object|null} details
 */
export const logAction = async (userId, action, entity, entityId = null, details = null) => {
  try {
    await prisma.auditLog.create({ data: { userId, action, entity, entityId, details } });
  } catch (err) {
    console.error("AuditLog error:", err.message);
  }
};
