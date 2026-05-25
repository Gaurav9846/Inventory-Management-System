// src/routes/supplier.routes.js
import { Router } from "express";
import { getAllSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier } from "../controllers/supplier.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";

const router = Router();
router.use(protect);

router.get("/",    getAllSuppliers);
router.get("/:id", getSupplierById);
router.post("/",   restrictTo("ADMIN", "MANAGER"), createSupplier);
router.patch("/:id", restrictTo("ADMIN", "MANAGER"), updateSupplier);
router.delete("/:id", restrictTo("ADMIN"), deleteSupplier);

export default router;
