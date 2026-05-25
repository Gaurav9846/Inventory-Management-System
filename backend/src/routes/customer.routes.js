// src/routes/customer.routes.js
import { Router } from "express";
import { getAllCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer } from "../controllers/customer.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";

const router = Router();
router.use(protect);

router.get("/",    getAllCustomers);
router.get("/:id", getCustomerById);
router.post("/",   restrictTo("ADMIN", "MANAGER"), createCustomer);
router.patch("/:id", restrictTo("ADMIN", "MANAGER"), updateCustomer);
router.delete("/:id", restrictTo("ADMIN"), deleteCustomer);

export default router;
