// src/routes/delivery.routes.js
import { Router } from "express";
import {
  getAllDeliveries,
  getDeliveryById,
  createDelivery,
  updateDeliveryStatus,
  getDeliveriesKanban,
  getOrderHistory,
} from "../controllers/delivery.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";

const router = Router();
router.use(protect);

router.get("/", getAllDeliveries);
router.get("/kanban", getDeliveriesKanban);
router.get("/history", getOrderHistory);
router.get("/:id", getDeliveryById);
router.post("/", restrictTo("ADMIN", "MANAGER"), createDelivery);
router.patch("/:id/status", updateDeliveryStatus); // Delivery staff can update

export default router;