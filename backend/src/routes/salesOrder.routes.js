// src/routes/salesOrder.routes.js
import { Router } from "express";
import { getAllSalesOrders, getSalesOrderById, createSalesOrder, updateSalesOrderStatus, deleteSalesOrder } from "../controllers/salesOrder.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";

const router = Router();
router.use(protect);

router.get("/",    getAllSalesOrders);
router.get("/:id", getSalesOrderById);
router.post("/",   createSalesOrder);
router.patch("/:id/status", restrictTo("ADMIN", "MANAGER"), updateSalesOrderStatus);
router.delete("/:id",       restrictTo("ADMIN", "MANAGER"), deleteSalesOrder);

export default router;
