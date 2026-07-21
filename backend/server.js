// backend/server.js
import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes          from "./src/routes/auth.routes.js";
import userRoutes          from "./src/routes/user.routes.js";
import categoryRoutes      from "./src/routes/category.routes.js";
import productRoutes       from "./src/routes/product.routes.js";
import stockRoutes         from "./src/routes/stock.routes.js";
import supplierRoutes      from "./src/routes/supplier.routes.js";
import rawMaterialRoutes   from "./src/routes/rawMaterial.routes.js";
import purchaseOrderRoutes from "./src/routes/purchaseOrder.routes.js";
import customerRoutes      from "./src/routes/customer.routes.js";
import salesOrderRoutes    from "./src/routes/salesOrder.routes.js";
import deliveryRoutes      from "./src/routes/delivery.routes.js";
import paymentRoutes       from "./src/routes/payment.routes.js";
import notificationRoutes  from "./src/routes/notification.routes.js";
import analyticsRoutes     from "./src/routes/analytics.routes.js";
import creditRoutes        from "./src/routes/credit.routes.js";
import { connectDB }       from './src/config/db.js';
import stockAdjustmentRoutes from "./src/routes/stockAdjustment.routes.js";
import productionRoutes from "./src/routes/production.routes.js";
import reportsRoutes from "./src/routes/reports.routes.js";
import profileRoutes from "./src/routes/profile.routes.js";
import productCatalogRoutes from "./src/routes/productCatalog.routes.js";
import stockDetailRoutes from "./src/routes/stockDetail.routes.js";
import auditLogRoutes from "./src/routes/auditLog.routes.js";
import invoiceRoutes from "./src/routes/invoice.routes.js";

// ✅ Import cron jobs
import { startAllJobs } from "./src/jobs/cronjobs.js";

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://inventory-management-system-one-peach.vercel.app"
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "IMS Backend API is running",
  });
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status:    "OK",
    app:       "Fusion IMS – Inventory Management System",
    version:   "2.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth",             authRoutes);
app.use("/api/users",            userRoutes);
app.use("/api/categories",       categoryRoutes);
app.use("/api/products",         productRoutes);
app.use("/api/stock",            stockRoutes);
app.use("/api/suppliers",        supplierRoutes);
app.use("/api/raw-materials",    rawMaterialRoutes);
app.use("/api/purchase-orders",  purchaseOrderRoutes);
app.use("/api/customers",        customerRoutes);
app.use("/api/sales-orders",     salesOrderRoutes);
app.use("/api/deliveries",       deliveryRoutes);
app.use("/api/payments",         paymentRoutes);
app.use("/api/notifications",    notificationRoutes);
app.use("/api/analytics",        analyticsRoutes);
app.use("/api/credit",           creditRoutes);
app.use("/api/stock-adjustments", stockAdjustmentRoutes);
app.use("/api/production", productionRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/product-catalog", productCatalogRoutes);
app.use("/api/stock-detail", stockDetailRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/invoices", invoiceRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.url} not found.` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error.",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

console.log('\n📋 Registered Routes:');
console.log('  - /api/stock-adjustments/pending');
console.log('  - /api/stock-adjustments/stats');
console.log('  - /api/stock-adjustments/all');
console.log('  - /api/stock-adjustments/my-requests');
console.log('  - /api/stock-adjustments/request\n');

// ─── Start Server ─────────────────────────────────────────────────────────────
connectDB().then(() => {
  // ✅ Start all cron jobs after database connection
  startAllJobs();
  
  app.listen(PORT, () => {
    console.log(`\n🚀  Fusion IMS Server running on http://localhost:${PORT}`);
    console.log(`📋  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔑  Health check: http://localhost:${PORT}/api/health\n`);
  });
});

export default app;