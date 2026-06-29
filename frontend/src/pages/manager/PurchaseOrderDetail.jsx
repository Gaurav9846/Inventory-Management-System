// src/pages/manager/PurchaseOrderDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { purchaseOrdersApi } from "@/api/index.js";
import { useAuth } from "@/context/AuthContext.jsx";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs.jsx";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table.jsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.jsx";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner.jsx";
import {
  ArrowLeft, CheckCircle, XCircle, Truck, Package, DollarSign,
  Building2, Phone, Mail, MapPin, FileText, Plus, AlertCircle,
  Clock, RefreshCw, Printer, Upload, Eye, Trash2, ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/utils/helpers.js";

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending Approval", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  { value: "APPROVED", label: "Approved", color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  { value: "PARTIALLY_RECEIVED", label: "Partially Received", color: "bg-orange-100 text-orange-700", icon: Package },
  { value: "RECEIVED", label: "Received", color: "bg-green-100 text-green-700", icon: CheckCircle },
  { value: "CANCELLED", label: "Cancelled", color: "bg-red-100 text-red-700", icon: XCircle },
];

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const isManager = user?.role === "MANAGER";

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [invoicePreview, setInvoicePreview] = useState(null);
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [paymentData, setPaymentData] = useState({
    amount: "",
    paymentMethod: "BANK_TRANSFER",
    transactionId: "",
    paymentDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [receivingItems, setReceivingItems] = useState([]);
  const [receivingNotes, setReceivingNotes] = useState("");

  useEffect(() => {
    fetchOrderDetails();
    fetchInvoices();
  }, [id]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const response = await purchaseOrdersApi.getById(id);
      setOrder(response.data.data);
      if (response.data.data?.items) {
        setReceivingItems(
          response.data.data.items.map((item) => ({
            id: item.id,
            rawMaterialId: item.rawMaterialId,
            name: item.rawMaterial?.name,
            unit: item.rawMaterial?.unit,
            orderedQty: item.quantity,
            receivedQty: item.receivedQty || 0,
            previouslyReceived: item.receivedQty || 0,
            receivingQty: 0,
            damagedQty: 0,
            acceptedQty: 0,
            unitPrice: item.unitPrice,
            remarks: "",
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast.error("Failed to load purchase order details");
      navigate("/manager/purchase-orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await purchaseOrdersApi.getInvoices(id);
      setInvoices(response.data.data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    }
  };

  const handleApprove = async () => {
    setUpdating(true);
    try {
      await purchaseOrdersApi.updateStatus(id, "APPROVED");
      toast.success("Order approved successfully");
      fetchOrderDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to approve order");
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    setUpdating(true);
    try {
      await purchaseOrdersApi.updateStatus(id, "CANCELLED");
      toast.success("Order cancelled successfully");
      fetchOrderDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to cancel order");
    } finally {
      setUpdating(false);
    }
  };

  const handleAddPayment = async () => {
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    setUpdating(true);
    try {
      await purchaseOrdersApi.addPayment(id, paymentData);
      toast.success("Payment recorded successfully");
      setShowPaymentDialog(false);
      setPaymentData({
        amount: "",
        paymentMethod: "BANK_TRANSFER",
        transactionId: "",
        paymentDate: new Date().toISOString().split("T")[0],
        notes: "",
      });
      fetchOrderDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to record payment");
    } finally {
      setUpdating(false);
    }
  };

  const handleReceiveGoods = async () => {
    const itemsToReceive = receivingItems.filter((item) => item.receivingQty > 0);
    if (itemsToReceive.length === 0) {
      toast.error("Please enter receiving quantities for at least one item");
      return;
    }

    setUpdating(true);
    try {
      const receiveData = {
        items: itemsToReceive.map((item) => ({
          rawMaterialId: item.rawMaterialId,
          receivedQty: item.receivingQty,
          damagedQty: item.damagedQty || 0,
          remarks: item.remarks,
        })),
        notes: receivingNotes,
      };
      const response = await purchaseOrdersApi.receiveGoods(id, receiveData);
      toast.success(response.data.message || "Goods received successfully");
      setShowReceiveDialog(false);
      fetchOrderDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to receive goods");
    } finally {
      setUpdating(false);
    }
  };

  const handleUploadInvoice = async () => {
    if (!invoiceFile) {
      toast.error("Please select a file to upload");
      return;
    }

    setUploadingInvoice(true);
    try {
      const formData = new FormData();
      formData.append("invoice", invoiceFile);
      formData.append("notes", invoiceNotes);
      
      await purchaseOrdersApi.uploadInvoice(id, formData);
      toast.success("Invoice uploaded successfully");
      setShowInvoiceDialog(false);
      setInvoiceFile(null);
      setInvoicePreview(null);
      setInvoiceNotes("");
      fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to upload invoice");
    } finally {
      setUploadingInvoice(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    try {
      await purchaseOrdersApi.deleteInvoice(id, invoiceId);
      toast.success("Invoice deleted successfully");
      fetchInvoices();
    } catch (error) {
      toast.error("Failed to delete invoice");
    }
  };

  const updateReceivingItem = (index, field, value) => {
    const updated = [...receivingItems];
    const numValue = parseInt(value) || 0;
    updated[index][field] = numValue;

    if (field === "receivingQty" || field === "damagedQty") {
      const receivingQty = field === "receivingQty" ? numValue : updated[index].receivingQty;
      const damagedQty = field === "damagedQty" ? numValue : updated[index].damagedQty;
      updated[index].acceptedQty = Math.max(0, receivingQty - damagedQty);
    }

    setReceivingItems(updated);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size should be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      setInvoiceFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setInvoicePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrintPO = () => {
    if (!order) {
      toast.error("No order data to print");
      return;
    }

    const printFrame = document.createElement("iframe");
    printFrame.style.position = "absolute";
    printFrame.style.width = "0px";
    printFrame.style.height = "0px";
    printFrame.style.border = "0";
    document.body.appendChild(printFrame);
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Order - ${order.orderNumber}</title>
        <meta charset="UTF-8">
        <style>
          @media print { body { margin: 0; padding: 20px; } }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            line-height: 1.5;
            color: #1f2937;
            background: white;
            padding: 40px;
          }
          .po-container { max-width: 800px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
          .header { background: #10b981; color: white; padding: 30px; text-align: center; }
          .header h1 { font-size: 28px; margin-bottom: 8px; }
          .company-info { text-align: center; padding: 20px; border-bottom: 1px solid #e5e7eb; background: #f9fafb; }
          .content { padding: 30px; }
          .info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
          .info-box { background: #f9fafb; padding: 15px; border-radius: 8px; }
          .info-box h3 { font-size: 14px; font-weight: 600; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
          th { background: #f3f4f6; font-weight: 600; }
          .text-right { text-align: right; }
          .totals { margin-top: 20px; text-align: right; border-top: 2px solid #e5e7eb; padding-top: 15px; }
          .grand-total { font-size: 18px; font-weight: bold; color: #10b981; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; }
          .signature-section { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
          .status-PENDING { background: #fef3c7; color: #d97706; }
          .status-APPROVED { background: #dbeafe; color: #2563eb; }
          .status-PARTIALLY_RECEIVED { background: #fed7aa; color: #ea580c; }
          .status-RECEIVED { background: #d1fae5; color: #059669; }
          .status-CANCELLED { background: #fee2e2; color: #dc2626; }
        </style>
      </head>
      <body>
        <div class="po-container">
          <div class="header"><h1>PURCHASE ORDER</h1><p>Official Purchase Order Document</p></div>
          <div class="company-info"><h2>Fusion Water Industries</h2><p>Industrial Area, Pokhara, Nepal | Tel: +977 61-123456</p></div>
          <div class="content">
            <div class="info-section">
              <div class="info-box">
                <h3>PO DETAILS</h3>
                <div class="info-row"><span>PO Number:</span><span>${order.orderNumber}</span></div>
                <div class="info-row"><span>PO Date:</span><span>${formatDate(order.createdAt)}</span></div>
                <div class="info-row"><span>Expected Delivery:</span><span>${order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : "Not specified"}</span></div>
                <div class="info-row"><span>Status:</span><span class="status-badge status-${order.status}">${order.status}</span></div>
              </div>
              <div class="info-box">
                <h3>SUPPLIER DETAILS</h3>
                <div class="info-row"><span>Company:</span><span>${order.supplier?.name}</span></div>
                <div class="info-row"><span>Contact:</span><span>${order.supplier?.contactPerson || "N/A"}</span></div>
                <div class="info-row"><span>Phone:</span><span>${order.supplier?.phone}</span></div>
                <div class="info-row"><span>Email:</span><span>${order.supplier?.email || "N/A"}</span></div>
              </div>
            </div>
            <h3 style="margin-bottom: 10px;">Order Items</h3>
            <table>
              <thead><tr><th>S.No.</th><th>Item Description</th><th class="text-right">Quantity</th><th class="text-right">Unit Price</th><th class="text-right">Total</th></tr></thead>
              <tbody>
                ${order.items?.map((item, idx) => `
                  <tr><td>${idx + 1}</td><td>${item.rawMaterial?.name || "N/A"}</td><td class="text-right">${item.quantity} ${item.rawMaterial?.unit || ""}</td><td class="text-right">${formatCurrency(item.unitPrice)}</td><td class="text-right">${formatCurrency((item.unitPrice || 0) * item.quantity)}</td></tr>
                `).join("")}
              </tbody>
              <tfoot>
                <tr><td colspan="4" class="text-right"><strong>Subtotal:</strong></td><td class="text-right">${formatCurrency(order.subtotal)}</td></tr>
                ${order.discount > 0 ? `<tr><td colspan="4" class="text-right"><strong>Discount (${order.discount}%):</strong></td><td class="text-right">-${formatCurrency(((order.subtotal || 0) * (order.discount || 0)) / 100)}</td></tr>` : ""}
                ${order.tax > 0 ? `<tr><td colspan="4" class="text-right"><strong>Tax (${order.tax}%):</strong></td><td class="text-right">+${formatCurrency((((order.subtotal || 0) - ((order.subtotal || 0) * (order.discount || 0)) / 100) * (order.tax || 0)) / 100)}</td></tr>` : ""}
                <tr style="border-top: 2px solid #000;"><td colspan="4" class="text-right"><strong>Grand Total:</strong></td><td class="text-right"><strong>${formatCurrency(order.totalAmount)}</strong></td></tr>
              </tfoot>
            </table>
            ${order.notes ? `<div class="info-box" style="margin-top: 20px;"><h3>Notes / Instructions</h3><p>${order.notes}</p></div>` : ""}
            <div class="signature-section">
              <div><p>_________________________</p><p><strong>Authorized Signature</strong></p><p>Fusion Water Industries</p></div>
              <div><p>_________________________</p><p><strong>Supplier Signature</strong></p><p>Date: _____________</p></div>
            </div>
          </div>
          <div class="footer"><p>This is a computer-generated document. No signature is required for digital processing.</p></div>
        </div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `;
    
    const frameDoc = printFrame.contentWindow.document;
    frameDoc.open();
    frameDoc.write(printContent);
    frameDoc.close();
    printFrame.contentWindow.focus();
    printFrame.contentWindow.print();
    setTimeout(() => document.body.removeChild(printFrame), 1000);
  };

  const getStatusBadge = (status) => {
    const option = STATUS_OPTIONS.find((s) => s.value === status);
    const Icon = option?.icon || Clock;
    return (
      <Badge className={`${option?.color || "bg-gray-100"} px-3 py-1.5 text-sm font-medium flex items-center gap-1 w-fit`}>
        <Icon className="h-3.5 w-3.5" />
        {option?.label || status}
      </Badge>
    );
  };

  const calculateTotalPaid = () => {
    return order?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  };

  const calculateRemainingBalance = () => {
    return (order?.totalAmount || 0) - calculateTotalPaid();
  };

  const canApprove = isAdmin && order?.status === "PENDING";
  const canCancel = (isAdmin || isManager) && order?.status !== "RECEIVED" && order?.status !== "CANCELLED";
  const canReceive = (isAdmin || isManager) && (order?.status === "APPROVED" || order?.status === "PARTIALLY_RECEIVED");
  const canAddPayment = (isAdmin || isManager) && order?.paymentStatus !== "PAID" && order?.status !== "CANCELLED";

  if (loading) return <LoadingSpinner />;
  if (!order) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/manager/purchase-orders")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
              {getStatusBadge(order.status)}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Created on {formatDate(order.createdAt)} by {order.createdBy?.name}
              {order.approvedBy && ` • Approved by ${order.approvedBy?.name} on ${formatDate(order.approvedAt)}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canApprove && (
            <Button onClick={handleApprove} disabled={updating} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" /> Approve Order
            </Button>
          )}
          {canCancel && (
            <Button onClick={handleCancel} disabled={updating} variant="destructive">
              <XCircle className="h-4 w-4 mr-2" /> Cancel Order
            </Button>
          )}
          <Button onClick={() => setShowInvoiceDialog(true)} variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" /> Upload Invoice
          </Button>
          <Button onClick={handlePrintPO} variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" /> Print PO
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><DollarSign className="h-5 w-5 text-blue-600" /></div><div><p className="text-xs text-gray-500">Total Amount</p><p className="text-xl font-bold text-gray-900">{formatCurrency(order.totalAmount)}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="h-5 w-5 text-green-600" /></div><div><p className="text-xs text-gray-500">Total Paid</p><p className="text-xl font-bold text-green-600">{formatCurrency(calculateTotalPaid())}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 bg-red-100 rounded-lg"><AlertCircle className="h-5 w-5 text-red-600" /></div><div><p className="text-xs text-gray-500">Remaining Balance</p><p className="text-xl font-bold text-red-600">{formatCurrency(calculateRemainingBalance())}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg"><Package className="h-5 w-5 text-purple-600" /></div><div><p className="text-xs text-gray-500">Items</p><p className="text-xl font-bold text-gray-900">{order.items?.length || 0}</p></div></div></CardContent></Card>
      </div>

      {/* Action Buttons Row */}
      <div className="flex flex-wrap gap-3">
        {canReceive && (
          <Button onClick={() => setShowReceiveDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Truck className="h-4 w-4 mr-2" /> Receive Goods
          </Button>
        )}
        {canAddPayment && (
          <Button onClick={() => setShowPaymentDialog(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" /> Record Payment
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-5">
          <TabsTrigger value="details">Order Details</TabsTrigger>
          <TabsTrigger value="items">Order Items</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="receiving">Receiving History</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        {/* Order Details Tab */}
        <TabsContent value="details" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle className="text-base"><Building2 className="h-4 w-4 inline mr-2" /> Supplier Information</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between"><span className="text-gray-500">Supplier Name</span><span className="font-medium">{order.supplier?.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Contact Person</span><span>{order.supplier?.contactPerson || "—"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Phone</span><span>{order.supplier?.phone}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Email</span><span>{order.supplier?.email || "—"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Address</span><span>{order.supplier?.address || "—"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Payment Terms</span><span>{order.supplier?.paymentTerms || "Net 30"}</span></div>
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="text-base"><FileText className="h-4 w-4 inline mr-2" /> Order Information</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between"><span className="text-gray-500">PO Number</span><span className="font-mono">{order.orderNumber}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">PO Date</span><span>{formatDate(order.createdAt)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Expected Delivery</span><span>{order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : "—"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Warehouse</span><span>{order.warehouseDestination || "Main Warehouse"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Payment Status</span><Badge className={order.paymentStatus === "PAID" ? "bg-green-100 text-green-700" : order.paymentStatus === "PARTIAL" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}>{order.paymentStatus || "UNPAID"}</Badge></div>
                {order.notes && <div className="mt-2 pt-2 border-t"><p className="text-gray-500">Notes:</p><p className="text-sm mt-1">{order.notes}</p></div>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Order Items Tab */}
        <TabsContent value="items" className="mt-4">
          <Card><CardHeader><CardTitle className="text-base">Order Items</CardTitle><p className="text-xs text-gray-500">Raw materials ordered from supplier</p></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Raw Material</TableHead><TableHead className="text-center">Unit</TableHead><TableHead className="text-right">Ordered Qty</TableHead><TableHead className="text-right">Previously Received</TableHead><TableHead className="text-right">Unit Price</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-center">Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {order.items?.map((item) => {
                      const isFullyReceived = (item.receivedQty || 0) >= item.quantity;
                      const isPartiallyReceived = (item.receivedQty || 0) > 0 && !isFullyReceived;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.rawMaterial?.name}</TableCell>
                          <TableCell className="text-center text-sm">{item.rawMaterial?.unit}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{item.receivedQty || 0}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency((item.unitPrice || 0) * item.quantity)}</TableCell>
                          <TableCell className="text-center">
                            {isFullyReceived ? <Badge className="bg-green-100 text-green-700">Fully Received</Badge> : isPartiallyReceived ? <Badge className="bg-yellow-100 text-yellow-700">Partially Received</Badge> : <Badge className="bg-gray-100 text-gray-700">Pending</Badge>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-4">
          <Card><CardHeader><div className="flex justify-between items-center"><CardTitle className="text-base">Payment History</CardTitle>{canAddPayment && <Button size="sm" onClick={() => setShowPaymentDialog(true)}><Plus className="h-4 w-4 mr-2" /> Record Payment</Button>}</div><p className="text-xs text-gray-500">Payment transactions for this purchase order</p></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Method</TableHead><TableHead>Transaction ID</TableHead><TableHead>Recorded By</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {order.payments?.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">No payments recorded yet</TableCell></TableRow> : order.payments?.map((payment) => (<TableRow key={payment.id}><TableCell>{formatDate(payment.paymentDate)}</TableCell><TableCell className="text-right font-semibold text-green-600">{formatCurrency(payment.amount)}</TableCell><TableCell><Badge variant="outline">{payment.paymentMethod?.replace("_", " ")}</Badge></TableCell><TableCell className="font-mono text-sm">{payment.transactionId || "—"}</TableCell><TableCell>{payment.recordedBy?.name}</TableCell><TableCell className="max-w-xs truncate">{payment.notes || "—"}</TableCell></TableRow>))}
                  </TableBody>
                </Table>
              </div>
              <div className="p-4 border-t bg-gray-50"><div className="flex justify-between"><span className="font-semibold">Total Paid:</span><span className="text-xl font-bold text-green-600">{formatCurrency(calculateTotalPaid())}</span></div><div className="flex justify-between mt-2"><span className="font-semibold">Remaining Balance:</span><span className="text-xl font-bold text-red-600">{formatCurrency(calculateRemainingBalance())}</span></div></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receiving History Tab */}
        <TabsContent value="receiving" className="mt-4">
          <Card><CardHeader><div className="flex justify-between items-center"><CardTitle className="text-base">Goods Receiving History</CardTitle>{canReceive && (<Button size="sm" onClick={() => setShowReceiveDialog(true)}><Plus className="h-4 w-4 mr-2" /> Receive Goods</Button>)}</div><p className="text-xs text-gray-500">GRN records showing good vs damaged quantities</p></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table><TableHeader><TableRow><TableHead>GRN Number</TableHead><TableHead>Date</TableHead><TableHead>Item</TableHead><TableHead className="text-right">Ordered</TableHead><TableHead className="text-right">Good Received</TableHead><TableHead className="text-right">Damaged</TableHead><TableHead className="text-right">Accepted</TableHead><TableHead>Remarks</TableHead><TableHead>Received By</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {order.goodsReceivingNotes?.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-gray-400">No goods receiving records yet</TableCell></TableRow> : order.goodsReceivingNotes?.flatMap((grn) => grn.items?.map((item, idx) => (<TableRow key={`${grn.id}-${idx}`}><TableCell className="font-mono text-sm">{grn.grnNumber}</TableCell><TableCell>{formatDate(grn.receivedDate)}</TableCell><TableCell className="font-medium">{item.rawMaterial?.name}</TableCell><TableCell className="text-right">{item.orderedQty}</TableCell><TableCell className="text-right text-green-600">{item.receivedQty - (item.damagedQty || 0)}</TableCell><TableCell className="text-right text-red-600">{item.damagedQty || 0}</TableCell><TableCell className="text-right font-semibold">{item.acceptedQty}</TableCell><TableCell className="max-w-[150px] truncate">{item.remarks || "—"}</TableCell><TableCell>{grn.receivedBy?.name}</TableCell></TableRow>)))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="mt-4">
          <Card><CardHeader><div className="flex justify-between items-center"><CardTitle className="text-base">Invoices / Bills</CardTitle><Button size="sm" onClick={() => setShowInvoiceDialog(true)}><Upload className="h-4 w-4 mr-2" /> Upload Invoice</Button></div><p className="text-xs text-gray-500">Uploaded supplier invoices and bills</p></CardHeader>
            <CardContent className="p-0">
              {invoices.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No invoices uploaded yet</p>
                  <p className="text-xs mt-1">Click "Upload Invoice" to add supplier bills</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {invoices.map((invoice) => (
                    <Card key={invoice.id} className="overflow-hidden">
                      <div className="relative h-40 bg-gray-100 flex items-center justify-center">
                        <img src={invoice.imageUrl} alt="Invoice" className="w-full h-full object-cover" />
                      </div>
                      <CardContent className="p-3">
                        <p className="text-xs text-gray-500">Uploaded: {formatDate(invoice.createdAt)}</p>
                        <p className="text-xs text-gray-500">By: {invoice.uploadedBy?.name}</p>
                        {invoice.notes && <p className="text-xs text-gray-600 mt-1">{invoice.notes}</p>}
                        <div className="flex gap-2 mt-3">
                          <a href={invoice.imageUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                            <Button size="sm" variant="outline" className="w-full"><Eye className="h-3 w-3 mr-1" /> View</Button>
                          </a>
                          <Button size="sm" variant="outline" className="text-red-500" onClick={() => handleDeleteInvoice(invoice.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Record Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg"><div className="flex justify-between"><span>Total Amount:</span><span className="font-semibold">{formatCurrency(order.totalAmount)}</span></div><div className="flex justify-between mt-1"><span>Remaining:</span><span className="font-semibold text-red-600">{formatCurrency(calculateRemainingBalance())}</span></div></div>
            <div><Label>Amount *</Label><Input type="number" placeholder="0.00" value={paymentData.amount} onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })} /></div>
            <div><Label>Payment Method</Label><Select value={paymentData.paymentMethod} onValueChange={(v) => setPaymentData({ ...paymentData, paymentMethod: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem><SelectItem value="CASH">Cash</SelectItem><SelectItem value="CHEQUE">Cheque</SelectItem><SelectItem value="ONLINE">Online Payment</SelectItem></SelectContent></Select></div>
            <div><Label>Transaction ID</Label><Input placeholder="e.g., TRX123456" value={paymentData.transactionId} onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })} /></div>
            <div><Label>Payment Date</Label><Input type="date" value={paymentData.paymentDate} onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea placeholder="Additional notes..." value={paymentData.notes} onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button><Button onClick={handleAddPayment} disabled={updating} className="bg-green-600">{updating ? "Processing..." : "Record Payment"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Invoice Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Upload Invoice / Bill</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Invoice Image</Label>
              <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-emerald-500 transition-colors" onClick={() => document.getElementById("invoiceFile").click()}>
                {invoicePreview ? (
                  <img src={invoicePreview} alt="Preview" className="max-h-40 mx-auto" />
                ) : (
                  <div className="py-4"><ImageIcon className="h-10 w-10 mx-auto text-gray-400" /><p className="text-sm text-gray-500 mt-2">Click to upload invoice image</p><p className="text-xs text-gray-400">PNG, JPG up to 5MB</p></div>
                )}
                <input id="invoiceFile" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
            </div>
            <div><Label>Notes (Optional)</Label><Textarea placeholder="Invoice number, date, remarks..." value={invoiceNotes} onChange={(e) => setInvoiceNotes(e.target.value)} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => { setShowInvoiceDialog(false); setInvoiceFile(null); setInvoicePreview(null); setInvoiceNotes(""); }}>Cancel</Button><Button onClick={handleUploadInvoice} disabled={uploadingInvoice || !invoiceFile} className="bg-emerald-600">{uploadingInvoice ? "Uploading..." : "Upload Invoice"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive Goods Dialog */}
      <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-emerald-600" /> Receive Goods</DialogTitle>
            <p className="text-sm text-gray-500">PO: {order.orderNumber} | {order.supplier?.name}</p>
            <p className="text-xs text-amber-600">⚠️ Record good vs damaged quantities. Only GOOD items will be added to stock.</p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2 bg-blue-50 rounded-lg"><p className="text-xs text-blue-600">Items</p><p className="text-lg font-bold text-blue-700">{receivingItems.length}</p></div>
              <div className="p-2 bg-green-50 rounded-lg"><p className="text-xs text-green-600">Good Stock</p><p className="text-lg font-bold text-green-700">{receivingItems.reduce((sum, i) => sum + (i.receivingQty - i.damagedQty), 0)}</p></div>
              <div className="p-2 bg-red-50 rounded-lg"><p className="text-xs text-red-600">Damaged</p><p className="text-lg font-bold text-red-700">{receivingItems.reduce((sum, i) => sum + i.damagedQty, 0)}</p></div>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Material</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Ordered</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Prev Rec</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 bg-green-50">Good</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 bg-red-50">Damage</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Remarks</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {receivingItems.map((item, idx) => {
                    const remainingQty = item.orderedQty - item.previouslyReceived;
                    const isComplete = item.previouslyReceived >= item.orderedQty;
                    if (isComplete) return null;
                    return (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-sm">{item.name}</td>
                        <td className="px-3 py-2 text-center text-sm">{item.orderedQty}</td>
                        <td className="px-3 py-2 text-center text-sm">{item.previouslyReceived}</td>
                        <td className="px-3 py-2 text-center bg-green-50">
                          <Input type="number" min="0" max={remainingQty} value={item.receivingQty || ""} onChange={(e) => updateReceivingItem(idx, "receivingQty", e.target.value)} className="w-20 h-8 text-center text-sm" placeholder="0" />
                        </td>
                        <td className="px-3 py-2 text-center bg-red-50">
                          {item.receivingQty > 0 && <Input type="number" min="0" max={item.receivingQty} value={item.damagedQty || ""} onChange={(e) => updateReceivingItem(idx, "damagedQty", e.target.value)} className="w-20 h-8 text-center text-sm" placeholder="0" />}
                        </td>
                        <td className="px-3 py-2">
                          {item.receivingQty > 0 && <Input placeholder="Notes" value={item.remarks} onChange={(e) => updateReceivingItem(idx, "remarks", e.target.value)} className="w-28 h-8 text-sm" />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Textarea value={receivingNotes} onChange={(e) => setReceivingNotes(e.target.value)} placeholder="Additional notes about this delivery..." rows={2} className="text-sm" />
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Total Ordered: <span className="font-semibold">{receivingItems.reduce((sum, i) => sum + i.orderedQty, 0)} units</span></span>
                <span>Good to add to stock: <span className="font-semibold text-green-600">{receivingItems.reduce((sum, i) => sum + (i.receivingQty - i.damagedQty), 0)} units</span></span>
                <span>Damaged (to return): <span className="font-semibold text-red-600">{receivingItems.reduce((sum, i) => sum + i.damagedQty, 0)} units</span></span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceiveDialog(false)}>Cancel</Button>
            <Button onClick={handleReceiveGoods} disabled={updating} className="bg-emerald-600">{updating ? "Processing..." : "Confirm Receipt"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}