// src/routes/customer.routes.js
import { Router } from "express";
import { 
  getAllCustomers, 
  getCustomerById, 
  createCustomer, 
  updateCustomer, 
  deleteCustomer 
} from "../controllers/customer.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();
router.use(protect);

router.get("/", getAllCustomers);      // ✅ List all customers
router.get("/:id", getCustomerById);   // ✅ Get single customer with history
router.post("/", createCustomer);
router.patch("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);

export default router;