// backend/src/routes/production.routes.js
import { Router } from "express";
import {
  getAllProductionBatches,
  getProductionBatchById,
  createProductionBatch,
  getProductionStats,
  deleteProductionBatch,
} from "../controllers/production.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";

const router = Router();
router.use(protect);

// Public for authenticated users
router.get("/", getAllProductionBatches);
router.get("/stats", getProductionStats);
router.get("/:id", getProductionBatchById);

// Manager/Admin only
router.post("/", restrictTo("ADMIN", "MANAGER"), createProductionBatch);
router.delete("/:id", restrictTo("ADMIN"), deleteProductionBatch);

export default router;