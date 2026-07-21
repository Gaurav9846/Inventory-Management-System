// src/routes/reports.routes.js
import { Router } from "express";
import {
  getDashboardReport,
  getRevenueReport,
  getTopProductsReport,
  getPaymentBreakdownReport,
  getCreditSummaryReport,
  getInventoryReport,
  exportReport,
} from "../controllers/reports.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";

const router = Router();

router.use(protect);
router.use(restrictTo("ADMIN", "MANAGER"));

router.get("/dashboard", getDashboardReport);
router.get("/revenue", getRevenueReport);
router.get("/top-products", getTopProductsReport);
router.get("/payment-breakdown", getPaymentBreakdownReport);
router.get("/credit-summary", getCreditSummaryReport);
router.get("/inventory", getInventoryReport);
router.get("/export", exportReport);

export default router;