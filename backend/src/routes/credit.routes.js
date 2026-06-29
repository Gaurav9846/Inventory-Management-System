// src/routes/credit.routes.js
import { Router } from "express";
import {
  getCreditAccounts,
  getPaymentTransactions,
  getCreditSummary,
  getCustomerCreditInfo,
  recordCreditPayment,
} from "../controllers/credit.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

// All credit routes require authentication
router.use(protect);

// GET routes
router.get("/accounts", getCreditAccounts);
router.get("/transactions", getPaymentTransactions);
router.get("/summary", getCreditSummary);
router.get("/customer/:customerId", getCustomerCreditInfo);

// POST routes
router.post("/record-payment", recordCreditPayment);

export default router;