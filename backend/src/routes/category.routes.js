// src/routes/category.routes.js
import { Router } from "express";
import { getAllCategories, getCategoryById, createCategory, updateCategory, deleteCategory } from "../controllers/category.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";

const router = Router();
router.use(protect);

router.get("/",    getAllCategories);
router.get("/:id", getCategoryById);
router.post("/",   restrictTo("ADMIN", "MANAGER"), createCategory);
router.patch("/:id", restrictTo("ADMIN", "MANAGER"), updateCategory);
router.delete("/:id", restrictTo("ADMIN"), deleteCategory);

export default router;
