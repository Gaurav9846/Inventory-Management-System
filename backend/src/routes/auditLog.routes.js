// src/routes/auditLog.routes.js
import { Router } from "express";
import {
  getAuditLogsList,
  getAuditLogStatsSummary,
  getAuditLogFilters,
  getAuditLogDetail,
} from "../controllers/auditLog.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";

const router = Router();
router.use(protect);
router.use(restrictTo("ADMIN")); // ✅ Only Admin can access

router.get("/", getAuditLogsList);
router.get("/stats", getAuditLogStatsSummary);
router.get("/filters", getAuditLogFilters);
router.get("/:id", getAuditLogDetail);

export default router;