// src/routes/stockDetail.routes.js
import { Router } from "express";
import {
  getProductDetail,
  getRawMaterialDetail,
} from "../controllers/stockDetail.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();
router.use(protect);

router.get("/product/:id", getProductDetail);
router.get("/raw-material/:id", getRawMaterialDetail);

export default router;