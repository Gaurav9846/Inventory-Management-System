// src/pages/SupplierDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { suppliersApi, purchaseOrdersApi } from "@/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, CheckCircle, Clock, AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const paymentStatusConfig = {
  PAID: { label: "Paid", color: "bg-green-100 text-green-800" },
  RECEIVED_UNPAID: { label: "Received (On Credit)", color: "bg-yellow-100 text-yellow-800" },
  PENDING: { label: "Pending", color: "bg-blue-100 text-blue-800" },
  CANCELLED: { label: "Cancelled", color: "bg-gray-100 text-gray-800" },
};

const approvalStatusConfig = {
  APPROVED: { label: "Approved", icon: CheckCircle, color: "text-green-600" },
  PENDING: { label: "Awaiting Approval", icon: Clock, color: "text-orange-500" },
  RECEIVED: { label: "Received", icon: CheckCircle, color: "text-blue-600" },
  CANCELLED: { label: "Cancelled", icon: AlertCircle, color: "text-red-600" },
};

export default function SupplierDetail() {
  const { id } = useParams();
  const { user, isManager } = useAuth();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [supplierRes, ordersRes] = await Promise.all([
          suppliersApi.getById(id),
          suppliersApi.getOrders(id),
        ]);
        setSupplier(supplierRes.data);
        setOrders(ordersRes.data);
      } catch (error) {
        toast.error("Failed to load supplier details");
        navigate("/suppliers");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  const handleApprove = async (orderId) => {
    try {
      await purchaseOrdersApi.approve(orderId);
      toast.success("Order approved");
      // Refresh orders
      const { data } = await suppliersApi.getOrders(id);
      setOrders(data);
    } catch {
      toast.error("Approval failed");
    }
  };

  if (loading) return <div className="p-8 text-center">Loading supplier details...</div>;
  if (!supplier) return null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/suppliers")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{supplier.name}</h1>
          <p className="text-muted-foreground">
            {supplier.contactPerson} • {supplier.phone} • {supplier.email}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders from {supplier.name}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead>Approval</TableHead>
                <TableHead>Invoice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-10">No orders found.</TableCell></TableRow>
              ) : (
                orders.map((order) => {
                  const PaymentBadge = () => (
                    <Badge className={paymentStatusConfig[order.paymentStatus]?.color}>
                      {paymentStatusConfig[order.paymentStatus]?.label || order.paymentStatus}
                    </Badge>
                  );
                  const Approval = approvalStatusConfig[order.approvalStatus];
                  const needsApproval = order.approvalStatus === "PENDING" && isManager;

                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono">#{order.orderNumber}</TableCell>
                      <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                      <TableCell>{order.product?.name || "Multiple items"}</TableCell>
                      <TableCell>{order.quantity || "—"}</TableCell>
                      <TableCell>${order.unitCost?.toFixed(2) || "—"}</TableCell>
                      <TableCell className="font-medium">
                        ${order.totalCost?.toFixed(2) || order.totalAmount?.toFixed(2) || "—"}
                      </TableCell>
                      <TableCell><PaymentBadge /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {Approval && (
                            <div className="flex items-center gap-1">
                              <Approval.icon className={`h-4 w-4 ${Approval.color}`} />
                              <span className="text-sm">{Approval.label}</span>
                            </div>
                          )}
                          {needsApproval && (
                            <Button size="sm" variant="outline" onClick={() => handleApprove(order.id)}>
                              Approve
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.invoiceUrl ? (
                          <a href={order.invoiceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                            <FileText className="h-4 w-4" />
                            View Bill
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}