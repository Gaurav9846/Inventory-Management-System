// src/pages/staff/StaffDelivery.jsx

import { useEffect, useState } from "react";
import { deliveriesApi } from "@/api/index.js";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Input } from "@/components/ui/input.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";
import {
  MapPin,
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Ban,
  RefreshCw,
  ChevronsLeft,
  ChevronsRight,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/utils/helpers.js";

export default function StaffDelivery() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    pages: 1,
    limit: 20,
  });

  // Debounce search to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length === 0 || searchTerm.length >= 2) {
        fetchDeliveries();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchDeliveries();
  }, [activeFilter, pagination.page]);

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      let statusParam = "";
      if (activeFilter !== "all") {
        statusParam = activeFilter.toUpperCase();
      }

      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(statusParam && { status: statusParam }),
        ...(searchTerm && { search: searchTerm }),
      };

      console.log("📤 Fetching deliveries with params:", params);

      const response = await deliveriesApi.getAll(params);
      console.log("📥 Response:", response.data);

      setDeliveries(response.data.data || []);
      setPagination({
        page: response.data.page || pagination.page,
        total: response.data.total || 0,
        pages: response.data.pages || 1,
        limit: response.data.limit || pagination.limit,
      });
    } catch (error) {
      console.error("Error fetching deliveries:", error);
      toast.error("Failed to load deliveries");
    } finally {
      setLoading(false);
    }
  };

  const updateDeliveryStatus = async (deliveryId, newStatus, actionName) => {
    setUpdatingId(deliveryId);
    try {
      await deliveriesApi.updateStatus(deliveryId, { status: newStatus });

      if (newStatus === "IN_TRANSIT") {
        toast.success("Delivery dispatched! Stock has been deducted.");
      } else if (newStatus === "DELIVERED") {
        toast.success("Delivery completed! Order marked as completed.");
      } else if (newStatus === "RETURNED") {
        toast.warning("Delivery returned. Stock has been restored.");
      }

      await fetchDeliveries();
    } catch (error) {
      console.error("Error updating delivery:", error);
      toast.error(error.response?.data?.message || `Failed to ${actionName}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { label: "Pending", className: "bg-yellow-100 text-yellow-800", icon: Clock },
      IN_TRANSIT: { label: "On Road", className: "bg-blue-100 text-blue-800", icon: Truck },
      DELIVERED: { label: "Delivered", className: "bg-green-100 text-green-800", icon: CheckCircle },
      RETURNED: { label: "Returned", className: "bg-red-100 text-red-800", icon: Ban },
      CANCELLED: { label: "Cancelled", className: "bg-gray-100 text-gray-800", icon: XCircle },
    };
    const config = statusConfig[status] || {
      label: status,
      className: "bg-gray-100 text-gray-800",
      icon: AlertCircle,
    };
    const Icon = config.icon;
    return (
      <Badge className={`${config.className} flex items-center gap-1 px-2 py-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const filters = [
    { id: "all", label: "All Deliveries", icon: Package, color: "gray" },
    { id: "pending", label: "Pending", icon: Clock, color: "yellow" },
    { id: "in_transit", label: "On Road", icon: Truck, color: "blue" },
    { id: "delivered", label: "Delivered", icon: CheckCircle, color: "green" },
    { id: "returned", label: "Returned/Cancelled", icon: Ban, color: "red" },
  ];

  const resetFilters = () => {
    setSearchTerm("");
    setActiveFilter("all");
    setPagination({ ...pagination, page: 1 });
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setPagination({ ...pagination, page: 1 });
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= pagination.pages) {
      setPagination({ ...pagination, page });
    }
  };

  // ✅ Format products with quantity (Product Name → Quantity)
  const formatProductsWithQuantity = (items) => {
    if (!items || items.length === 0) return "N/A";
    return items.map(item => `${item.product?.name || item.name || 'Unknown'} → ${item.quantity}`).join('\n');
  };

  if (loading && deliveries.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-gray-500">Loading deliveries...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Deliveries</h1>
        <p className="text-gray-600 mt-1">Manage delivery workflow</p>
        <p className="text-sm text-gray-400 mt-1">
          Total: {pagination.total} deliveries • Page {pagination.page} of {pagination.pages}
        </p>
      </div>

      {/* Search Bar and Filters */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by order ID or customer..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-9 pr-9"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                setPagination({ ...pagination, page: 1 });
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={pagination.limit}
            onChange={(e) => {
              setPagination({
                ...pagination,
                limit: parseInt(e.target.value),
                page: 1,
              });
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
          <Button
            variant="outline"
            onClick={resetFilters}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Reset Filters
          </Button>
          <Button
            variant="outline"
            onClick={fetchDeliveries}
            className="gap-2"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto pb-1">
          {filters.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilter === filter.id;
            const colorClasses = {
              gray: isActive ? "border-gray-500 text-gray-600" : "",
              yellow: isActive ? "border-yellow-500 text-yellow-600" : "",
              blue: isActive ? "border-blue-500 text-blue-600" : "",
              green: isActive ? "border-green-500 text-green-600" : "",
              red: isActive ? "border-red-500 text-red-600" : "",
            };

            return (
              <button
                key={filter.id}
                onClick={() => {
                  setActiveFilter(filter.id);
                  setPagination({ ...pagination, page: 1 });
                }}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex items-center gap-2 ${
                  isActive
                    ? colorClasses[filter.color]
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className="h-4 w-4" />
                {filter.label}
                {isActive && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {pagination.total}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Filters Display */}
      {(activeFilter !== "all" || searchTerm) && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-500">Active filters:</span>
          {activeFilter !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Status: {filters.find(f => f.id === activeFilter)?.label}
              <X
                className="h-3 w-3 cursor-pointer hover:text-red-500"
                onClick={() => setActiveFilter("all")}
              />
            </Badge>
          )}
          {searchTerm && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: {searchTerm}
              <X
                className="h-3 w-3 cursor-pointer hover:text-red-500"
                onClick={() => setSearchTerm("")}
              />
            </Badge>
          )}
        </div>
      )}

      {/* Deliveries Table */}
      <Card>
        <CardContent className="p-0">
          {deliveries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mb-3" />
              <p className="text-gray-500 text-center">No deliveries found</p>
              <p className="text-sm text-gray-400 mt-1">
                {activeFilter !== "all"
                  ? `No ${activeFilter.replace("_", " ")} deliveries available`
                  : searchTerm
                  ? `No deliveries matching "${searchTerm}"`
                  : "Process orders in Orders section to create deliveries"}
              </p>
              {activeFilter === "all" && !searchTerm && (
                <Button
                  className="mt-4 bg-blue-600"
                  onClick={() => (window.location.href = "/staff/orders")}
                >
                  Go to Orders
                </Button>
              )}
              {searchTerm && (
                <Button className="mt-4" variant="outline" onClick={resetFilters}>
                  Clear Search
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-[120px]">Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.map((delivery) => {
                    const order = delivery.salesOrder;
                    const customer = order?.customer;
                    
                    if (!customer) return null;

                    const isPending = delivery.status === "PENDING";
                    const isInTransit = delivery.status === "IN_TRANSIT";
                    const isDelivered = delivery.status === "DELIVERED";
                    const isReturned = delivery.status === "RETURNED" || delivery.status === "CANCELLED";

                    const productsWithQty = formatProductsWithQuantity(order.items);

                    return (
                      <TableRow key={delivery.id} className="hover:bg-gray-50">
                        <TableCell className="font-mono text-xs font-medium">
                          {order.orderNumber}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-xs font-bold text-blue-600">
                                {customer.name?.charAt(0)?.toUpperCase() || "U"}
                              </span>
                            </div>
                            <span className="text-sm font-medium">{customer.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm whitespace-pre-line">
                            {productsWithQty.split('\n').map((line, idx) => (
                              <div key={idx}>{line}</div>
                            ))}
                          </div>
                          <div className="text-xs text-gray-400">
                            {order.items?.length || 0} item(s)
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {order.items.reduce((sum, i) => sum + i.quantity, 0)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(order.totalAmount)}
                        </TableCell>
                        <TableCell>
                          {order.payment && (
                            <div className="text-xs">
                              <Badge variant="outline" className="text-xs">
                                {order.payment.method}
                              </Badge>
                              {order.payment.method === "CREDIT" && order.payment.status === "PENDING" && (
                                <div className="text-xs text-amber-600 mt-0.5">
                                  Awaiting Payment
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(delivery.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Dispatch Button - Only for PENDING */}
                            {isPending && (
                              <Button
                                size="sm"
                                className="h-8 px-2 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                                onClick={() =>
                                  updateDeliveryStatus(delivery.id, "IN_TRANSIT", "start delivery")
                                }
                                disabled={updatingId === delivery.id}
                              >
                                {updatingId === delivery.id ? (
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                  <>
                                    <Truck className="h-3 w-3 mr-1" />
                                    Dispatch
                                  </>
                                )}
                              </Button>
                            )}

                            {/* Deliver + Return Buttons - Only for IN_TRANSIT */}
                            {isInTransit && (
                              <>
                                <Button
                                  size="sm"
                                  className="h-8 px-2 bg-green-600 hover:bg-green-700 text-white text-xs"
                                  onClick={() =>
                                    updateDeliveryStatus(delivery.id, "DELIVERED", "complete delivery")
                                  }
                                  disabled={updatingId === delivery.id}
                                >
                                  {updatingId === delivery.id ? (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                  ) : (
                                    <>
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Deliver
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2 text-red-600 border-red-300 hover:bg-red-50 text-xs"
                                  onClick={() =>
                                    updateDeliveryStatus(delivery.id, "RETURNED", "return delivery")
                                  }
                                  disabled={updatingId === delivery.id}
                                >
                                  <Ban className="h-3 w-3 mr-1" />
                                  Return
                                </Button>
                              </>
                            )}

                            {/* Status Badges for Completed/Returned */}
                            {isDelivered && (
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                ✓ {delivery.deliveredAt ? formatDate(delivery.deliveredAt) : "Completed"}
                              </Badge>
                            )}

                            {isReturned && (
                              <Badge className="bg-red-100 text-red-800 text-xs">
                                {delivery.status === "RETURNED" ? "Returned" : "Cancelled"}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t gap-4">
              <p className="text-sm text-gray-500 order-2 sm:order-1">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} deliveries
              </p>
              <div className="flex items-center gap-1 order-1 sm:order-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(1)}
                  disabled={pagination.page === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="h-8 px-2"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Prev
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    let pageNum;
                    if (pagination.pages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.pages - 2) {
                      pageNum = pagination.pages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={pagination.page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(pageNum)}
                        className={`h-8 w-8 p-0 ${
                          pagination.page === pageNum ? "bg-blue-600 hover:bg-blue-700" : ""
                        }`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {pagination.pages > 5 && pagination.page < pagination.pages - 2 && (
                    <>
                      <span className="px-1">...</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(pagination.pages)}
                        className="h-8 w-8 p-0"
                      >
                        {pagination.pages}
                      </Button>
                    </>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="h-8 px-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(pagination.pages)}
                  disabled={pagination.page === pagination.pages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}