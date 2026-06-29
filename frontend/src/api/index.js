// src/api/index.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ims_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("ims_token");
      localStorage.removeItem("ims_user");
      const role = localStorage.getItem("ims_role");
      localStorage.removeItem("ims_role");
      if (role === "MANAGER") window.location.href = "/manager";
      else if (role === "STAFF") window.location.href = "/staff";
      else window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

export const authApi = {
  login:          (data) => api.post("/auth/login", data),
  me:             ()     => api.get("/auth/me"),
  changePassword: (data) => api.patch("/auth/change-password", data),
};

export const usersApi = {
  getAll:  ()         => api.get("/users"),
  getById: (id)       => api.get(`/users/${id}`),
  create:  (data)     => api.post("/users", data),
  update:  (id, data) => api.patch(`/users/${id}`, data),
  remove:  (id)       => api.delete(`/users/${id}`),
};

export const categoriesApi = {
  getAll:  ()         => api.get("/categories"),
  getById: (id)       => api.get(`/categories/${id}`),
  create:  (data)     => api.post("/categories", data),
  update:  (id, data) => api.patch(`/categories/${id}`, data),
  remove:  (id)       => api.delete(`/categories/${id}`),
};

export const productsApi = {
  getAll:  (params)      => api.get("/products", { params }),
  getById: (id)          => api.get(`/products/${id}`),
  create:  (formData)    => api.post("/products", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  update:  (id, formData)=> api.patch(`/products/${id}`, formData, { headers: { "Content-Type": "multipart/form-data" } }),
  remove:  (id)          => api.delete(`/products/${id}`),
};

export const stockApi = {
  getTransactions: (params) => api.get("/stock/transactions", { params }),
  in:     (data) => api.post("/stock/in", data),
  out:    (data) => api.post("/stock/out", data),
  adjust: (data) => api.post("/stock/adjust", data),
  getOverview: () => api.get("/stock/overview"),
};


// ==================== SUPPLIER API ====================
export const suppliersApi = {
  getAll: (params) => api.get("/suppliers", { params }),
  getStats: () => api.get("/suppliers/stats"),
  getById: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post("/suppliers", data),
  update: (id, data) => api.patch(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
  getByCategory: (category) => api.get(`/suppliers/category/${category}`),
  getRawMaterialCategories: () => api.get("/suppliers/categories/raw-materials"),
};

// ==================== RAW MATERIAL API ====================
export const rawMaterialsApi = {
  getAll: (params) => api.get("/raw-materials", { params }),
  getById: (id) => api.get(`/raw-materials/${id}`),
  create: (data) => api.post("/raw-materials", data),
  update: (id, data) => api.patch(`/raw-materials/${id}`, data),
  delete: (id) => api.delete(`/raw-materials/${id}`),
  updateStock: (id, data) => api.patch(`/raw-materials/${id}/stock`, data),
};

// ==================== PURCHASE ORDER API ====================
export const purchaseOrdersApi = {
  getAll: (params) => api.get("/purchase-orders", { params }),
  getById: (id) => api.get(`/purchase-orders/${id}`),
  create: (data) => api.post("/purchase-orders", data),
  updateStatus: (id, status) => api.patch(`/purchase-orders/${id}/status`, { status }),
  delete: (id) => api.delete(`/purchase-orders/${id}`),
  addPayment: (id, data) => api.post(`/purchase-orders/${id}/payments`, data),
  getPayments: (id) => api.get(`/purchase-orders/${id}/payments`),
  receiveGoods: (id, data) => api.post(`/purchase-orders/${id}/receive`, data),
   uploadInvoice: (id, formData) => api.post(`/purchase-orders/${id}/invoices`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  }),
  getInvoices: (id) => api.get(`/purchase-orders/${id}/invoices`),
  deleteInvoice: (id, invoiceId) => api.delete(`/purchase-orders/${id}/invoices/${invoiceId}`),
};

export const customersApi = {
  getAll:  (params)   => api.get("/customers", { params }),
  getById: (id)       => api.get(`/customers/${id}`),
  create:  (data)     => api.post("/customers", data),
  update:  (id, data) => api.patch(`/customers/${id}`, data),
  remove:  (id)       => api.delete(`/customers/${id}`),
  getCreditInfo: (id) => api.get(`/credit/customer/${id}`),
};

export const salesOrdersApi = {
  getAll:       (params)     => api.get("/sales-orders", { params }),
  getById:      (id)         => api.get(`/sales-orders/${id}`),
  create:       (data)       => api.post("/sales-orders", data),
  updateStatus: (id, status) => api.patch(`/sales-orders/${id}/status`, { status }),
  remove:       (id)         => api.delete(`/sales-orders/${id}`),
  getDashboardStats: ()      => api.get("/sales-orders/dashboard-stats"),
  getRecentOrders:   ()      => api.get("/sales-orders/recent"),
  getStaffOrders:    ()      => api.get("/sales-orders/staff"), // ✅ ADD THIS
};

export const deliveriesApi = {
  getAll:       (params)    => api.get("/deliveries", { params }),
  getById:      (id)        => api.get(`/deliveries/${id}`),
  create:       (data)      => api.post("/deliveries", data),
  updateStatus: (id, data)  => api.patch(`/deliveries/${id}/status`, data),
  getHistory:   (params)    => api.get("/deliveries/history", { params }),
  getKanban:    ()          => api.get("/deliveries/kanban"), // ✅ ADD THIS
};

export const notificationsApi = {
  getAll: (params) => api.get("/notifications", { params }),
  getStats: () => api.get("/notifications/stats"),
  getById: (id) => api.get(`/notifications/${id}`),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch("/notifications/read-all"),
  delete: (id) => api.delete(`/notifications/${id}`),
  deleteAllRead: () => api.delete("/notifications/delete-all-read"),
  create: (data) => api.post("/notifications", data),
  resendEmail: (id) => api.post(`/notifications/${id}/resend-email`),
  getPreferences: () => api.get("/notifications/preferences"),
  updatePreferences: (data) => api.patch("/notifications/preferences", data),
};

export const analyticsApi = {
  dashboard:     ()       => api.get("/analytics/dashboard"),
  stockMovement: (params) => api.get("/analytics/stock-movement", { params }),
  topProducts:   (params) => api.get("/analytics/top-products", { params }),
  revenue:       (params) => api.get("/analytics/revenue", { params }),
  demandForecast:(params) => api.get("/analytics/demand-forecast", { params }),
  auditLogs:     (params) => api.get("/analytics/audit-logs", { params }),
};

export const paymentsApi = {
  initiate:   (data)         => api.post("/payments/initiate", data),
  verify:     (data)         => api.post("/payments/verify", data),
  getByOrder: (salesOrderId) => api.get(`/payments/order/${salesOrderId}`),
};

// Credit API
export const creditApi = {
  getAccounts: () => api.get("/credit/accounts"),
  getTransactions: (params) => api.get("/credit/transactions", { params }),
  getSummary: () => api.get("/credit/summary"),
  getCustomerInfo: (id) => api.get(`/credit/customer/${id}`),
  recordPayment: (data) => api.post("/credit/record-payment", data), // ✅ Make sure this exists
};

export const stockAdjustmentApi = {
  // Staff endpoints
  getMyRequests: (params) => api.get("/stock-adjustments/my-requests", { params }),
  createRequest: (data) => api.post("/stock-adjustments/request", data),
  getRequestById: (id) => api.get(`/stock-adjustments/${id}`),
  
  // Manager endpoints
  getPending: () => api.get("/stock-adjustments/pending"),
  getAll: (params) => api.get("/stock-adjustments/all", { params }),
  getStats: () => api.get("/stock-adjustments/stats"),
  approve: (id) => api.patch(`/stock-adjustments/${id}/approve`),
  reject: (id, data) => api.patch(`/stock-adjustments/${id}/reject`, data),
};

export const staffPerformanceApi = {
  // Get leaderboard with optional month/year filter
  getLeaderboard: (params) => api.get("/staff-performance/leaderboard", { params }),
  
  // Get performance stats overview
  getStats: (params) => api.get("/staff-performance/stats", { params }),
  
  // Get detailed performance for a specific staff member
  getStaffDetails: (staffId, params) => api.get(`/staff-performance/${staffId}`, { params }),
  
  // Update performance score manually
  updateScore: (staffId, data) => api.patch(`/staff-performance/${staffId}/score`, data),
};