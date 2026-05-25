// src/routes/product.routes.js
import { Router } from "express";
import { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct } from "../controllers/product.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";
import { uploadImage } from "../middleware/upload.middleware.js";

const router = Router();
router.use(protect);

router.get("/",    getAllProducts);
router.get("/:id", getProductById);
router.post("/",   restrictTo("ADMIN", "MANAGER"), uploadImage.single("image"), createProduct);
router.patch("/:id", restrictTo("ADMIN", "MANAGER"), uploadImage.single("image"), updateProduct);
router.delete("/:id", restrictTo("ADMIN"), deleteProduct);

export default router;
