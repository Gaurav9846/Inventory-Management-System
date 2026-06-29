// src/routes/stockAdjustment.routes.js
import { Router } from "express";
import {
  getMyAdjustmentRequests,
  createAdjustmentRequest,
  getAdjustmentById,
  getPendingAdjustments,
  getAllAdjustments,
  approveAdjustment,
  rejectAdjustment,
  getAdjustmentStats,
} from "../controllers/stockAdjustment.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";

const router = Router();
router.use(protect);

// Staff
router.get("/my-requests", getMyAdjustmentRequests);
router.post("/request", createAdjustmentRequest);

// Manager/Admin
router.get("/pending", restrictTo("ADMIN", "MANAGER"), getPendingAdjustments);
router.get("/all", restrictTo("ADMIN", "MANAGER"), getAllAdjustments);
router.get("/stats", restrictTo("ADMIN", "MANAGER"), getAdjustmentStats);
router.patch("/:id/approve", restrictTo("ADMIN", "MANAGER"), approveAdjustment);
router.patch("/:id/reject", restrictTo("ADMIN", "MANAGER"), rejectAdjustment);

// KEEP THIS LAST
router.get("/:id", getAdjustmentById);
export default router;