// src/routes/notification.routes.js
import { Router } from "express";
import {
  getAllNotifications,
  getNotificationStats,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
  resendEmailNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  createManualNotification,
} from "../controllers/notification.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";

const router = Router();

// All routes require authentication
router.use(protect);

// Notification CRUD
router.get("/", getAllNotifications);
router.get("/stats", getNotificationStats);
router.get("/:id", getNotificationById);
router.post("/", restrictTo("ADMIN", "MANAGER"), createManualNotification);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);
router.delete("/delete-all-read", deleteAllRead);
router.delete("/:id", deleteNotification);
router.post("/:id/resend-email", resendEmailNotification);

// Preferences
router.get("/preferences", getNotificationPreferences);
router.patch("/preferences", updateNotificationPreferences);

export default router;