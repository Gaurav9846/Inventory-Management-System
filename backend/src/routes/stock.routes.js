// src/routes/stock.routes.js
import { Router } from "express";
import { 
  getStockTransactions, 
  stockIn, 
  stockOut, 
  adjustStock,
  getStockOverview
} from "../controllers/stock.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";
import { checkOutOfStockProducts, checkRawMaterialsStock } from "../utils/lowStockAlert.js";

const router = Router();
router.use(protect);

router.get("/overview", getStockOverview);
router.get("/transactions", getStockTransactions);
router.post("/in", stockIn);
router.post("/out", stockOut);
router.post("/adjust", restrictTo("ADMIN", "MANAGER"), adjustStock);

// ✅ Route to manually check out of stock products (Admin/Manager only)
router.post("/check-out-of-stock", restrictTo("ADMIN", "MANAGER"), async (req, res) => {
  try {
    const productCount = await checkOutOfStockProducts();
    const rawMaterialCount = await checkRawMaterialsStock();
    const totalCount = productCount + rawMaterialCount;
    
    res.json({
      success: true,
      message: `Created ${totalCount} out of stock notifications (${productCount} products, ${rawMaterialCount} raw materials)`,
      data: {
        productNotifications: productCount,
        rawMaterialNotifications: rawMaterialCount,
        total: totalCount
      }
    });
  } catch (error) {
    console.error('Error checking out of stock:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;