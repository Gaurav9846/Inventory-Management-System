// src/routes/analytics.routes.js
import { Router } from "express";
import { getDashboardSummary, getStockMovement, getTopProducts, getRevenueSummary, getDemandForecast, getAuditLogs } from "../controllers/analytics.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";

const router = Router();
router.use(protect);

router.get("/dashboard",        getDashboardSummary);
router.get("/stock-movement",   getStockMovement);
router.get("/top-products",     getTopProducts);
router.get("/revenue",          restrictTo("ADMIN", "MANAGER"), getRevenueSummary);
router.get("/demand-forecast",  getDemandForecast);
router.get("/audit-logs",       restrictTo("ADMIN"), getAuditLogs);

export default router;
