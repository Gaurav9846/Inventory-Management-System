// src/routes/credit.routes.js

import { Router } from "express";
import {
  getCreditAccounts,
  getCustomerLedger,
  getCreditSummary,
  recordCreditPayment,
} from "../controllers/credit.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.use(protect);

// GET routes
router.get("/accounts", getCreditAccounts);
router.get("/ledger/:customerId", getCustomerLedger);
router.get("/summary", getCreditSummary);

// POST routes
router.post("/record-payment", recordCreditPayment);

export default router;