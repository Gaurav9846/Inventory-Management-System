// src/pages/SupplierPortal.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { StatusBadge } from "@/components/shared/StatusBadge.jsx";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Separator } from "@/components/ui/separator.jsx";
import { Building2, Phone, Mail, Package, ClipboardList, Droplets } from "lucide-react";
import { formatDate, formatCurrency, formatDateTime } from "@/utils/helpers.js";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export default function SupplierPortal() {
  const supplierId = new URLSearchParams(window.location.search).get("id");
  const [supplier, setSupplier] = useState(null);
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    if (!supplierId) { setError("No supplier ID provided in URL (?id=...)"); setLoading(false); return; }
    const token = localStorage.getItem("ims_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    Promise.all([
      axios.get(`${API}/suppliers/${supplierId}`, { headers }),
      axios.get(`${API}/purchase-orders?supplierId=${supplierId}&limit=100`, { headers }),
    ])
      .then(([sRes, oRes]) => { setSupplier(sRes.data); setOrders(oRes.data.data); })
      .catch((err) => setError(err.response?.data?.message || "Unable to load supplier data."))
      .finally(() => setLoading(false));
  }, [supplierId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="text-5xl">⚠️</span>
            <h2 className="text-lg font-semibold">Access Error</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pending   = orders.filter((o) => o.status === "PENDING");
  const approved  = orders.filter((o) => o.status === "APPROVED");
  const received  = orders.filter((o) => o.status === "RECEIVED");
  const cancelled = orders.filter((o) => o.status === "CANCELLED");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <Droplets className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm">Fusion IMS — Supplier Portal</p>
          <p className="text-slate-400 text-xs">Read-only purchase order view</p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Supplier info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Building2 className="h-7 w-7 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-800">{supplier.name}</h2>
                {supplier.contactPerson && <p className="text-sm text-muted-foreground mt-0.5">Contact: {supplier.contactPerson}</p>}
                <div className="flex flex-wrap gap-4 mt-3">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Phone className="h-4 w-4" />{supplier.phone}</div>
                  {supplier.email && <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Mail className="h-4 w-4" />{supplier.email}</div>}
                  {supplier.paymentTerms && <Badge variant="secondary">Terms: {supplier.paymentTerms}</Badge>}
                </div>
              </div>
              <div className="flex gap-6 shrink-0 text-center">
                <div><p className="text-2xl font-black text-amber-600">{pending.length}</p><p className="text-xs text-muted-foreground">Pending</p></div>
                <div><p className="text-2xl font-black text-blue-600">{approved.length}</p><p className="text-xs text-muted-foreground">Approved</p></div>
                <div><p className="text-2xl font-black text-green-600">{received.length}</p><p className="text-xs text-muted-foreground">Received</p></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products */}
        {supplier.products?.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4" />Products You Supply</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2 p-4 pt-0">
              {supplier.products.map((p) => (
                <div key={p.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border ${p.currentStock <= (p.reorderLevel || 10) ? "bg-red-50 border-red-200" : "bg-muted border-border"}`}>
                  <span className="font-medium">{p.name}</span>
                  <span className={`font-bold ${p.currentStock <= (p.reorderLevel || 10) ? "text-red-600" : "text-green-600"}`}>{p.currentStock} in stock</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Purchase Orders */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><ClipboardList className="h-4 w-4" />Purchase Orders ({orders.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="all">
              <div className="px-4 pt-2 border-b border-border">
                <TabsList className="h-8">
                  <TabsTrigger value="all"       className="text-xs">All ({orders.length})</TabsTrigger>
                  <TabsTrigger value="pending"   className="text-xs">Pending ({pending.length})</TabsTrigger>
                  <TabsTrigger value="approved"  className="text-xs">Approved ({approved.length})</TabsTrigger>
                  <TabsTrigger value="received"  className="text-xs">Received ({received.length})</TabsTrigger>
                </TabsList>
              </div>

              {[
                { value: "all",      data: orders   },
                { value: "pending",  data: pending  },
                { value: "approved", data: approved },
                { value: "received", data: received },
              ].map(({ value, data: tabOrders }) => (
                <TabsContent key={value} value={value} className="m-0">
                  {!tabOrders.length
                    ? <p className="text-sm text-center text-muted-foreground py-10">No {value === "all" ? "" : value} orders</p>
                    : <div className="divide-y divide-border">
                        {tabOrders.map((order) => (
                          <div key={order.id} className="p-5">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="font-mono text-sm font-bold">{order.orderNumber}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Placed: {formatDate(order.createdAt)} by {order.createdBy?.name}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold">{formatCurrency(order.totalAmount)}</span>
                                <StatusBadge value={order.status} />
                              </div>
                            </div>
                            {order.status === "PENDING" && (
                              <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                                ⏳ This order is awaiting internal approval. Please prepare the items listed below.
                              </div>
                            )}
                            {order.status === "APPROVED" && (
                              <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                                ✅ <strong>Approved.</strong> Please deliver the items at your earliest convenience.
                              </div>
                            )}
                            {order.status === "RECEIVED" && (
                              <div className="mb-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
                                📦 Delivery confirmed and stock updated. Thank you!
                              </div>
                            )}
                            <div className="rounded-lg border overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs">Product</TableHead>
                                    <TableHead className="text-xs text-center">Quantity</TableHead>
                                    <TableHead className="text-xs text-right">Unit Price</TableHead>
                                    <TableHead className="text-xs text-right">Subtotal</TableHead>
                                    <TableHead className="text-xs text-center">Delivered</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {order.items?.map((item) => (
                                    <TableRow key={item.id}>
                                      <TableCell className="text-xs font-medium">{item.product?.name}</TableCell>
                                      <TableCell className="text-xs text-center">{item.quantity} {item.product?.unit}</TableCell>
                                      <TableCell className="text-xs text-right">{item.unitPrice ? formatCurrency(item.unitPrice) : "—"}</TableCell>
                                      <TableCell className="text-xs text-right font-semibold">{item.unitPrice ? formatCurrency(item.unitPrice * item.quantity) : "—"}</TableCell>
                                      <TableCell className="text-xs text-center">
                                        {item.receivedQty > 0
                                          ? <span className="text-green-600 font-bold">{item.receivedQty}</span>
                                          : <span className="text-muted-foreground">—</span>}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                            {order.notes && <p className="text-xs text-muted-foreground mt-2 italic">Note: {order.notes}</p>}
                          </div>
                        ))}
                      </div>
                  }
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
