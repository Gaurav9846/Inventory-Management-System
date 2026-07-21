// src/utils/counter.js

import prisma from "../config/prisma.js";

/**
 * Get today's date in YYYYMMDD format
 */
const getTodayDate = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Get the next sequential number for a prefix
 * @param {string} prefix - "SO", "PO", "SINV", "PINV", "CP" (Credit Payment)
 * @param {string} date - Optional date string (defaults to today)
 * @returns {Promise<number>}
 */
export const getNextCounter = async (prefix, date = null) => {
  const counterDate = date || getTodayDate();

  const result = await prisma.$transaction(async (tx) => {
    let counter = await tx.orderCounter.findUnique({
      where: {
        prefix_date: {
          prefix: prefix,
          date: counterDate,
        },
      },
    });

    if (!counter) {
      counter = await tx.orderCounter.create({
        data: {
          prefix: prefix,
          date: counterDate,
          lastNumber: 0,
        },
      });
    }

    const updatedCounter = await tx.orderCounter.update({
      where: { id: counter.id },
      data: {
        lastNumber: {
          increment: 1,
        },
      },
    });

    return updatedCounter.lastNumber;
  });

  return result;
};

/**
 * Generate a formatted order number with counter
 * @param {string} prefix - "SO", "PO", "SINV", "PINV", "CP"
 * @param {string} date - Optional date string
 * @returns {Promise<string>}
 */
export const generateOrderNumber = async (prefix, date = null) => {
  const counterDate = date || getTodayDate();
  const number = await getNextCounter(prefix, counterDate);
  const paddedNumber = String(number).padStart(4, '0');
  
  return `${prefix}-${counterDate}-${paddedNumber}`;
};

/**
 * Generate Sales Order Number
 */
export const generateSalesOrderNumber = async () => {
  return await generateOrderNumber('SO');
};

/**
 * Generate Purchase Order Number
 */
export const generatePurchaseOrderNumber = async () => {
  return await generateOrderNumber('PO');
};

/**
 * Generate Sales Invoice Number
 */
export const generateSalesInvoiceNumber = async () => {
  return await generateOrderNumber('SINV');
};

/**
 * Generate Purchase Invoice Number
 */
export const generatePurchaseInvoiceNumber = async () => {
  return await generateOrderNumber('PINV');
};

/**
 * ✅ Generate Credit Payment Number (Auto-increment)
 */
export const generateCreditPaymentNumber = async () => {
  return await generateOrderNumber('CP');
};

/**
 * Reset counter for testing or new year
 */
export const resetCounter = async (prefix, date = null) => {
  const counterDate = date || getTodayDate();
  await prisma.orderCounter.updateMany({
    where: {
      prefix: prefix,
      date: counterDate,
    },
    data: {
      lastNumber: 0,
    },
  });
};

/**
 * Get current counter value for a prefix
 */
export const getCurrentCounter = async (prefix, date = null) => {
  const counterDate = date || getTodayDate();
  const counter = await prisma.orderCounter.findUnique({
    where: {
      prefix_date: {
        prefix: prefix,
        date: counterDate,
      },
    },
  });
  return counter?.lastNumber || 0;
};

/**
 * Get all counters for a specific date
 */
export const getAllCounters = async (date = null) => {
  const counterDate = date || getTodayDate();
  return await prisma.orderCounter.findMany({
    where: {
      date: counterDate,
    },
    orderBy: {
      prefix: 'asc',
    },
  });
};

export default {
  getNextCounter,
  generateOrderNumber,
  generateSalesOrderNumber,
  generatePurchaseOrderNumber,
  generateSalesInvoiceNumber,
  generatePurchaseInvoiceNumber,
  generateCreditPaymentNumber, // ✅ Added to default export
  resetCounter,
  getCurrentCounter,
  getAllCounters,
};