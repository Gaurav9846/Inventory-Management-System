// src/utils/generateOrderNumber.js

/**
 * Generate a unique order number.
 * e.g.  generateOrderNumber("PO")  →  "PO-20260511-A4F2"
 * @param {string} prefix
 * @returns {string}
 */
export const generateOrderNumber = (prefix = "ORD") => {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `${prefix}-${date}-${rand}`;
};
