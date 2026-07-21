// src/pages/staff/StaffOrders.jsx

import { useEffect, useState } from "react";
import { salesOrdersApi } from "@/api/index.js";
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
  Ban,
  Wallet,
  CreditCard as CreditCardIcon,
  Coins,
  Landmark,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Eye,
  Printer,
  XCircle,
  FileText,
  MapPin,
  Mail,
  Hash,
  CalendarDays,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/utils/helpers.js";

export default function StaffOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState({ 
    page: 1, 
    total: 0, 
    pages: 1, 
    limit: 20 
  });
  const [showPaymentFilter, setShowPaymentFilter] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const userRole = localStorage.getItem("ims_role") || "STAFF";

  // Fetch orders when filters or pagination changes
  useEffect(() => {
    fetchOrders();
  }, [activeFilter, paymentFilter, pagination.page, pagination.limit]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length === 0 || searchTerm.length >= 2) {
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchOrders();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

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
        ...(paymentFilter !== "all" && { paymentMethod: paymentFilter }),
        ...(searchTerm && { search: searchTerm }),
      };

      const response = await salesOrdersApi.getAll(params);
      
      const responseData = response.data;
      setOrders(responseData.data || []);
      setPagination({
        page: responseData.page || 1,
        total: responseData.total || 0,
        pages: responseData.pages || 1,
        limit: responseData.limit || pagination.limit,
      });
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const processOrder = async (orderId) => {
    setProcessingId(orderId);
    try {
      await salesOrdersApi.updateStatus(orderId, "PROCESSING");
      toast.success("Order processed! Delivery created automatically.");
      await fetchOrders();
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
      await fetchOrders();
    } catch (error) {
      toast.error("Failed to cancel order");
    } finally {
      setCancellingId(null);
    }
  };

  // Navigate to delivery page
  const navigateToDelivery = () => {
    const role = userRole.toLowerCase();
    if (role === "admin") window.location.href = "/admin/delivery";
    else if (role === "manager") window.location.href = "/manager/delivery";
    else window.location.href = "/staff/delivery";
  };

  // Open invoice modal
  const openInvoice = (order) => {
    setSelectedOrder(order);
    setShowInvoiceModal(true);
    document.body.style.overflow = "hidden";
  };

  // Close invoice modal
  const closeInvoice = () => {
    setShowInvoiceModal(false);
    setSelectedOrder(null);
    document.body.style.overflow = "unset";
  };

  // Professional print function
  const printInvoice = () => {
    if (!selectedOrder) return;

    const order = selectedOrder;
    const customer = order.customer || {};
    const payment = order.payment || {};
    const items = order.items || [];
    const delivery = order.delivery || {};
    const invoice = order.salesInvoice || {};

    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
      toast.error("Please allow popups to print the invoice");
      return;
    }

    const getStatusClass = (status) => {
      const classes = {
        PENDING: 'badge-pending',
        PROCESSING: 'badge-processing',
        DISPATCHED: 'badge-dispatched',
        COMPLETED: 'badge-completed',
        CANCELLED: 'badge-cancelled',
      };
      return classes[status] || 'badge-pending';
    };

    const getStatusLabel = (status) => {
      const labels = {
        PENDING: 'Pending',
        PROCESSING: 'Processing',
        DISPATCHED: 'Dispatched',
        COMPLETED: 'Completed',
        CANCELLED: 'Cancelled',
      };
      return labels[status] || status;
    };

    const getPaymentBadgeClass = (method) => {
      const classes = {
        CASH: 'badge-cash',
        ONLINE: 'badge-online',
        CREDIT: 'badge-credit',
        PAY_LATER: 'badge-pay_later',
      };
      return classes[method] || 'badge-pending';
    };

    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${order.orderNumber}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: white; padding: 40px; color: #1a1a1a; line-height: 1.6; }
            .invoice-print-container { max-width: 1100px; margin: 0 auto; background: white; }
            .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; margin-bottom: 24px; }
            .invoice-title h1 { font-size: 28px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; }
            .invoice-title .order-number { font-size: 14px; color: #6b7280; }
            ${invoice.invoiceNumber ? `.invoice-title .invoice-number { font-size: 14px; color: #3b82f6; font-weight: 600; margin-top: 2px; }` : ''}
            .invoice-title .badge-container { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
            .badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 500; }
            .badge-pending { background: #fef3c7; color: #92400e; }
            .badge-processing { background: #dbeafe; color: #1e40af; }
            .badge-dispatched { background: #f3e8ff; color: #6b21a5; }
            .badge-completed { background: #d1fae5; color: #065f46; }
            .badge-cancelled { background: #fee2e2; color: #991b1b; }
            .badge-cash { background: #d1fae5; color: #065f46; }
            .badge-online { background: #dbeafe; color: #1e40af; }
            .badge-credit { background: #f3e8ff; color: #6b21a5; }
            .badge-pay_later { background: #fef3c7; color: #92400e; }
            .invoice-meta { text-align: right; }
            .invoice-meta p { font-size: 14px; color: #6b7280; margin-bottom: 4px; }
            .invoice-meta .label { font-weight: 600; color: #374151; }
            .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
            .detail-box { background: #f9fafb; border-radius: 8px; padding: 16px; }
            .detail-box h3 { font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
            .detail-box .detail-row { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #374151; padding: 2px 0; }
            .detail-box .detail-row .icon { width: 16px; height: 16px; color: #9ca3af; flex-shrink: 0; }
            .detail-box .detail-row .value { font-weight: 500; }
            .items-table-section { margin-bottom: 24px; }
            .items-table-section h3 { font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
            .items-table { width: 100%; border-collapse: collapse; }
            .items-table thead { background: #f9fafb; }
            .items-table th { padding: 10px 14px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb; }
            .items-table th.text-right { text-align: right; }
            .items-table td { padding: 10px 14px; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6; }
            .items-table td.text-right { text-align: right; }
            .items-table .product-name { font-weight: 500; }
            .items-table .product-unit { font-size: 12px; color: #9ca3af; }
            .items-table tfoot tr { background: #f9fafb; }
            .items-table tfoot td { padding: 10px 14px; font-size: 14px; font-weight: 600; border-top: 2px solid #e5e7eb; }
            .items-table tfoot .total-row { background: #eff6ff; border-top: 2px solid #93c5fd; }
            .items-table tfoot .total-row td { font-size: 16px; font-weight: 700; color: #1e40af; padding: 12px 14px; }
            .footer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
            .footer-box { background: #f9fafb; border-radius: 8px; padding: 16px; }
            .footer-box h4 { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
            .footer-box p { font-size: 14px; color: #374151; padding: 2px 0; }
            .footer-box .label { font-weight: 500; }
            .footer-box .payment-status-badge { display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 12px; font-weight: 500; }
            .payment-completed { background: #d1fae5; color: #065f46; }
            .payment-pending { background: #fef3c7; color: #92400e; }
            .invoice-footer { margin-top: 32px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; }
            .invoice-footer p { font-size: 14px; color: #6b7280; }
            .invoice-footer .sub-text { font-size: 12px; color: #9ca3af; margin-top: 4px; }
            ${invoice.invoiceNumber ? `.invoice-footer .invoice-number-text { font-size: 11px; color: #9ca3af; margin-top: 6px; }` : ''}
            @media print { body { padding: 20px; background: white; } .detail-box { break-inside: avoid; } .items-table tbody tr { break-inside: avoid; } .items-table tfoot tr { break-inside: avoid; } }
          </style>
        </head>
        <body>
          <div class="invoice-print-container">
            <div class="invoice-header">
              <div class="invoice-title">
                <h1>INVOICE</h1>
                ${invoice.invoiceNumber ? `<p class="invoice-number">Invoice #${invoice.invoiceNumber}</p>` : ''}
                <p class="order-number">Order #${order.orderNumber}</p>
                <div class="badge-container">
                  <span class="badge ${getStatusClass(order.status)}">${getStatusLabel(order.status)}</span>
                  <span class="badge ${getPaymentBadgeClass(payment.method)}">${payment.method || 'N/A'}</span>
                  ${invoice.status ? `<span class="badge ${invoice.status === 'PAID' ? 'badge-completed' : 'badge-pending'}">${invoice.status}</span>` : ''}
                </div>
              </div>
              <div class="invoice-meta">
                <p><span class="label">Invoice Date:</span> ${formatDate(invoice.invoiceDate || order.createdAt)}</p>
                ${invoice.dueDate ? `<p><span class="label">Due Date:</span> ${formatDate(invoice.dueDate)}</p>` : ''}
                <p><span class="label">Payment Status:</span> 
                  <span class="badge ${payment.status === 'COMPLETED' ? 'badge-completed' : 'badge-pending'}">
                    ${payment.status || 'PENDING'}
                  </span>
                </p>
              </div>
            </div>

            <div class="details-grid">
              <div class="detail-box">
                <h3>Customer Details</h3>
                <div class="detail-row"><span class="value">${customer.name || 'N/A'}</span></div>
                ${customer.phone ? `<div class="detail-row"><span class="icon">📞</span><span>${customer.phone}</span></div>` : ''}
                ${customer.email ? `<div class="detail-row"><span class="icon">✉️</span><span>${customer.email}</span></div>` : ''}
                ${customer.address ? `<div class="detail-row"><span class="icon">📍</span><span>${customer.address}</span></div>` : ''}
              </div>

              <div class="detail-box">
                <h3>Order Details</h3>
                <div class="detail-row"><span class="icon">#️⃣</span><span>Order ID: <span class="value">${order.orderNumber}</span></span></div>
                ${invoice.invoiceNumber ? `<div class="detail-row"><span class="icon">🧾</span><span>Invoice: <span class="value">${invoice.invoiceNumber}</span></span></div>` : ''}
                <div class="detail-row"><span class="icon">📅</span><span>Created: ${formatDate(order.createdAt)}</span></div>
                ${order.notes ? `<div class="detail-row"><span class="icon">📝</span><span>${order.notes}</span></div>` : ''}
                ${delivery && delivery.status ? `<div class="detail-row"><span class="icon">🚚</span><span>Delivery: ${delivery.status}</span></div>` : ''}
                ${delivery && delivery.deliveryDate ? `<div class="detail-row"><span class="icon">📅</span><span>Expected: ${formatDate(delivery.deliveryDate)}</span></div>` : ''}
              </div>
            </div>

            <div class="items-table-section">
              <h3>Items</h3>
              <table class="items-table">
                <thead>
                  <tr>
                    <th style="width: 50px;">#</th>
                    <th>Product</th>
                    <th class="text-right" style="width: 100px;">Quantity</th>
                    <th class="text-right" style="width: 120px;">Unit Price</th>
                    <th class="text-right" style="width: 120px;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map((item, index) => `
                    <tr>
                      <td>${index + 1}</td>
                      <td><span class="product-name">${item.product?.name || item.name || 'N/A'}</span>${item.product?.unit ? `<span class="product-unit">(${item.product.unit})</span>` : ''}</td>
                      <td class="text-right">${item.quantity}</td>
                      <td class="text-right">${formatCurrency(item.unitPrice || item.price || 0)}</td>
                      <td class="text-right">${formatCurrency((item.unitPrice || item.price || 0) * item.quantity)}</td>
                    </tr>
                  `).join('')}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" style="text-align: right; font-weight: 600;">Subtotal</td>
                    <td colspan="2" style="text-align: right; font-weight: 600;">${formatCurrency(order.totalAmount || 0)}</td>
                  </tr>
                  ${payment && payment.amount && payment.amount !== order.totalAmount ? `
                    <tr>
                      <td colspan="3" style="text-align: right; font-weight: 600;">Paid Amount</td>
                      <td colspan="2" style="text-align: right; font-weight: 600;">${formatCurrency(payment.amount || 0)}</td>
                    </tr>
                  ` : ''}
                  <tr class="total-row">
                    <td colspan="3" style="text-align: right; font-weight: 700;">Total Amount</td>
                    <td colspan="2" style="text-align: right; font-weight: 700;">${formatCurrency(order.totalAmount || 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div class="footer-grid">
              <div class="footer-box">
                <h4>Payment Information</h4>
                <p><span class="label">Method:</span> <span class="badge ${getPaymentBadgeClass(payment.method)}">${payment.method || 'N/A'}</span></p>
                ${payment.method === 'ONLINE' && payment.platform ? `<p><span class="label">Platform:</span> ${payment.platform}</p>` : ''}
                ${payment.method === 'ONLINE' && payment.platformTransactionId ? `<p><span class="label">Transaction ID:</span> ${payment.platformTransactionId}</p>` : ''}
                <p><span class="label">Status:</span> <span class="payment-status-badge ${payment.status === 'COMPLETED' ? 'payment-completed' : 'payment-pending'}">${payment.status || 'PENDING'}</span></p>
                ${payment.verifiedAt ? `<p><span class="label">Verified:</span> ${formatDate(payment.verifiedAt)}</p>` : ''}
              </div>
              ${order.notes ? `<div class="footer-box"><h4>Notes</h4><p>${order.notes}</p></div>` : ''}
            </div>

            <div class="invoice-footer">
              <p>Thank you for your business!</p>
              <p class="sub-text">This is a system-generated invoice. For any queries, please contact support.</p>
              ${invoice.invoiceNumber ? `<p class="invoice-number-text">Invoice #${invoice.invoiceNumber}</p>` : ''}
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          <\/script>
        </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        closeInvoice();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { label: "Pending", className: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
      PROCESSING: { label: "Processing", className: "bg-blue-100 text-blue-800 border-blue-200", icon: Truck },
      DISPATCHED: { label: "Dispatched", className: "bg-purple-100 text-purple-800 border-purple-200", icon: Truck },
      COMPLETED: { label: "Completed", className: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
      CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-800 border-red-200", icon: Ban },
    };
    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-800", icon: AlertCircle };
    const Icon = config.icon;
    return (
      <Badge className={`${config.className} flex items-center gap-1 px-2 py-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPaymentBadge = (paymentMethod) => {
    const paymentConfig = {
      CASH: { label: "Cash", className: "bg-green-100 text-green-800", icon: Coins },
      ONLINE: { label: "Online", className: "bg-blue-100 text-blue-800", icon: Landmark },
      CREDIT: { label: "Credit", className: "bg-purple-100 text-purple-800", icon: CreditCardIcon },
      PAY_LATER: { label: "Pay Later", className: "bg-orange-100 text-orange-800", icon: Wallet },
    };
    const config = paymentConfig[paymentMethod] || { 
      label: paymentMethod || "N/A", 
      className: "bg-gray-100 text-gray-800",
      icon: Wallet
    };
    const Icon = config.icon;
    return (
      <Badge className={`${config.className} flex items-center gap-1 px-2 py-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const paymentFilters = [
    { id: "all", label: "All Payment Methods", icon: Wallet, color: "gray" },
    { id: "CASH", label: "Cash", icon: Coins, color: "green" },
    { id: "ONLINE", label: "Online", icon: Landmark, color: "blue" },
    { id: "CREDIT", label: "Credit", icon: CreditCardIcon, color: "purple" },
    { id: "PAY_LATER", label: "Pay Later", icon: Wallet, color: "orange" },
  ];

  const statusFilters = [
    { id: "all", label: "All Orders", icon: Package, color: "gray" },
    { id: "pending", label: "Pending", icon: Clock, color: "yellow" },
    { id: "processing", label: "Processing", icon: Truck, color: "blue" },
    { id: "completed", label: "Completed", icon: CheckCircle, color: "green" },
    { id: "cancelled", label: "Cancelled", icon: Ban, color: "red" },
  ];

  // ✅ Format products with quantity
  const formatProductsWithQuantity = (items) => {
    if (!items || items.length === 0) return "N/A";
    return items.map(item => `${item.product?.name || item.name || 'Unknown'} → ${item.quantity}`).join('\n');
  };

  // ✅ Invoice Modal Component
  const InvoiceModal = ({ order, onClose }) => {
    if (!order) return null;

    const customer = order.customer || {};
    const payment = order.payment || {};
    const items = order.items || [];
    const delivery = order.delivery || {};
    const invoice = order.salesInvoice || {};

    return (
      <div 
        className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Receipt className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">Invoice</h2>
                <Badge variant="outline" className="ml-2">
                  {order.orderNumber}
                </Badge>
                {invoice.invoiceNumber && (
                  <Badge className="bg-blue-100 text-blue-700 ml-1">
                    #{invoice.invoiceNumber}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={printInvoice}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Close
                </Button>
              </div>
            </div>

            <div className="p-6" id="invoice-content">
              {/* Invoice Header */}
              <div className="flex justify-between items-start mb-6 pb-6 border-b border-gray-200">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">INVOICE</h1>
                  {invoice.invoiceNumber && (
                    <p className="text-sm font-medium text-blue-600 mt-1">
                      Invoice #{invoice.invoiceNumber}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    Order #{order.orderNumber}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {getStatusBadge(order.status)}
                    {getPaymentBadge(payment.method)}
                    {invoice.status && (
                      <Badge className={invoice.status === "PAID" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                        {invoice.status}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Invoice Date</p>
                  <p className="font-medium">{formatDate(invoice.invoiceDate || order.createdAt)}</p>
                  {invoice.dueDate && (
                    <>
                      <p className="text-sm text-gray-500 mt-1">Due Date</p>
                      <p className="font-medium">{formatDate(invoice.dueDate)}</p>
                    </>
                  )}
                  <p className="text-sm text-gray-500 mt-1">Payment Status</p>
                  <Badge className={payment.status === "COMPLETED" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                    {payment.status || "PENDING"}
                  </Badge>
                </div>
              </div>

              {/* Customer & Order Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer Details
                  </h3>
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900">{customer.name || "N/A"}</p>
                    {customer.phone && (
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        {customer.phone}
                      </p>
                    )}
                    {customer.email && (
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        {customer.email}
                      </p>
                    )}
                    {customer.address && (
                      <p className="text-sm text-gray-600 flex items-start gap-2">
                        <MapPin className="h-3 w-3 mt-0.5" />
                        {customer.address}
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Order Details
                  </h3>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Hash className="h-3 w-3" />
                      Order ID: {order.orderNumber}
                    </p>
                    {invoice.invoiceNumber && (
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <Receipt className="h-3 w-3" />
                        Invoice: <span className="font-semibold">{invoice.invoiceNumber}</span>
                      </p>
                    )}
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <CalendarDays className="h-3 w-3" />
                      Created: {formatDate(order.createdAt)}
                    </p>
                    {order.notes && (
                      <p className="text-sm text-gray-600 flex items-start gap-2">
                        <FileText className="h-3 w-3 mt-0.5" />
                        {order.notes}
                      </p>
                    )}
                    {delivery && delivery.status && (
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <Truck className="h-3 w-3" />
                        Delivery: {delivery.status}
                      </p>
                    )}
                    {delivery && delivery.deliveryDate && (
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Expected: {formatDate(delivery.deliveryDate)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {item.product?.name || item.name || "N/A"}
                            {item.product?.unit && (
                              <span className="text-xs text-gray-400 ml-1">
                                ({item.product.unit})
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            {formatCurrency(item.unitPrice || item.price || 0)}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-right">
                            {formatCurrency((item.unitPrice || item.price || 0) * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50">
                        <td colSpan="3" className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                          Subtotal
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-right" colSpan="2">
                          {formatCurrency(order.totalAmount || 0)}
                        </td>
                      </tr>
                      {payment && payment.amount && payment.amount !== order.totalAmount && (
                        <tr className="bg-gray-50">
                          <td colSpan="3" className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                            Paid Amount
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-right" colSpan="2">
                            {formatCurrency(payment.amount || 0)}
                          </td>
                        </tr>
                      )}
                      <tr className="bg-blue-50 border-t-2 border-blue-200">
                        <td colSpan="3" className="px-4 py-3 text-sm font-bold text-blue-700 text-right">
                          Total Amount
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-blue-700 text-right" colSpan="2">
                          {formatCurrency(order.totalAmount || 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Payment & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Payment Information</h4>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="font-medium">Method:</span>
                      {getPaymentBadge(payment.method)}
                    </p>
                    {payment.method === "ONLINE" && payment.platform && (
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="font-medium">Platform:</span>
                        {payment.platform}
                      </p>
                    )}
                    {payment.method === "ONLINE" && payment.platformTransactionId && (
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="font-medium">Transaction ID:</span>
                        <span className="font-mono text-xs">{payment.platformTransactionId}</span>
                      </p>
                    )}
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="font-medium">Status:</span>
                      <Badge className={payment.status === "COMPLETED" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                        {payment.status || "PENDING"}
                      </Badge>
                    </p>
                    {payment.verifiedAt && (
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="font-medium">Verified:</span>
                        {formatDate(payment.verifiedAt)}
                      </p>
                    )}
                  </div>
                </div>

                {order.notes && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Notes</h4>
                    <p className="text-sm text-gray-600">{order.notes}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                <p className="text-sm text-gray-500">
                  Thank you for your business! 
                  <span className="block text-xs mt-1 text-gray-400">
                    This is a system-generated invoice. For any queries, please contact support.
                  </span>
                </p>
                {invoice.invoiceNumber && (
                  <p className="text-xs text-gray-400 mt-2">
                    Invoice #{invoice.invoiceNumber}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const resetFilters = () => {
    setSearchTerm("");
    setActiveFilter("all");
    setPaymentFilter("all");
    setPagination(prev => ({ ...prev, page: 1 }));
    setShowPaymentFilter(false);
  };

  const getSelectedPaymentLabel = () => {
    const found = paymentFilters.find(f => f.id === paymentFilter);
    return found ? found.label : "Payment";
  };

  const getSelectedStatusLabel = () => {
    const found = statusFilters.find(f => f.id === activeFilter);
    return found ? found.label : "Status";
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= pagination.pages) {
      setPagination(prev => ({ ...prev, page }));
    }
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
        <p className="text-sm text-gray-400 mt-1">
          Total: {pagination.total} orders • Page {pagination.page} of {pagination.pages}
        </p>
      </div>

      {/* Search Bar and Filters */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by order ID, customer, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                setPagination(prev => ({ ...prev, page: 1 }));
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

          {/* Payment Filter Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowPaymentFilter(!showPaymentFilter)}
              className="gap-2"
            >
              <Wallet className="h-4 w-4" />
              {getSelectedPaymentLabel()}
              <ChevronRight className={`h-3 w-3 transition-transform ${showPaymentFilter ? 'rotate-90' : ''}`} />
            </Button>

            {showPaymentFilter && (
              <div className="absolute right-0 top-full mt-2 z-10 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[200px] py-1">
                {paymentFilters.map((filter) => {
                  const Icon = filter.icon;
                  const isActive = paymentFilter === filter.id;
                  const colorClass = {
                    gray: isActive ? "bg-gray-100 text-gray-800" : "",
                    green: isActive ? "bg-green-50 text-green-700" : "",
                    blue: isActive ? "bg-blue-50 text-blue-700" : "",
                    purple: isActive ? "bg-purple-50 text-purple-700" : "",
                    orange: isActive ? "bg-orange-50 text-orange-700" : "",
                  };
                  return (
                    <button
                      key={filter.id}
                      onClick={() => {
                        setPaymentFilter(filter.id);
                        setPagination(prev => ({ ...prev, page: 1 }));
                        setShowPaymentFilter(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${colorClass[filter.color]}`}
                    >
                      <Icon className="h-4 w-4" />
                      {filter.label}
                      {isActive && <CheckCircle className="h-3 w-3 ml-auto text-green-500" />}
                    </button>
                  );
                })}
              </div>
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

          <Button
            variant="outline"
            onClick={fetchOrders}
            className="gap-2"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Active Filters Display */}
      {(activeFilter !== "all" || paymentFilter !== "all" || searchTerm) && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-500">Active filters:</span>
          {activeFilter !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Status: {getSelectedStatusLabel()}
              <X className="h-3 w-3 cursor-pointer hover:text-red-500" onClick={() => setActiveFilter("all")} />
            </Badge>
          )}
          {paymentFilter !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Payment: {getSelectedPaymentLabel()}
              <X className="h-3 w-3 cursor-pointer hover:text-red-500" onClick={() => setPaymentFilter("all")} />
            </Badge>
          )}
          {searchTerm && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: {searchTerm}
              <X className="h-3 w-3 cursor-pointer hover:text-red-500" onClick={() => setSearchTerm("")} />
            </Badge>
          )}
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto pb-1">
          {statusFilters.map((filter) => {
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
                  setPagination(prev => ({ ...prev, page: 1 }));
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

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mb-3" />
              <p className="text-gray-500 text-center">No orders found</p>
              <p className="text-sm text-gray-400 mt-1">
                {activeFilter !== "all" || paymentFilter !== "all"
                  ? `No orders match your current filters`
                  : searchTerm
                  ? `No orders matching "${searchTerm}"`
                  : "Create a new order to get started"}
              </p>
              {activeFilter === "all" && paymentFilter === "all" && !searchTerm && (
                <Button className="mt-4 bg-blue-600" onClick={() => window.location.href = "/staff/create-order"}>
                  Create New Order
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
                  {orders.map((order) => {
                    const productsWithQty = formatProductsWithQuantity(order.items);
                    
                    return (
                      <TableRow key={order.id} className="hover:bg-gray-50">
                        <TableCell className="font-mono text-xs font-medium">
                          {order.orderNumber}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-xs font-bold text-blue-600">
                                {order.customer?.name?.charAt(0)?.toUpperCase() || "U"}
                              </span>
                            </div>
                            <span className="text-sm font-medium">{order.customer?.name || "Unknown"}</span>
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
                          {order.items?.reduce((sum, i) => sum + i.quantity, 0) || 0}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(order.totalAmount || 0)}
                        </TableCell>
                        <TableCell>
                          {getPaymentBadge(order.payment?.method || order.paymentType)}
                          {order.payment?.method === "CREDIT" && order.payment?.status === "PENDING" && (
                            <Badge className="bg-amber-100 text-amber-800 text-xs mt-1 block text-center">
                              Awaiting Payment
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(order.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-blue-600"
                              onClick={() => openInvoice(order)}
                              title="View Invoice"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {order.status === "PENDING" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-green-600"
                                onClick={() => processOrder(order.id)}
                                disabled={processingId === order.id}
                                title="Process Order"
                              >
                                {processingId === order.id ? (
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                                ) : (
                                  <Truck className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            
                            {["PENDING", "PROCESSING"].includes(order.status) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-600"
                                onClick={() => cancelOrder(order.id)}
                                disabled={cancellingId === order.id}
                                title="Cancel Order"
                              >
                                {cancellingId === order.id ? (
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                                ) : (
                                  <Ban className="h-4 w-4" />
                                )}
                              </Button>
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
                {pagination.total} orders
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

      {/* Invoice Modal */}
      {showInvoiceModal && selectedOrder && (
        <InvoiceModal order={selectedOrder} onClose={closeInvoice} />
      )}
    </div>
  );
}