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
};

export const suppliersApi = {
  getAll:  (params)   => api.get("/suppliers", { params }),
  getById: (id)       => api.get(`/suppliers/${id}`),
  create:  (data)     => api.post("/suppliers", data),
  update:  (id, data) => api.patch(`/suppliers/${id}`, data),
  remove:  (id)       => api.delete(`/suppliers/${id}`),
};

export const purchaseOrdersApi = {
  getAll:       (params)      => api.get("/purchase-orders", { params }),
  getById:      (id)          => api.get(`/purchase-orders/${id}`),
  create:       (data)        => api.post("/purchase-orders", data),
  updateStatus: (id, status)  => api.patch(`/purchase-orders/${id}/status`, { status }),
  remove:       (id)          => api.delete(`/purchase-orders/${id}`),
};

export const customersApi = {
  getAll:  (params)   => api.get("/customers", { params }),
  getById: (id)       => api.get(`/customers/${id}`),
  create:  (data)     => api.post("/customers", data),
  update:  (id, data) => api.patch(`/customers/${id}`, data),
  remove:  (id)       => api.delete(`/customers/${id}`),
};

export const salesOrdersApi = {
  getAll:       (params)     => api.get("/sales-orders", { params }),
  getById:      (id)         => api.get(`/sales-orders/${id}`),
  create:       (data)       => api.post("/sales-orders", data),
  updateStatus: (id, status) => api.patch(`/sales-orders/${id}/status`, { status }),
  remove:       (id)         => api.delete(`/sales-orders/${id}`),
};

export const deliveriesApi = {
  getAll:       (params)    => api.get("/deliveries", { params }),
  getById:      (id)        => api.get(`/deliveries/${id}`),
  create:       (data)      => api.post("/deliveries", data),
  updateStatus: (id, data)  => api.patch(`/deliveries/${id}/status`, data),
};

export const alertsApi = {
  getAll:      (params) => api.get("/alerts", { params }),
  markRead:    (id)     => api.patch(`/alerts/${id}/read`),
  markAllRead: ()       => api.patch("/alerts/read-all"),
  remove:      (id)     => api.delete(`/alerts/${id}`),
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
