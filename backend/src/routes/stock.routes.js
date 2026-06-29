// src/routes/stock.routes.js
import { Router } from "express";
import { 
  getStockTransactions, 
  stockIn, 
  stockOut, 
  adjustStock,
  getStockOverview  // ✅ ADD THIS
} from "../controllers/stock.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";

const router = Router();
router.use(protect);

router.get("/overview", getStockOverview);  // ✅ ADD THIS
router.get("/transactions", getStockTransactions);
router.post("/in", stockIn);
router.post("/out", stockOut);
router.post("/adjust", restrictTo("ADMIN", "MANAGER"), adjustStock);

export default router;