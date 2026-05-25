// src/routes/payment.routes.js
import { Router } from "express";
import { initiatePayment, verifyPayment, getPaymentByOrder } from "../controllers/payment.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();
router.use(protect);

router.post("/initiate",              initiatePayment);
router.post("/verify",                verifyPayment);
router.get("/order/:salesOrderId",    getPaymentByOrder);

export default router;
