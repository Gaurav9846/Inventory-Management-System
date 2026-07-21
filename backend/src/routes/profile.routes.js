// src/routes/profile.routes.js
import { Router } from "express";
import {
  requestProfileChange,
  getMyProfileChangeRequests,
  getAllProfileChangeRequests,
  approveProfileChangeRequest,
  rejectProfileChangeRequest,
} from "../controllers/profile.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";

const router = Router();

// All routes require authentication
router.use(protect);

// Staff/Manager routes
router.post("/request-change", requestProfileChange);
router.get("/my-requests", getMyProfileChangeRequests);

// Admin only routes
router.get("/admin/requests", restrictTo("ADMIN"), getAllProfileChangeRequests);
router.patch("/admin/requests/:id/approve", restrictTo("ADMIN"), approveProfileChangeRequest);
router.patch("/admin/requests/:id/reject", restrictTo("ADMIN"), rejectProfileChangeRequest);

export default router;