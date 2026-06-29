// src/pages/staff/StaffOrders.jsx
import { useEffect, useState } from "react";
import { salesOrdersApi } from "@/api/index.js";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Input } from "@/components/ui/input.jsx";
import { 
  Package, 
  User, 
  Phone, 
  Calendar, 
  Truck, 
  AlertCircle, 
  Search, 
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  Ban
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/utils/helpers.js";

export default function StaffOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1, limit: 12 });

  useEffect(() => {
    fetchOrders();
  }, [activeFilter, pagination.page, searchTerm]);

  const fetchOrders = async () => {
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
        ...(searchTerm && { search: searchTerm })
      };
      const response = await salesOrdersApi.getAll(params);
      setOrders(response.data.data);
      if (response.data.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (error) {
      toast.error("Failed to load orders");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const processOrder = async (orderId) => {
    setProcessingId(orderId);
    try {
      await salesOrdersApi.updateStatus(orderId, "PROCESSING");
      toast.success("Order processed! Delivery created automatically.");
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to process order");
    } finally {
      setProcessingId(null);
    }
  };

  const cancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;

    setCancellingId(orderId);
    try {
      await salesOrdersApi.updateStatus(orderId, "CANCELLED");
      toast.success("Order cancelled");
      fetchOrders();
    } catch (error) {
      toast.error("Failed to cancel order");
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { label: "Pending", className: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
      PROCESSING: { label: "Processing", className: "bg-blue-100 text-blue-800 border-blue-200", icon: Truck },
      DISPATCHED: { label: "Dispatched (On Road)", className: "bg-purple-100 text-purple-800 border-purple-200", icon: Truck },
      COMPLETED: { label: "Completed", className: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
      CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-800 border-red-200", icon: Ban },
    };
    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-800", icon: AlertCircle };
    const Icon = config.icon;
    return (
      <Badge className={`${config.className} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPaymentBadge = (paymentMethod) => {
    const paymentConfig = {
      CASH: { label: "Cash", className: "bg-green-100 text-green-800" },
      ONLINE: { label: "Online", className: "bg-blue-100 text-blue-800" },
      CREDIT: { label: "Credit", className: "bg-purple-100 text-purple-800" },
      PAY_LATER: { label: "Pay Later", className: "bg-orange-100 text-orange-800" },
    };
    const config = paymentConfig[paymentMethod] || { label: paymentMethod || "N/A", className: "bg-gray-100 text-gray-800" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const filters = [
    { id: "all", label: "All Orders", icon: Package, color: "gray" },
    { id: "pending", label: "Pending", icon: Clock, color: "yellow" },
    { id: "processing", label: "Processing", icon: Truck, color: "blue" },
    { id: "completed", label: "Completed", icon: CheckCircle, color: "green" },
    { id: "cancelled", label: "Cancelled", icon: Ban, color: "red" },
  ];

  const OrderCard = ({ order }) => {
    const canProcess = order.status === "PENDING";
    const canCancel = ["PENDING", "PROCESSING"].includes(order.status);
    const isProcessing = order.status === "PROCESSING";
    const isCompleted = order.status === "COMPLETED";
    const isDispatched = order.status === "DISPATCHED";
    const isCancelled = order.status === "CANCELLED";

    return (
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="font-mono text-sm font-bold text-gray-900">{order.orderNumber}</p>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(order.createdAt)}
              </p>
            </div>
            {getStatusBadge(order.status)}
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-900">{order.customer?.name || "Unknown"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">{order.customer?.phone || "No phone"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {order.items?.length || 0} item(s) - {formatCurrency(order.totalAmount)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {getPaymentBadge(order.payment?.method || order.paymentType)}
            </div>
          </div>

          {/* Order Items Preview */}
          <div className="bg-gray-50 rounded-lg p-2 mb-4">
            <p className="text-xs text-gray-500 mb-1">Items:</p>
            <div className="space-y-0.5">
              {(order.items || []).slice(0, 2).map((item, idx) => (
                <p key={idx} className="text-xs text-gray-600">
                  {item.quantity}x {item.product?.name || item.name}
                </p>
              ))}
              {(order.items || []).length > 2 && (
                <p className="text-xs text-gray-400">+{order.items.length - 2} more items</p>
              )}
            </div>
          </div>

          {/* Action Buttons - Only for PENDING orders */}
          {canProcess && (
            <div className="flex gap-2">
              <Button
                onClick={() => processOrder(order.id)}
                disabled={processingId === order.id}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {processingId === order.id ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Processing...
                  </div>
                ) : (
                  <>
                    <Truck className="h-4 w-4 mr-2" />
                    Process Order
                  </>
                )}
              </Button>
              {canCancel && (
                <Button
                  onClick={() => cancelOrder(order.id)}
                  disabled={cancellingId === order.id}
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Cancel
                </Button>
              )}
            </div>
          )}

          {/* Processing Order Info */}
          {isProcessing && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700">
                <Truck className="h-4 w-4" />
                <span className="text-sm font-medium">Delivery Created</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Go to Delivery section to dispatch and complete this order.
              </p>
              <Button
                variant="link"
                className="text-blue-600 p-0 h-auto mt-2 text-xs"
                onClick={() => window.location.href = "/staff/delivery"}
              >
                Go to Deliveries →
              </Button>
            </div>
          )}

          {/* Dispatched Order Info */}
          {isDispatched && (
            <div className="bg-purple-50 p-2 rounded-lg text-center mt-2">
              <p className="text-xs text-purple-600 flex items-center justify-center gap-1">
                <Truck className="h-3 w-3" />
                Out for delivery
              </p>
            </div>
          )}

          {/* Completed Order Info */}
          {isCompleted && order.delivery && (
            <div className="bg-green-50 p-2 rounded-lg text-center mt-2">
              <p className="text-xs text-green-600">
                ✓ Delivered on {order.delivery.deliveredAt ? formatDate(order.delivery.deliveredAt) : formatDate(order.updatedAt)}
              </p>
            </div>
          )}

          {/* Cancelled Order Info */}
          {isCancelled && (
            <div className="bg-red-50 p-2 rounded-lg text-center mt-2">
              <p className="text-xs text-red-600 flex items-center justify-center gap-1">
                <Ban className="h-3 w-3" />
                Order cancelled
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const resetFilters = () => {
    setSearchTerm("");
    setActiveFilter("all");
    setPagination({ ...pagination, page: 1 });
  };

  const getFilterCount = async (filterId) => {
    // This would ideally come from API, but for UI we can show total count
    if (filterId === "all") return pagination.total;
    // For individual filters, we can count from current orders
    return orders.filter(o => o.status === filterId.toUpperCase()).length;
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-gray-500">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-gray-600 mt-1">Manage and track customer orders</p>
      </div>

      {/* Search Bar */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by order ID, customer, or phone..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPagination({ ...pagination, page: 1 });
            }}
            className="pl-9 pr-9"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          onClick={resetFilters}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Reset Filters
        </Button>
      </div>

      {/* Filter Tabs - All 5 statuses */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto">
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
              </button>
            );
          })}
        </nav>
      </div>

      {/* Orders Grid */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-500 text-center">No orders found</p>
            <p className="text-sm text-gray-400 mt-1">
              {activeFilter !== "all" 
                ? `No ${activeFilter} orders available` 
                : "Create a new order to get started"}
            </p>
            {activeFilter === "all" && (
              <Button className="mt-4 bg-blue-600" onClick={() => window.location.href = "/staff/create-order"}>
                Create New Order
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} orders
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="px-3 py-1 text-sm">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.pages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}