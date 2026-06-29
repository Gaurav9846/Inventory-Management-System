// src/routes/supplier.routes.js
import { Router } from "express";
import {
  getAllSuppliers,
  getSupplierStats,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSuppliersByCategory,
  getRawMaterialCategories,
} from "../controllers/supplier.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";

const router = Router();
router.use(protect);

// Public for authenticated users
router.get("/", getAllSuppliers);
router.get("/stats", getSupplierStats);
router.get("/categories/raw-materials", getRawMaterialCategories);
router.get("/category/:category", getSuppliersByCategory);
router.get("/:id", getSupplierById);

// Admin/Manager only
router.post("/", restrictTo("ADMIN", "MANAGER"), createSupplier);
router.patch("/:id", restrictTo("ADMIN", "MANAGER"), updateSupplier);
router.delete("/:id", restrictTo("ADMIN"), deleteSupplier);

export default router;