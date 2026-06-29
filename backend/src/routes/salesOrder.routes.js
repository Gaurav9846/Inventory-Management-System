// src/routes/salesOrder.routes.js
import { Router } from "express";
import {
  getAllSalesOrders,
  getSalesOrderById,
  createSalesOrder,
  updateSalesOrderStatus,
  deleteSalesOrder,
  getDashboardStats,
  getRecentOrders,
  getStaffOrders,
} from "../controllers/salesOrder.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";

const router = Router();
router.use(protect);

// Dashboard endpoints (all authenticated users including STAFF)
router.get("/dashboard-stats", getDashboardStats);
router.get("/recent", getRecentOrders);

// Staff orders (only PENDING & PROCESSING for processing)
router.get("/staff", getStaffOrders);

// ✅ FIXED: Allow STAFF to view all orders (for history/reference)
// Remove restrictTo or add STAFF to allowed roles
router.get("/", getAllSalesOrders);  // Changed: removed restrictTo

// Other endpoints
router.get("/:id", getSalesOrderById);
router.post("/", createSalesOrder);
router.patch("/:id/status", updateSalesOrderStatus); // Staff can update to PROCESSING/CANCELLED
router.delete("/:id", restrictTo("ADMIN", "MANAGER"), deleteSalesOrder);

export default router;