// src/routes/user.routes.js
import { Router } from "express";
import { getAllUsers, getUserById, createUser, updateUser, deleteUser } from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";

const router = Router();
router.use(protect);

router.get("/",    restrictTo("ADMIN", "MANAGER"), getAllUsers);
router.get("/:id", restrictTo("ADMIN", "MANAGER"), getUserById);
router.post("/",   restrictTo("ADMIN"),             createUser);
router.patch("/:id", restrictTo("ADMIN"),           updateUser);
router.delete("/:id", restrictTo("ADMIN"),          deleteUser);

export default router;
