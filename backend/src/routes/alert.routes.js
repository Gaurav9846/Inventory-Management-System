// src/routes/alert.routes.js
import { Router } from "express";
import { getAllAlerts, markAlertRead, markAllAlertsRead, deleteAlert } from "../controllers/alert.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";

const router = Router();
router.use(protect, restrictTo("ADMIN", "MANAGER"));

router.get("/",              getAllAlerts);
router.patch("/read-all",    markAllAlertsRead);
router.patch("/:id/read",    markAlertRead);
router.delete("/:id",        deleteAlert);

export default router;
