// src/routes/rawMaterial.routes.js
import { Router } from "express";
import {
  getAllRawMaterials,
  getRawMaterialById,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
  updateRawMaterialStock,
} from "../controllers/rawMaterial.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";

const router = Router();
router.use(protect);

// Public for authenticated users
router.get("/", getAllRawMaterials);
router.get("/:id", getRawMaterialById);

// Admin/Manager only
router.post("/", restrictTo("ADMIN", "MANAGER"), createRawMaterial);
router.patch("/:id", restrictTo("ADMIN", "MANAGER"), updateRawMaterial);
router.delete("/:id", restrictTo("ADMIN"), deleteRawMaterial);
router.patch("/:id/stock", restrictTo("ADMIN", "MANAGER"), updateRawMaterialStock);

export default router;