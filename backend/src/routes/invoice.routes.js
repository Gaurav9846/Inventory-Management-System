// src/routes/invoice.routes.js

import { Router } from "express";
import {
  getAllSalesInvoices,
  getAllPurchaseInvoices,
  getSalesInvoiceById,
  getPurchaseInvoiceById,
  updateSalesInvoiceStatus,
  updatePurchaseInvoiceStatus,
  deleteSalesInvoice,
  deletePurchaseInvoice,
  getInvoiceStats,
} from "../controllers/invoice.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";

const router = Router();

router.use(protect);

// Stats
router.get("/stats", getInvoiceStats);

// Sales Invoices
router.get("/sales", getAllSalesInvoices);
router.get("/sales/:id", getSalesInvoiceById);
router.patch("/sales/:id/status", updateSalesInvoiceStatus);
router.delete("/sales/:id", restrictTo("ADMIN"), deleteSalesInvoice);

// Purchase Invoices
router.get("/purchase", getAllPurchaseInvoices);
router.get("/purchase/:id", getPurchaseInvoiceById);
router.patch("/purchase/:id/status", updatePurchaseInvoiceStatus);
router.delete("/purchase/:id", restrictTo("ADMIN"), deletePurchaseInvoice);

export default router;