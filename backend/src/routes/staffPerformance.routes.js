// src/routes/staffPerformance.routes.js
import { Router } from "express";
import {
  getLeaderboard,
  getStaffPerformanceDetails,
  getPerformanceStats,
  updatePerformanceScore,
} from "../controllers/staffPerformance.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";

const router = Router();

// All routes require authentication
router.use(protect);

// Public for authenticated users (managers and admins)
router.get("/leaderboard", restrictTo("ADMIN", "MANAGER"), getLeaderboard);
router.get("/stats", restrictTo("ADMIN", "MANAGER"), getPerformanceStats);
router.get("/:staffId", restrictTo("ADMIN", "MANAGER"), getStaffPerformanceDetails);
router.patch("/:staffId/score", restrictTo("ADMIN", "MANAGER"), updatePerformanceScore);

export default router;