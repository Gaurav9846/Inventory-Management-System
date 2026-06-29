// src/pages/manager/SupplierDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { suppliersApi } from "@/api/index.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { PageHeader } from "@/components/shared/PageHeader.jsx";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner.jsx";
import { 
  ArrowLeft, Building2, Phone, Mail, MapPin, CreditCard, 
  Banknote, TrendingUp, Package, Truck, Calendar, Star, 
  StarHalf, Edit, Plus, DollarSign, CheckCircle, Clock, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/utils/helpers.js";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";

const STATUS_COLORS = {
  Active: "bg-green-100 text-green-700",
  Inactive: "bg-gray-100 text-gray-700",
  Blacklisted: "bg-red-100 text-red-700",
};

export default function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [insights, setInsights] = useState(null);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSupplierDetails();
  }, [id]);

  const fetchSupplierDetails = async () => {
    setLoading(true);
    try {
      const response = await suppliersApi.getById(id);
      setSupplier(response.data.supplier);
      setInsights(response.data.insights);
      setPurchaseOrders(response.data.purchaseOrders || []);
    } catch (error) {
      toast.error("Failed to load supplier details");
      navigate("/manager/suppliers");
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
    }
    if (hasHalfStar) {
      stars.push(<StarHalf key="half" className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
    }
    return <div className="flex items-center gap-0.5">{stars}</div>;
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case "RECEIVED": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "SENT": return <Truck className="h-4 w-4 text-blue-500" />;
      case "APPROVED": return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case "PENDING": return <Clock className="h-4 w-4 text-yellow-500" />;
      case "CANCELLED": return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!supplier) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/manager/suppliers")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
              <Badge className={STATUS_COLORS[supplier.status] || "bg-gray-100"}>
                {supplier.status}
              </Badge>
            </div>
            {supplier.contactPerson && (
              <p className="text-sm text-gray-500 mt-1">Contact: {supplier.contactPerson}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/manager/suppliers/${id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" /> Edit Supplier
          </Button>
          <Button size="sm" onClick={() => navigate(`/manager/purchase-orders/new?supplier=${id}`)}>
            <Plus className="h-4 w-4 mr-2" /> Create PO
          </Button>
        </div>
      </div>

      {/* Supplier Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <Card className="lg:col-span-2">
          <CardContent className="p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Contact Information</h3>
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="h-4 w-4" />
              <span className="text-sm">{supplier.phone}</span>
            </div>
            {supplier.email && (
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="h-4 w-4" />
                <span className="text-sm">{supplier.email}</span>
              </div>
            )}
            {supplier.address && (
              <div className="flex items-start gap-2 text-gray-600">
                <MapPin className="h-4 w-4 mt-0.5" />
                <span className="text-sm">{supplier.address}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Payment & Terms</h3>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Payment Terms</span>
              <Badge variant="outline" className="font-medium">{supplier.paymentTerms || "Net 30"}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Performance Rating</span>
              <div className="flex items-center gap-2">
                {renderStars(supplier.performanceRating || 4.0)}
                <span className="font-bold">{(supplier.performanceRating || 4.0).toFixed(1)}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Supplier since</span>
              <span className="text-sm">{formatDate(supplier.createdAt)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Financial Summary</h3>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total Purchases</span>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(insights?.totalPurchases || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Outstanding Payments</span>
              <span className="text-lg font-bold text-red-600">{formatCurrency(insights?.outstandingPayments || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total Orders</span>
              <span className="text-lg font-bold text-gray-900">{insights?.totalOrders || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{insights?.onTimeDeliveryRate || 87}%</p>
            <p className="text-xs text-gray-500">On-Time Delivery Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold">{insights?.totalOrders || 0}</p>
            <p className="text-xs text-gray-500">Total Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-8 w-8 mx-auto text-purple-500 mb-2" />
            <p className="text-2xl font-bold">{formatCurrency(insights?.averageOrderValue || 0)}</p>
            <p className="text-xs text-gray-500">Average Order Value</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Truck className="h-8 w-8 mx-auto text-orange-500 mb-2" />
            <p className="text-2xl font-bold">{insights?.completedOrders || 0}</p>
            <p className="text-xs text-gray-500">Completed Orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="materials">Raw Materials</TabsTrigger>
        </TabsList>

        {/* Purchase Orders Tab */}
        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Purchase History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                          No purchase orders found
                        </TableCell>
                      </TableRow>
                    ) : (
                      purchaseOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm">{order.poNumber}</TableCell>
                          <TableCell className="text-sm">{formatDate(order.date)}</TableCell>
                          <TableCell className="text-sm">{order.items?.length || 0} items</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(order.totalAmount)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(order.status)}
                              <span className="text-sm">{order.status}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={order.paymentStatus === "PAID" ? "success" : "warning"}>
                              {order.paymentStatus || "UNPAID"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => navigate(`/manager/purchase-orders/${order.id}`)}>
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Monthly Purchase Value</CardTitle>
                <p className="text-xs text-gray-400">12-month spend trend</p>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={insights?.monthlyTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" fontSize={10} />
                      <YAxis tickFormatter={(v) => `${v/1000}k`} />
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                      <Bar dataKey="amount" fill="#3b82f6" name="Purchase Amount" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Performance Analytics</CardTitle>
                <p className="text-xs text-gray-400">Delivery and accuracy overview</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">On-Time Delivery Rate</span>
                    <span className="font-bold text-green-600">{insights?.onTimeDeliveryRate || 87}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${insights?.onTimeDeliveryRate || 87}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Average Order Value</span>
                    <span className="font-bold text-blue-600">{formatCurrency(insights?.averageOrderValue || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Raw Materials Tab */}
        <TabsContent value="materials" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Raw Materials Supplied</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {supplier.rawMaterials?.map((material) => (
                  <div key={material.id} className="p-3 border rounded-lg">
                    <p className="font-medium text-sm">{material.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Stock: {material.currentStock} {material.unit}
                    </p>
                    <p className="text-xs text-gray-400">{material.category}</p>
                  </div>
                ))}
                {(!supplier.rawMaterials || supplier.rawMaterials.length === 0) && (
                  <p className="text-gray-400 col-span-full text-center py-8">No raw materials associated</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}