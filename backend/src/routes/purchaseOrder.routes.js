// src/routes/purchaseOrder.routes.js
import { Router } from "express";
import {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  deletePurchaseOrder,
  addPayment,
  receiveGoods,
   uploadInvoice, 
   getInvoices, 
   deleteInvoice
} from "../controllers/purchaseOrder.controller.js";
import { uploadImage } from "../middleware/upload.middleware.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";

const router = Router();
router.use(protect);

// Only ADMIN and MANAGER can access purchase orders (STAFF cannot)
router.get("/", restrictTo("ADMIN", "MANAGER"), getAllPurchaseOrders);
router.get("/:id", restrictTo("ADMIN", "MANAGER"), getPurchaseOrderById);
router.post("/", restrictTo("ADMIN", "MANAGER"), createPurchaseOrder);
router.patch("/:id/status", restrictTo("ADMIN", "MANAGER"), updatePurchaseOrderStatus);
router.delete("/:id", restrictTo("ADMIN"), deletePurchaseOrder);
router.post("/:id/payments", restrictTo("ADMIN", "MANAGER"), addPayment);
router.post("/:id/receive", restrictTo("ADMIN", "MANAGER"), receiveGoods);



// Invoice routes
router.post("/:id/invoices", restrictTo("ADMIN", "MANAGER"), uploadImage.single("invoice"), uploadInvoice);
router.get("/:id/invoices", restrictTo("ADMIN", "MANAGER"), getInvoices);
router.delete("/:id/invoices/:invoiceId", restrictTo("ADMIN", "MANAGER"), deleteInvoice);
export default router;