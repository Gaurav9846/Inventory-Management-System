# Fusion IMS – Backend v2 (ES6 Modules)

**Inventory Management System – Water Company**  
Fusion I.T. Solutions · Pokhara

---

## Stack

| | |
|---|---|
| Runtime | Node.js (ESM `"type":"module"`) |
| Framework | Express 5 |
| ORM | Prisma 6 |
| Database | PostgreSQL (Neon hosted) |
| Auth | JWT + bcrypt |
| Email | Nodemailer (Gmail SMTP) |
| Uploads | Multer (memoryStorage) → Cloudinary v2 |
| Payments | Khalti (Nepal) |
| Dev | Nodemon |

---

## Quick Start

```bash
# 1. Install
npm install

# 2. .env is already configured — verify DATABASE_URL is correct

# 3. Generate Prisma client & push schema to Neon
npm run prisma:generate
npm run prisma:migrate

# 4. Seed (creates admin + 4 categories)
npm run prisma:seed
# → admin@fusionit.com  |  Admin@123

# 5. Run
npm run dev
# → http://localhost:3000
```

---

## Project Structure

```
ims-backend/
├── server.js
├── package.json              ("type": "module")
├── .env
├── prisma/
│   ├── schema.prisma         13 models · 6 enums
│   └── seed.js
└── src/
    ├── config/
    │   ├── prisma.js         Singleton PrismaClient
    │   ├── cloudinary.js     uploadBuffer() · deleteImage()
    │   └── nodemailer.js     sendEmail()
    ├── middleware/
    │   ├── auth.middleware.js    protect (JWT)
    │   ├── role.middleware.js    restrictTo(...roles)
    │   └── upload.middleware.js  multer memoryStorage
    ├── controllers/          13 controllers
    ├── routes/               13 route files
    └── utils/
        ├── auditLog.js
        ├── emailTemplates.js
        ├── generateOrderNumber.js
        └── lowStockAlert.js
```

---

## API Reference

### Auth  `POST /api/auth/login` · `GET /api/auth/me` · `PATCH /api/auth/change-password`

### Users  `GET|POST /api/users` · `GET|PATCH|DELETE /api/users/:id`

### Categories  `GET|POST /api/categories` · `GET|PATCH|DELETE /api/categories/:id`

### Products
| | |
|---|---|
| `GET /api/products` | `?search=&categoryId=&supplierId=&lowStock=true` |
| `POST /api/products` | multipart/form-data – field `image` for upload |
| `PATCH /api/products/:id` | multipart/form-data |
| `DELETE /api/products/:id` | ADMIN only |

### Stock
| | |
|---|---|
| `GET /api/stock/transactions` | `?productId=&type=IN\|OUT\|ADJUSTMENT&page=&limit=` |
| `POST /api/stock/in`  | `{ productId, quantity, note }` |
| `POST /api/stock/out` | `{ productId, quantity, note }` – triggers low-stock alert |
| `POST /api/stock/adjust` | `{ productId, newQuantity, note }` – ADMIN/MANAGER |

### Suppliers  `GET|POST /api/suppliers` · `GET|PATCH|DELETE /api/suppliers/:id`

### Purchase Orders
| | |
|---|---|
| `GET|POST /api/purchase-orders` | POST body: `{ supplierId, notes, items:[{productId,quantity,unitPrice}] }` |
| `PATCH /api/purchase-orders/:id/status` | `{ status }` – RECEIVED auto stocks IN |
| `DELETE /api/purchase-orders/:id` | ADMIN only |

### Customers  `GET|POST /api/customers` · `GET|PATCH|DELETE /api/customers/:id`

### Sales Orders
| | |
|---|---|
| `GET|POST /api/sales-orders` | POST body: `{ customerId, notes, items:[...] }` |
| `PATCH /api/sales-orders/:id/status` | DISPATCHED auto stocks OUT |
| `DELETE /api/sales-orders/:id` | ADMIN/MANAGER |

### Deliveries  `GET|POST /api/deliveries` · `GET /api/deliveries/:id` · `PATCH /api/deliveries/:id/status`

### Payments (Khalti)
| | |
|---|---|
| `POST /api/payments/initiate` | `{ salesOrderId }` → returns `{ pidx, payment_url }` |
| `POST /api/payments/verify`   | `{ pidx }` → verifies with Khalti, marks COMPLETED |
| `GET /api/payments/order/:salesOrderId` | get payment record |

### Alerts  `GET /api/alerts?isRead=false` · `PATCH /api/alerts/:id/read` · `PATCH /api/alerts/read-all` · `DELETE /api/alerts/:id`

### Analytics
| | |
|---|---|
| `GET /api/analytics/dashboard` | totals, unread alerts, recent transactions |
| `GET /api/analytics/stock-movement?days=30` | daily IN/OUT chart data |
| `GET /api/analytics/top-products?limit=10&days=30` | fast-movers |
| `GET /api/analytics/revenue?months=6` | monthly revenue (ADMIN/MANAGER) |
| `GET /api/analytics/demand-forecast?productId=&period=7` | moving average |
| `GET /api/analytics/audit-logs` | ADMIN only |

---

## Khalti Payment Flow

```
Frontend                     Backend                      Khalti
   │                             │                            │
   │── POST /payments/initiate ──▶ initiatePayment()          │
   │                             │── POST /epayment/initiate ─▶
   │                             │◀─ { pidx, payment_url } ───│
   │◀── { payment_url } ─────────│                            │
   │                             │                            │
   │── redirect to payment_url ──────────────────────────────▶│
   │◀─ redirect to FRONTEND_URL/payment/verify?pidx=... ──────│
   │                             │                            │
   │── POST /payments/verify ───▶ verifyPayment({ pidx })     │
   │                             │── POST /epayment/lookup ──▶│
   │                             │◀─ { status: "Completed" } ─│
   │                             │  update DB + email receipt │
   │◀── { transactionId, ... } ──│                            │
```

---

## Roles

| Role | Capabilities |
|---|---|
| **ADMIN** | Full access — user management, delete, audit logs, revenue |
| **MANAGER** | CRUD on inventory, orders, suppliers, customers, analytics |
| **STAFF** | Stock IN/OUT, view products/orders, create sales orders |
