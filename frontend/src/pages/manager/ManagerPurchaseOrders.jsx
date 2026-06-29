// src/pages/manager/ManagerPurchaseOrders.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { purchaseOrdersApi } from "@/api/index.js";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";
import { PageHeader } from "@/components/shared/PageHeader.jsx";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner.jsx";
import { 
  Search, Plus, Eye, Filter, X, 
  ChevronLeft, ChevronRight, Calendar, 
  CheckCircle, Clock, AlertCircle, Truck,
  DollarSign, Package, Printer, Download
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/utils/helpers.js";

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending Approval", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  { value: "APPROVED", label: "Approved", color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  { value: "PARTIALLY_RECEIVED", label: "Partially Received", color: "bg-orange-100 text-orange-700", icon: Package },
  { value: "RECEIVED", label: "Received", color: "bg-green-100 text-green-700", icon: CheckCircle },
  { value: "CANCELLED", label: "Cancelled", color: "bg-red-100 text-red-700", icon: AlertCircle },
];

const PAYMENT_STATUS_COLORS = {
  PAID: "bg-green-100 text-green-700",
  UNPAID: "bg-red-100 text-red-700",
  PARTIAL: "bg-yellow-100 text-yellow-700",
};

export default function ManagerPurchaseOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [stats, setStats] = useState({ 
    total: 0, 
    pendingApproval: 0, 
    approved: 0, 
    received: 0,
    cancelled: 0,
    partiallyReceived: 0
  });
  const [pagination, setPagination] = useState({ 
    page: 1, 
    total: 0, 
    pages: 1, 
    limit: 10 
  });

  useEffect(() => {
    fetchOrders();
  }, [pagination.page, search, statusFilter, paymentFilter, dateRange]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(search && { search }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(paymentFilter !== "all" && { paymentStatus: paymentFilter }),
      };
      
      // Fixed date range - proper ISO format with timezone handling
      if (dateRange.start) {
        const startDate = new Date(dateRange.start);
        startDate.setHours(0, 0, 0, 0);
        params.startDate = startDate.toISOString();
      }
      if (dateRange.end) {
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        params.endDate = endDate.toISOString();
      }
      
      const response = await purchaseOrdersApi.getAll(params);
      setOrders(response.data.data || []);
      setStats({
        total: response.data.stats?.total || 0,
        pendingApproval: response.data.stats?.pendingApproval || 0,
        approved: response.data.stats?.approved || 0,
        received: response.data.stats?.received || 0,
        cancelled: response.data.stats?.cancelled || 0,
        partiallyReceived: response.data.stats?.partiallyReceived || 0,
      });
      setPagination(response.data.pagination);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      toast.error("Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const option = STATUS_OPTIONS.find(s => s.value === status);
    const Icon = option?.icon || Clock;
    return (
      <Badge className={`${option?.color || "bg-gray-100"} flex items-center gap-1 px-2 py-1`}>
        <Icon className="h-3 w-3" />
        {option?.label || status}
      </Badge>
    );
  };

  const getPaymentBadge = (status) => (
    <Badge className={PAYMENT_STATUS_COLORS[status] || "bg-gray-100"}>
      {status || "UNPAID"}
    </Badge>
  );

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setDateRange({ start: "", end: "" });
    setPagination({ ...pagination, page: 1 });
    setShowDatePicker(false);
  };

  const hasFilters = search || statusFilter !== "all" || paymentFilter !== "all" || dateRange.start || dateRange.end;

  const handleExportCSV = () => {
    try {
      const csvData = orders.map(order => ({
        'PO Number': order.orderNumber,
        'Supplier': order.supplier?.name,
        'Date Created': formatDate(order.createdAt),
        'Expected Delivery': order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : '—',
        'Status': order.status,
        'Total Amount': order.totalAmount,
        'Payment Status': order.paymentStatus,
      }));
      
      const headers = Object.keys(csvData[0] || {});
      const csvRows = [
        headers.join(','),
        ...csvData.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))
      ];
      const csvString = csvRows.join('\n');
      
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `purchase-orders-${formatDate(new Date())}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export successful");
    } catch (error) {
      toast.error("Failed to export");
    }
  };

  // ==================== PRINT FUNCTION (No Popup Blocking) ====================
  const handlePrintPOs = () => {
    if (orders.length === 0) {
      toast.error("No orders to print");
      return;
    }

    // Create hidden iframe for printing (no popup blocking)
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.width = '0px';
    printFrame.style.height = '0px';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Orders Report</title>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', 'Arial', sans-serif;
            line-height: 1.5;
            color: #1f2937;
            background: white;
            padding: 40px;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #10b981;
          }
          .header h1 {
            font-size: 28px;
            color: #10b981;
            margin-bottom: 8px;
          }
          .header p {
            color: #6b7280;
            font-size: 12px;
          }
          .company-info {
            text-align: center;
            margin-bottom: 20px;
          }
          .company-info h2 {
            font-size: 18px;
            color: #1f2937;
          }
          .filters-info {
            background: #f9fafb;
            padding: 12px;
            margin-bottom: 20px;
            border-radius: 8px;
            font-size: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #e5e7eb;
            padding: 10px;
            text-align: left;
          }
          th {
            background: #f3f4f6;
            font-weight: 600;
            font-size: 13px;
          }
          td {
            font-size: 12px;
          }
          .text-right {
            text-align: right;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 11px;
            color: #9ca3af;
          }
          .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
          }
          .status-PENDING { background: #fef3c7; color: #d97706; }
          .status-APPROVED { background: #dbeafe; color: #2563eb; }
          .status-PARTIALLY_RECEIVED { background: #fed7aa; color: #ea580c; }
          .status-RECEIVED { background: #d1fae5; color: #059669; }
          .status-CANCELLED { background: #fee2e2; color: #dc2626; }
          @media print {
            body { margin: 0; padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>PURCHASE ORDERS REPORT</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="company-info">
            <h2>Fusion Water Industries</h2>
            <p>Industrial Area, Pokhara, Nepal | Tel: +977 61-123456</p>
          </div>
          
          <div class="filters-info">
            <strong>Filters Applied:</strong> 
            Status: ${statusFilter === "all" ? "All" : statusFilter} | 
            Payment: ${paymentFilter === "all" ? "All" : paymentFilter} |
            Search: ${search || "None"} | 
            Date Range: ${dateRange.start || "Any"} to ${dateRange.end || "Any"}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Date</th>
                <th>Expected Delivery</th>
                <th>Status</th>
                <th class="text-right">Total Amount</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map(order => `
                <tr>
                  <td>${order.orderNumber}</td>
                  <td>${order.supplier?.name || 'N/A'}</td>
                  <td>${formatDate(order.createdAt)}</td>
                  <td>${order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : '—'}</td>
                  <td><span class="status-badge status-${order.status}">${order.status}</span></td>
                  <td class="text-right">${formatCurrency(order.totalAmount)}</td>
                  <td>${order.paymentStatus || 'UNPAID'}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5" class="text-right"><strong>Total:</strong></td>
                <td class="text-right"><strong>${formatCurrency(orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0))}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
          
          <div class="footer">
            <p>Total Orders: ${orders.length} | This is a computer-generated document. Valid without signature.</p>
            <p>For any queries, please contact procurement@fusionwater.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const frameDoc = printFrame.contentWindow.document;
    frameDoc.open();
    frameDoc.write(printContent);
    frameDoc.close();
    
    printFrame.contentWindow.focus();
    printFrame.contentWindow.print();
    
    // Remove iframe after printing
    setTimeout(() => {
      document.body.removeChild(printFrame);
    }, 1000);
    
    toast.success("Print dialog opened. You can now print or save as PDF.");
  };

  const statCards = [
    { 
      label: "Total POs", 
      value: stats.total, 
      description: "All purchase orders", 
      icon: Package, 
      color: "bg-blue-500" 
    },
    { 
      label: "Pending Approval", 
      value: stats.pendingApproval, 
      description: "Awaiting Admin approval", 
      icon: Clock, 
      color: "bg-orange-500" 
    },
    { 
      label: "Approved", 
      value: stats.approved, 
      description: "Approved by Admin", 
      icon: CheckCircle, 
      color: "bg-green-500" 
    },
    { 
      label: "Received", 
      value: stats.received, 
      description: "Fully received", 
      icon: Truck, 
      color: "bg-emerald-500" 
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader 
        title="Purchase Orders" 
        description="Manage procurement from suppliers"
        actionLabel="Create PO"
        actionIcon={Plus}
        onAction={() => navigate("/manager/purchase-orders/new")}
      >
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handlePrintPOs}>
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{stat.description}</p>
                </div>
                <div className={`p-2 rounded-xl ${stat.color}`}>
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search purchase orders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="UNPAID">Unpaid</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              Date Range
            </Button>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-500">
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {showDatePicker && (
            <div className="flex gap-3 mt-3 pt-3 border-t">
              <div>
                <Label className="text-xs">From Date</Label>
                <Input 
                  type="date" 
                  value={dateRange.start} 
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-36 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">To Date</Label>
                <Input 
                  type="date" 
                  value={dateRange.end} 
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-36 mt-1"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center"><LoadingSpinner /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>PO NUMBER</TableHead>
                    <TableHead>SUPPLIER NAME</TableHead>
                    <TableHead>DATE CREATED</TableHead>
                    <TableHead>EXPECTED DELIVERY</TableHead>
                    <TableHead>STATUS</TableHead>
                    <TableHead className="text-right">TOTAL AMOUNT</TableHead>
                    <TableHead>PAYMENT STATUS</TableHead>
                    <TableHead className="text-right">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                        <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        No purchase orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((order) => (
                      <TableRow 
                        key={order.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/manager/purchase-orders/${order.id}`)}
                      >
                        <TableCell className="font-mono font-medium text-sm">
                          {order.orderNumber}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">{order.supplier?.name}</p>
                            <p className="text-xs text-gray-400">{order.supplier?.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(order.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {order.expectedDeliveryDate ? (
                            <span className={new Date(order.expectedDeliveryDate) < new Date() ? "text-red-500" : "text-gray-600"}>
                              {formatDate(order.expectedDeliveryDate)}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(order.status)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(order.totalAmount)}
                        </TableCell>
                        <TableCell>
                          {getPaymentBadge(order.paymentStatus)}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0"
                              onClick={() => navigate(`/manager/purchase-orders/${order.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} purchase orders
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })} 
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <span className="px-3 py-1 text-sm bg-gray-100 rounded-md">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })} 
                  disabled={pagination.page === pagination.pages}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}