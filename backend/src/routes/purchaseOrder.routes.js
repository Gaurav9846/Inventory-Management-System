// src/routes/purchaseOrder.routes.js
import { Router } from "express";
import { getAllPurchaseOrders, getPurchaseOrderById, createPurchaseOrder, updatePurchaseOrderStatus, deletePurchaseOrder } from "../controllers/purchaseOrder.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";

const router = Router();
router.use(protect);

router.get("/",    getAllPurchaseOrders);
router.get("/:id", getPurchaseOrderById);
router.post("/",   restrictTo("ADMIN", "MANAGER"), createPurchaseOrder);
router.patch("/:id/status", restrictTo("ADMIN", "MANAGER"), updatePurchaseOrderStatus);
router.delete("/:id",       restrictTo("ADMIN"), deletePurchaseOrder);

export default router;
