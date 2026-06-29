// src/pages/staff/StaffCustomers.jsx
import { useEffect, useState } from "react";
import { customersApi } from "@/api/index.js";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.jsx";
import { 
  Search, 
  UserPlus, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Phone, 
  MapPin, 
  Mail,
  ShoppingBag,
  CreditCard,
  Calendar,
  Package,
  Eye,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/utils/helpers.js";

export default function StaffCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [orderHistory, setOrderHistory] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1, limit: 10 });
  const [activeTab, setActiveTab] = useState("orders");

  useEffect(() => {
    fetchCustomers();
  }, [searchTerm, pagination.page]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = { 
        page: pagination.page, 
        limit: pagination.limit, 
        ...(searchTerm && { search: searchTerm }) 
      };
      const response = await customersApi.getAll(params);
      setCustomers(response.data.customers || []);
      if (response.data.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerClick = async (customer) => {
    setSelectedCustomer(customer);
    setLoadingDetails(true);
    setOrderHistory([]);
    setPaymentHistory([]);
    
    try {
      const response = await customersApi.getById(customer.id);
      console.log("Customer details response:", response.data);
      
      setOrderHistory(response.data.orderHistory || []);
      setPaymentHistory(response.data.paymentHistory || []);
      
    } catch (error) {
      console.error("Error fetching customer details:", error);
      toast.error("Failed to load customer details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "??";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { label: "Pending", className: "bg-yellow-100 text-yellow-800", icon: Clock },
      PROCESSING: { label: "Processing", className: "bg-blue-100 text-blue-800", icon: Truck },
      DISPATCHED: { label: "Dispatched", className: "bg-purple-100 text-purple-800", icon: Truck },
      COMPLETED: { label: "Completed", className: "bg-green-100 text-green-800", icon: CheckCircle },
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

  const getPaymentBadge = (method) => {
    const paymentConfig = {
      CASH: { label: "Cash", className: "bg-green-100 text-green-800" },
      ONLINE: { label: "Online", className: "bg-blue-100 text-blue-800" },
      CREDIT: { label: "Credit", className: "bg-purple-100 text-purple-800" },
      PAY_LATER: { label: "Pay Later", className: "bg-orange-100 text-orange-800" },
    };
    const config = paymentConfig[method] || { label: method || "N/A", className: "bg-gray-100 text-gray-800" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (loading && customers.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-gray-500">Loading customers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-gray-600 mt-1">Manage your customer base</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Customer List */}
        <div className="lg:col-span-2 rounded-lg bg-white shadow">
          {/* Search Bar */}
          <div className="border-b border-gray-200 p-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            </div>
          </div>

          {/* Customers Table - Added Total Paid Column */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Paid
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Outstanding
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr 
                      key={customer.id} 
                      onClick={() => handleCustomerClick(customer)}
                      className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedCustomer?.id === customer.id ? "bg-blue-50" : ""
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {getInitials(customer.name)}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                            {customer.customerType && (
                              <span className="text-xs text-gray-400">{customer.customerType}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.address || '-'}
                      </td>
                      {/* Total Paid Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-green-600">
                          {formatCurrency(customer.totalPaid || 0)}
                        </span>
                      </td>
                      {/* Outstanding Credit Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={customer.outstandingCredit > 0 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                          {formatCurrency(customer.outstandingCredit || 0)}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {customers.length} of {pagination.total} customers
              </div>
              <div className="flex space-x-2">
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
        </div>

        {/* Right Column - Customer Details */}
        <div className="rounded-lg bg-white shadow">
          {loadingDetails ? (
            <div className="flex h-96 items-center justify-center">
              <div className="text-gray-500">Loading details...</div>
            </div>
          ) : selectedCustomer ? (
            <div className="p-6">
              {/* Profile Header */}
              <div className="flex flex-col items-center mb-6">
                <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                  <span className="text-2xl font-medium text-blue-600">
                    {getInitials(selectedCustomer.name)}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedCustomer.name}</h3>
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <Phone className="h-3 w-3" />
                  {selectedCustomer.phone}
                </p>
                {selectedCustomer.email && (
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <Mail className="h-3 w-3" />
                    {selectedCustomer.email}
                  </p>
                )}
              </div>

              {/* Address */}
              {selectedCustomer.address && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Address
                  </p>
                  <p className="text-sm text-gray-700 mt-1">{selectedCustomer.address}</p>
                </div>
              )}

              {/* Financial Summary */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-lg bg-green-50 p-3">
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Total Paid
                  </p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(selectedCustomer.totalPaid || 0)}
                  </p>
                </div>
                <div className="rounded-lg bg-red-50 p-3">
                  <p className="text-xs text-red-600">Outstanding Credit</p>
                  <p className="text-lg font-bold text-red-600">
                    {formatCurrency(selectedCustomer.outstandingCredit || 0)}
                  </p>
                </div>
              </div>

              {/* Tabs for History */}
              <div className="mt-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="orders" className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      Order History
                    </TabsTrigger>
                    <TabsTrigger value="payments" className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Payment History
                    </TabsTrigger>
                  </TabsList>

                  {/* Order History Tab */}
                  <TabsContent value="orders" className="mt-4">
                    {orderHistory.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No orders yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {orderHistory.map((order, idx) => (
                          <div key={idx} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{order.id}</p>
                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(order.date)}
                                </p>
                              </div>
                              {getStatusBadge(order.status)}
                            </div>
                            <p className="text-base font-bold text-gray-900 mt-2">
                              {formatCurrency(order.amount)}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              {getPaymentBadge(order.paymentMethod)}
                              <Badge variant="outline" className="text-xs">
                                Delivery: {order.deliveryStatus}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Payment History Tab */}
                  <TabsContent value="payments" className="mt-4">
                    {paymentHistory.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <CreditCard className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No payment history</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {paymentHistory.map((payment, idx) => (
                          <div key={idx} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50">
                            <div className="flex justify-between items-start mb-2">
                              {getPaymentBadge(payment.type)}
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(payment.date)}
                              </p>
                            </div>
                            <p className="text-lg font-bold text-green-600">
                              {formatCurrency(payment.amount)}
                            </p>
                            {payment.orderId && (
                              <p className="text-xs text-gray-500 mt-2">
                                Order: {payment.orderId}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          ) : (
            <div className="flex h-96 items-center justify-center text-gray-500">
              <div className="text-center">
                <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Select a customer to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}