// src/pages/staff/StaffDelivery.jsx
import { useEffect, useState } from "react";
import { deliveriesApi } from "@/api/index.js";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Input } from "@/components/ui/input.jsx";
import { 
  MapPin, 
  Phone, 
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
  Ban
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/utils/helpers.js";

export default function StaffDelivery() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1, limit: 12 });

  useEffect(() => {
    fetchDeliveries();
  }, [activeFilter, pagination.page, searchTerm]);

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
        ...(searchTerm && { search: searchTerm })
      };
      const response = await deliveriesApi.getAll(params);
      setDeliveries(response.data.data);
      if (response.data.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (error) {
      toast.error("Failed to load deliveries");
      console.error(error);
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

      fetchDeliveries();
    } catch (error) {
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
      CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-800", icon: XCircle },
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

  const filters = [
    { id: "all", label: "All Deliveries", icon: Package, color: "gray" },
    { id: "pending", label: "Pending", icon: Clock, color: "yellow" },
    { id: "in_transit", label: "On Road", icon: Truck, color: "blue" },
    { id: "delivered", label: "Delivered", icon: CheckCircle, color: "green" },
    { id: "returned", label: "Returned/Cancelled", icon: Ban, color: "red" },
  ];

  const DeliveryCard = ({ delivery }) => {
    const order = delivery.salesOrder;
    const customer = order?.customer;

    if (!customer) return null;

    const isPending = delivery.status === "PENDING";
    const isInTransit = delivery.status === "IN_TRANSIT";
    const isDelivered = delivery.status === "DELIVERED";
    const isReturned = delivery.status === "RETURNED" || delivery.status === "CANCELLED";

    return (
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="font-mono text-sm font-bold text-gray-900">{order.orderNumber}</p>
              <p className="text-xs text-gray-500 mt-0.5">{formatDate(order.createdAt)}</p>
            </div>
            {getStatusBadge(delivery.status)}
          </div>

          <div className="space-y-2 mb-4">
            <p className="font-medium text-gray-900">{customer.name}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Phone className="h-3 w-3" /> {customer.phone}
            </p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {customer.deliveryAddress || customer.address || "No address"}
            </p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Package className="h-3 w-3" />
              {order.items.map((i, idx) => (
                <span key={idx}>
                  {idx > 0 && ", "}
                  {i.quantity}x {i.product.name}
                </span>
              ))}
            </p>
            <p className="text-sm font-semibold text-gray-900 mt-2">
              Amount: {formatCurrency(order.totalAmount)}
            </p>
            {order.payment && (
              <p className="text-xs text-gray-500">
                Payment: {order.payment.method} • {order.payment.status}
              </p>
            )}
          </div>

          {/* Action Buttons based on status */}
          {isPending && (
            <Button
              onClick={() => updateDeliveryStatus(delivery.id, "IN_TRANSIT", "start delivery")}
              disabled={updatingId === delivery.id}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {updatingId === delivery.id ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Processing...
                </div>
              ) : (
                <>
                  <Truck className="h-4 w-4 mr-2" />
                  Start Delivery (Dispatch)
                </>
              )}
            </Button>
          )}

          {isInTransit && (
            <div className="space-y-2">
              <Button
                onClick={() => updateDeliveryStatus(delivery.id, "DELIVERED", "complete delivery")}
                disabled={updatingId === delivery.id}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {updatingId === delivery.id ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Processing...
                  </div>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Delivery
                  </>
                )}
              </Button>
              <Button
                onClick={() => updateDeliveryStatus(delivery.id, "RETURNED", "return delivery")}
                disabled={updatingId === delivery.id}
                variant="outline"
                className="w-full text-red-600 border-red-300 hover:bg-red-50"
              >
                <Ban className="h-4 w-4 mr-2" />
                Return Delivery
              </Button>
            </div>
          )}

          {isDelivered && (
            <div className="bg-green-50 p-2 rounded-lg text-center">
              <p className="text-xs text-green-600">
                ✓ Delivered on {delivery.deliveredAt ? formatDate(delivery.deliveredAt) : formatDate(delivery.updatedAt)}
              </p>
            </div>
          )}

          {isReturned && (
            <div className="bg-red-50 p-2 rounded-lg text-center">
              <p className="text-xs text-red-600 flex items-center justify-center gap-1">
                <Ban className="h-3 w-3" />
                Delivery {delivery.status === "RETURNED" ? "Returned" : "Cancelled"}
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
      </div>

      {/* Search Bar */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by order ID or customer..."
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

      {/* Filter Tabs */}
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
              </button>
            );
          })}
        </nav>
      </div>

      {/* Deliveries Grid */}
      {deliveries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-500 text-center">No deliveries found</p>
            <p className="text-sm text-gray-400 mt-1">
              {activeFilter !== "all" 
                ? `No ${activeFilter.replace("_", " ")} deliveries available` 
                : "Process orders in Orders section to create deliveries"}
            </p>
            {activeFilter === "all" && (
              <Button className="mt-4 bg-blue-600" onClick={() => window.location.href = "/staff/orders"}>
                Go to Orders
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deliveries.map((delivery) => (
              <DeliveryCard key={delivery.id} delivery={delivery} />
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} deliveries
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