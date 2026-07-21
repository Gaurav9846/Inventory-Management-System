// src/routes/rawMaterial.routes.js
import { Router } from "express";
import {
  getAllRawMaterials,
  getRawMaterialById,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
  archiveRawMaterial,
  restoreRawMaterial,
  updateRawMaterialStock,
  getRawMaterialStockOverview,
  getRawMaterialCategories,
  getRawMaterialsByCategory,
  getRawMaterialsBySupplier,
  createRawMaterialCategory,
  updateRawMaterialCategory,
  deleteRawMaterialCategory,
} from "../controllers/rawMaterial.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";

const router = Router();
router.use(protect);

// Public for authenticated users
router.get("/", getAllRawMaterials);
router.get("/categories", getRawMaterialCategories); // ✅ New
router.get("/overview/stock", getRawMaterialStockOverview);
router.get("/by-category/:categoryId", getRawMaterialsByCategory); // ✅ New
router.get("/by-supplier/:supplierId", getRawMaterialsBySupplier); // ✅ New
router.get("/:id", getRawMaterialById);

// Admin/Manager only
router.post("/", restrictTo("ADMIN", "MANAGER"), createRawMaterial);
router.patch("/:id", restrictTo("ADMIN", "MANAGER"), updateRawMaterial);
router.patch("/:id/archive", restrictTo("ADMIN"), archiveRawMaterial); // ✅ New
router.patch("/:id/restore", restrictTo("ADMIN"), restoreRawMaterial); // ✅ New
router.delete("/:id", restrictTo("ADMIN"), deleteRawMaterial);
router.patch("/:id/stock", restrictTo("ADMIN", "MANAGER"), updateRawMaterialStock);

// Category management (Admin only)
router.post("/categories", restrictTo("ADMIN"), createRawMaterialCategory); // ✅ New
router.patch("/categories/:id", restrictTo("ADMIN"), updateRawMaterialCategory); // ✅ New
router.delete("/categories/:id", restrictTo("ADMIN"), deleteRawMaterialCategory); // ✅ New

export default router;