# Fusion IMS – Frontend

React + Tailwind CSS v4 + shadcn/ui · Inventory Management System

---

## Tech Stack

| | |
|---|---|
| Framework | React 19 (Vite 7) |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix UI primitives) |
| Routing | React Router v7 |
| HTTP | Axios |
| Forms | React Hook Form |
| Charts | Recharts |
| Toasts | Sonner |
| Icons | Lucide React + Heroicons |
| Dates | date-fns |

---

## Quick Start

```bash
npm install
npm run dev
# → http://localhost:5173
```

Make sure your backend is running on `http://localhost:3000`.

---

## Project Structure

```
src/
├── api/
│   └── index.js            All API calls (auth, products, stock…)
├── components/
│   ├── layout/
│   │   ├── Layout.jsx      App shell (sidebar + header + outlet)
│   │   ├── Sidebar.jsx     Role-aware navigation
│   │   └── Header.jsx      Top bar + user dropdown
│   ├── shared/
│   │   ├── PageHeader.jsx
│   │   ├── StatusBadge.jsx
│   │   ├── StatsCard.jsx
│   │   ├── ConfirmDialog.jsx
│   │   ├── LoadingSpinner.jsx
│   │   └── ProtectedRoute.jsx
│   └── ui/                 shadcn components (button, card, dialog…)
├── context/
│   └── AuthContext.jsx     JWT auth state + login/logout
├── lib/
│   └── utils.js            cn() helper
├── pages/
│   ├── Login.jsx
│   ├── Dashboard.jsx       Summary stats + recent transactions
│   ├── Analytics.jsx       Recharts – stock movement, revenue, top products
│   ├── Alerts.jsx          Low-stock notifications
│   ├── Products.jsx        CRUD + image upload + low-stock filter
│   ├── Categories.jsx
│   ├── Stock.jsx           IN / OUT / Adjust transactions
│   ├── Suppliers.jsx
│   ├── PurchaseOrders.jsx  Multi-item PO builder + status workflow
│   ├── Customers.jsx
│   ├── SalesOrders.jsx     Multi-item SO builder + dispatch workflow
│   ├── Deliveries.jsx      Delivery status tracker
│   ├── Users.jsx           Admin-only user management
│   ├── ChangePassword.jsx
│   └── NotFound.jsx
├── utils/
│   └── helpers.js          formatDate, formatCurrency, statusColors…
├── App.jsx                 All routes
└── main.jsx
```

---

## Pages & Access

| Page | Path | Access |
|---|---|---|
| Dashboard | `/` | All |
| Analytics | `/analytics` | All |
| Alerts | `/alerts` | ADMIN, MANAGER |
| Products | `/products` | All (edit: MANAGER+) |
| Categories | `/categories` | All (edit: MANAGER+) |
| Stock | `/stock` | All |
| Suppliers | `/suppliers` | All (edit: MANAGER+) |
| Purchase Orders | `/purchase-orders` | All (create/edit: MANAGER+) |
| Customers | `/customers` | All (edit: MANAGER+) |
| Sales Orders | `/sales-orders` | All |
| Deliveries | `/deliveries` | All (create: MANAGER+) |
| Users | `/users` | **ADMIN only** |
| Change Password | `/change-password` | All |

---

## Key Features

- **Role-aware sidebar** — menu items visible based on ADMIN / MANAGER / STAFF
- **Low-stock visual indicators** — red highlighting on products table + alert badge
- **Multi-item order forms** — dynamic add/remove rows for PO and SO creation
- **Auto price fill** — selecting a product in SO form pre-fills selling price
- **Status workflow buttons** — context-aware action buttons per order status
- **Recharts analytics** — area chart (stock movement), bar charts (revenue, top products)
- **Image upload preview** — live preview before upload via Cloudinary
- **Sonner toasts** — success/error feedback on every action
- **JWT auto-logout** — 401 response clears token and redirects to login
