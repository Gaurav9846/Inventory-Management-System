// src/routes/productCatalog.routes.js
import { Router } from "express";
import {
  getProductCatalog,
  createCatalogProduct,
  updateCatalogProduct,
  archiveCatalogProduct,
  restoreCatalogProduct,
  getCatalogStats,
  getCatalogCategories,
  createProductCategory,
  createRawMaterialCategory,
} from "../controllers/productCatalog.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";

const router = Router();
router.use(protect);

// Product Catalog routes
router.get("/", restrictTo("ADMIN", "MANAGER"), getProductCatalog);
router.get("/stats", restrictTo("ADMIN", "MANAGER"), getCatalogStats);
router.get("/categories", restrictTo("ADMIN", "MANAGER"), getCatalogCategories);
router.post("/", restrictTo("ADMIN"), createCatalogProduct);
router.patch("/:id", restrictTo("ADMIN"), updateCatalogProduct);
router.patch("/:id/archive", restrictTo("ADMIN"), archiveCatalogProduct);
router.patch("/:id/restore", restrictTo("ADMIN"), restoreCatalogProduct);

// Category creation routes
router.post("/categories/product", restrictTo("ADMIN"), createProductCategory);
router.post("/categories/raw-material", restrictTo("ADMIN"), createRawMaterialCategory);

export default router;