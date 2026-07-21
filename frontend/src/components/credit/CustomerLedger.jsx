// src/components/credit/CustomerLedger.jsx

import { useState, useEffect, useRef } from "react";
import { creditApi } from "@/api/index.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/utils/helpers";
import { 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Receipt, 
  CreditCard,
  Wallet,
  Banknote,
  Smartphone,
  Landmark,
  Plus,
  Phone,
  Mail,
  MapPin,
  FileSpreadsheet,
  Printer,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  X,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const STATUS_COLORS = {
  PAID: "bg-green-100 text-green-800",
  PARTIAL: "bg-yellow-100 text-yellow-800",
  OVERDUE: "bg-red-100 text-red-800",
  PENDING: "bg-gray-100 text-gray-800",
};

const STATUS_ICONS = {
  PAID: CheckCircle,
  PARTIAL: Clock,
  OVERDUE: AlertCircle,
  PENDING: Clock,
};

export function CustomerLedger({ customerId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [ledgerData, setLedgerData] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [filteredLedger, setFilteredLedger] = useState([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  
  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [dateOrder, setDateOrder] = useState("desc");
  const [showFilters, setShowFilters] = useState(false);
  
  // Summary totals
  const [totals, setTotals] = useState({
    totalDebit: 0,
    totalCredit: 0,
    finalBalance: 0,
  });

  const printContentRef = useRef(null);
  const ledgerTableRef = useRef(null);

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "CASH",
    paymentPlatform: "",
    platformTransactionId: "",
    paymentDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    if (customerId) {
      fetchLedger();
    }
  }, [customerId]);

  useEffect(() => {
    filterAndSortLedger();
  }, [ledger, searchTerm, dateOrder]);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const response = await creditApi.getLedger(customerId);
      const data = response.data;
      
      setLedgerData(data);
      setLedger(data.ledger || []);
      
      calculateTotals(data.ledger || []);
    } catch (error) {
      console.error("Failed to fetch ledger:", error);
      toast.error("Failed to load customer ledger");
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = (data) => {
    let totalDebit = 0;
    let totalCredit = 0;
    let finalBalance = 0;

    if (data.length > 0) {
      const lastEntry = data[data.length - 1];
      finalBalance = lastEntry.balance || 0;
    }

    data.forEach(entry => {
      totalDebit += entry.debit || 0;
      totalCredit += entry.credit || 0;
    });

    setTotals({
      totalDebit,
      totalCredit,
      finalBalance,
    });
  };

  const filterAndSortLedger = () => {
    let filtered = [...ledger];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(entry => {
        const reference = entry.reference?.toLowerCase() || "";
        const description = entry.description?.toLowerCase() || "";
        const invoiceNumber = entry.invoiceNumber?.toLowerCase() || "";
        const salesOrderId = entry.salesOrderId?.toLowerCase() || "";
        const paymentId = entry.paymentId?.toLowerCase() || "";
        const creditPaymentNumber = entry.creditPaymentNumber?.toLowerCase() || "";
        
        return reference.includes(term) || 
               description.includes(term) || 
               invoiceNumber.includes(term) ||
               salesOrderId.includes(term) ||
               paymentId.includes(term) ||
               creditPaymentNumber.includes(term);
      });
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

    setFilteredLedger(filtered);
    
    let totalDebit = 0;
    let totalCredit = 0;
    let finalBalance = 0;

    if (filtered.length > 0) {
      const lastEntry = filtered[filtered.length - 1];
      finalBalance = lastEntry.balance || 0;
    }

    filtered.forEach(entry => {
      totalDebit += entry.debit || 0;
      totalCredit += entry.credit || 0;
    });

    setTotals({
      totalDebit,
      totalCredit,
      finalBalance,
    });
  };

  // ==================== PRINT FUNCTION ====================
  const handlePrint = () => {
    setIsPrinting(true);
    
    // Get the table content
    const tableElement = document.getElementById('ledger-print-table');
    if (!tableElement) {
      toast.error("Table not found");
      setIsPrinting(false);
      return;
    }

    // Get customer name for the print title
    const customerName = ledgerData?.customerName || 'Customer';

    // Build the print HTML
    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ledger - ${customerName}</title>
          <meta charset="utf-8" />
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', 'Arial', sans-serif;
              background: white;
              padding: 40px;
              color: #1a1a1a;
              line-height: 1.6;
            }
            .print-container {
              max-width: 1200px;
              margin: 0 auto;
            }
            .print-header {
              text-align: center;
              padding-bottom: 20px;
              border-bottom: 2px solid #10b981;
              margin-bottom: 20px;
            }
            .print-header h1 {
              font-size: 24px;
              font-weight: 700;
              color: #1a1a1a;
            }
            .print-header h2 {
              font-size: 18px;
              font-weight: 500;
              color: #4a4a4a;
              margin-top: 4px;
            }
            .print-header .subtitle {
              font-size: 13px;
              color: #6b7280;
              margin-top: 4px;
            }
            .print-summary {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 16px;
              margin-bottom: 20px;
            }
            .print-summary .summary-card {
              background: #f9fafb;
              padding: 12px 16px;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
              text-align: center;
            }
            .print-summary .summary-card .label {
              font-size: 11px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .print-summary .summary-card .value {
              font-size: 20px;
              font-weight: 700;
              margin-top: 2px;
            }
            .print-summary .summary-card .value.blue { color: #2563eb; }
            .print-summary .summary-card .value.green { color: #16a34a; }
            .print-summary .summary-card .value.red { color: #dc2626; }
            .print-summary .summary-card .value.gray { color: #1a1a1a; }
            
            .print-table-container {
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              overflow: hidden;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
            }
            table thead {
              background: #f3f4f6;
            }
            table th {
              padding: 10px 14px;
              text-align: left;
              font-weight: 600;
              color: #4b5563;
              border-bottom: 2px solid #d1d5db;
              text-transform: uppercase;
              font-size: 11px;
              letter-spacing: 0.5px;
            }
            table th.text-right {
              text-align: right;
            }
            table td {
              padding: 10px 14px;
              border-bottom: 1px solid #e5e7eb;
              vertical-align: top;
            }
            table td.text-right {
              text-align: right;
            }
            table tbody tr:nth-child(even) {
              background: #f9fafb;
            }
            table tbody tr:last-child td {
              border-bottom: none;
            }
            .total-row {
              background: #f3f4f6 !important;
              font-weight: 700;
              border-top: 2px solid #d1d5db;
            }
            .total-row td {
              padding: 12px 14px;
            }
            .total-row .balance {
              font-weight: 800;
            }
            .type-badge {
              display: inline-block;
              padding: 2px 10px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 500;
            }
            .type-sale {
              background: #dbeafe;
              color: #1e40af;
            }
            .type-payment {
              background: #d1fae5;
              color: #065f46;
            }
            .payment-method {
              font-size: 11px;
              color: #6b7280;
            }
            .recorded-by {
              font-size: 11px;
              color: #9ca3af;
            }
            .print-footer {
              margin-top: 20px;
              padding-top: 16px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 11px;
              color: #9ca3af;
            }
            .print-footer .date {
              font-weight: 500;
              color: #6b7280;
            }
            
            @media print {
              body { padding: 20px; }
              .no-print { display: none !important; }
              .print-summary .summary-card { break-inside: avoid; }
              table tbody tr { break-inside: avoid; }
              .total-row { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <!-- Header -->
            <div class="print-header">
              <h1>${ledgerData?.customerName || 'Customer'} - Credit Ledger</h1>
              <h2>Complete Transaction History</h2>
              <div class="subtitle">
                Generated on: ${new Date().toLocaleString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </div>
            </div>

            <!-- Summary Cards -->
            <div class="print-summary">
              <div class="summary-card">
                <div class="label">Total Sales</div>
                <div class="value blue">${formatCurrency(ledgerData?.totalSales || 0)}</div>
              </div>
              <div class="summary-card">
                <div class="label">Total Payments</div>
                <div class="value green">${formatCurrency(ledgerData?.totalPayments || 0)}</div>
              </div>
              <div class="summary-card">
                <div class="label">Outstanding Balance</div>
                <div class="value ${(ledgerData?.outstandingBalance || 0) > 0 ? 'red' : 'gray'}">
                  ${formatCurrency(ledgerData?.outstandingBalance || 0)}
                </div>
              </div>
            </div>

            <!-- Customer Info -->
            <div style="margin-bottom: 16px; font-size: 13px; color: #4b5563; display: flex; flex-wrap: wrap; gap: 8px 20px;">
              ${ledgerData?.customerPhone ? `<span>📞 ${ledgerData.customerPhone}</span>` : ''}
              ${ledgerData?.customerEmail ? `<span>✉️ ${ledgerData.customerEmail}</span>` : ''}
              ${ledgerData?.customerAddress ? `<span>📍 ${ledgerData.customerAddress}</span>` : ''}
              <span>📅 Since ${formatDate(ledgerData?.customerSince)}</span>
              <span>Status: ${ledgerData?.status || 'N/A'}</span>
              ${ledgerData?.dueDate ? `<span>Due Date: ${formatDate(ledgerData.dueDate)}</span>` : ''}
              <span>Installments: ${ledgerData?.totalInstallments || 0}</span>
              <span>Total Orders: ${ledgerData?.totalOrders || 0}</span>
            </div>

            <!-- Table -->
            <div class="print-table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Invoice / Reference</th>
                    <th class="text-right">Debit</th>
                    <th class="text-right">Credit</th>
                    <th class="text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredLedger.map((entry) => `
                    <tr>
                      <td>${formatDate(entry.date)}</td>
                      <td>
                        <span class="type-badge type-${entry.type === 'SALE' ? 'sale' : 'payment'}">
                          ${entry.type === 'SALE' ? 'Sale' : 'Payment'}
                        </span>
                      </td>
                      <td>
                        ${entry.invoiceNumber ? `<strong>Invoice #${entry.invoiceNumber}</strong><br>` : ''}
                        ${entry.reference || ''}
                        ${entry.products && entry.products !== 'N/A' ? `<br><span style="font-size: 11px; color: #6b7280;">${entry.products}</span>` : ''}
                        ${entry.paymentMethod ? `<br><span class="payment-method">${entry.paymentMethod}${entry.paymentPlatform ? ` (${entry.paymentPlatform})` : ''}</span>` : ''}
                        ${entry.recordedBy ? `<br><span class="recorded-by">By: ${entry.recordedBy}</span>` : ''}
                      </td>
                      <td class="text-right">${entry.debit > 0 ? formatCurrency(entry.debit) : '–'}</td>
                      <td class="text-right">${entry.credit > 0 ? formatCurrency(entry.credit) : '–'}</td>
                      <td class="text-right"><strong>${formatCurrency(entry.balance)}</strong></td>
                    </tr>
                  `).join('')}
                  <!-- Total Row -->
                  <tr class="total-row">
                    <td colspan="3" style="text-align: right; font-size: 14px;">TOTAL</td>
                    <td class="text-right" style="font-size: 14px; color: #2563eb;">${formatCurrency(totals.totalDebit)}</td>
                    <td class="text-right" style="font-size: 14px; color: #16a34a;">${formatCurrency(totals.totalCredit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Footer -->
            <div class="print-footer">
              <span class="date">${new Date().toLocaleString()}</span>
              <span style="margin: 0 8px;">•</span>
              Fusion IMS - Credit Ledger
            </div>
          </div>

          <script>
            // Auto-print when loaded
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

    // Open print window
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
      toast.error("Please allow popups to print");
      setIsPrinting(false);
      return;
    }

    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.focus();
    
    // Clean up
    setTimeout(() => {
      setIsPrinting(false);
    }, 1000);
  };

  const getStatusBadge = (status) => {
    const color = STATUS_COLORS[status] || "bg-gray-100 text-gray-800";
    const Icon = STATUS_ICONS[status] || Clock;
    return (
      <Badge className={`${color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getPaymentMethodIcon = (method) => {
    switch(method) {
      case "CASH": return <Banknote className="h-4 w-4" />;
      case "BANK_TRANSFER": return <Landmark className="h-4 w-4" />;
      case "ONLINE": return <Smartphone className="h-4 w-4" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  const exportCSV = () => {
    if (!filteredLedger.length) return;

    const exportData = filteredLedger.map(entry => ({
      Date: formatDate(entry.date),
      Type: entry.type,
      Description: entry.description,
      Reference: entry.reference,
      Invoice: entry.invoiceNumber || "",
      Debit: entry.debit || 0,
      Credit: entry.credit || 0,
      Balance: entry.balance || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ledger");
    XLSX.writeFile(wb, `ledger-${ledgerData?.customerName}-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Export successful");
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  const toggleDateOrder = () => {
    setDateOrder(dateOrder === "asc" ? "desc" : "asc");
  };

  const handleRecordPayment = async () => {
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const amount = parseFloat(paymentForm.amount);
    if (amount > ledgerData?.outstandingBalance) {
      toast.error(`Amount cannot exceed remaining balance of ${formatCurrency(ledgerData.outstandingBalance)}`);
      return;
    }

    if (paymentForm.paymentMethod === "ONLINE" && !paymentForm.paymentPlatform) {
      toast.error("Please select a payment platform for online payment");
      return;
    }

    if (paymentForm.paymentMethod === "ONLINE" && !paymentForm.platformTransactionId) {
      toast.error("Please enter the transaction ID for online payment");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerId: customerId,
        amount: amount,
        paymentMethod: paymentForm.paymentMethod,
        paymentDate: paymentForm.paymentDate,
        notes: paymentForm.notes || `Installment #${ledgerData?.totalInstallments + 1}`,
      };

      if (paymentForm.paymentMethod === "ONLINE") {
        payload.paymentPlatform = paymentForm.paymentPlatform;
        payload.platformTransactionId = paymentForm.platformTransactionId;
      }

      await creditApi.recordPayment(payload);
      
      toast.success(`Payment of ${formatCurrency(amount)} recorded successfully`);
      setShowPaymentDialog(false);
      setPaymentForm({
        amount: "",
        paymentMethod: "CASH",
        paymentPlatform: "",
        platformTransactionId: "",
        paymentDate: new Date().toISOString().split("T")[0],
        notes: "",
      });
      fetchLedger();
    } catch (error) {
      console.error("Payment error:", error);
      toast.error(error.response?.data?.message || "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-500">Loading ledger...</span>
      </div>
    );
  }

  if (!ledgerData) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Wallet className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>No credit account found for this customer</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="ledger-print">
      {/* Customer Info Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{ledgerData.customerName}</h2>
            <div className="flex flex-wrap gap-3 mt-2">
              {ledgerData.customerPhone && (
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {ledgerData.customerPhone}
                </span>
              )}
              {ledgerData.customerEmail && (
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {ledgerData.customerEmail}
                </span>
              )}
              {ledgerData.customerAddress && (
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {ledgerData.customerAddress}
                </span>
              )}
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Since {formatDate(ledgerData.customerSince)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {ledgerData.outstandingBalance > 0 && (
              <Button 
                onClick={() => setShowPaymentDialog(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            )}
            <Button variant="outline" onClick={exportCSV} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={handlePrint} className="gap-2" disabled={isPrinting}>
              <Printer className="h-4 w-4" />
              {isPrinting ? "Printing..." : "Print"}
            </Button>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>
        
        {/* Status and Summary */}
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Status:</span>
            {getStatusBadge(ledgerData.status)}
          </div>
          {ledgerData.dueDate && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Due Date:</span>
              <span className="text-sm font-medium">{formatDate(ledgerData.dueDate)}</span>
              {new Date(ledgerData.dueDate) < new Date() && ledgerData.outstandingBalance > 0 && (
                <Badge className="bg-red-100 text-red-800">OVERDUE</Badge>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Total Orders:</span>
            <span className="text-sm font-medium">{ledgerData.totalOrders}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Installments:</span>
            <span className="text-sm font-medium">{ledgerData.totalInstallments}</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Sales</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(ledgerData.totalSales)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Payments</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(ledgerData.totalPayments)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Outstanding Balance</p>
            <p className={`text-2xl font-bold ${ledgerData.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(ledgerData.outstandingBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by Invoice ID, Order ID, or Payment ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        
        <Button
          variant="outline"
          onClick={toggleDateOrder}
          className="gap-2"
        >
          <ArrowUpDown className="h-4 w-4" />
          {dateOrder === "asc" ? "Oldest First" : "Newest First"}
        </Button>

        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          {showFilters ? "Hide Filters" : "Show Filters"}
        </Button>

        {(searchTerm || dateOrder !== "desc") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setDateOrder("desc");
            }}
            className="text-red-500"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {(searchTerm || dateOrder !== "desc") && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-500">Active filters:</span>
          {searchTerm && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: {searchTerm}
              <X className="h-3 w-3 cursor-pointer hover:text-red-500" onClick={clearSearch} />
            </Badge>
          )}
          {dateOrder !== "desc" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Order: {dateOrder === "asc" ? "Oldest First" : "Newest First"}
              <X className="h-3 w-3 cursor-pointer hover:text-red-500" onClick={() => setDateOrder("desc")} />
            </Badge>
          )}
        </div>
      )}

      {/* Ledger Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Customer Ledger
          </CardTitle>
          <p className="text-sm text-gray-500">
            Complete transaction history and outstanding balance
            {filteredLedger.length !== ledger.length && (
              <span className="ml-2 text-blue-600">
                ({filteredLedger.length} of {ledger.length} entries)
              </span>
            )}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div id="ledger-print-table">
            {filteredLedger.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No transactions found matching your search
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">DATE</TableHead>
                      <TableHead className="font-semibold">TYPE</TableHead>
                      <TableHead className="font-semibold">INVOICE / REFERENCE</TableHead>
                      <TableHead className="font-semibold text-right">DEBIT</TableHead>
                      <TableHead className="font-semibold text-right">CREDIT</TableHead>
                      <TableHead className="font-semibold text-right">BALANCE</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLedger.map((entry, index) => (
                      <TableRow 
                        key={index} 
                        className={entry.type === "SALE" ? "bg-blue-50/30" : entry.type === "PAYMENT" ? "bg-green-50/30" : ""}
                      >
                        <TableCell className="text-sm font-medium whitespace-nowrap">
                          {formatDate(entry.date)}
                        </TableCell>
                        <TableCell>
                          {entry.type === "SALE" ? (
                            <Badge className="bg-blue-100 text-blue-800">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Sale
                            </Badge>
                          ) : entry.type === "PAYMENT" ? (
                            <Badge className="bg-green-100 text-green-800">
                              <TrendingDown className="h-3 w-3 mr-1" />
                              Payment
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">
                              {entry.type}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {entry.invoiceNumber ? (
                              <div>
                                <span className="font-semibold text-blue-600">Invoice #{entry.invoiceNumber}</span>
                                <div className="text-xs text-gray-400">{entry.reference}</div>
                              </div>
                            ) : (
                              entry.reference
                            )}
                            {entry.products && entry.products !== "N/A" && (
                              <div className="text-xs text-gray-400 mt-0.5">
                                {entry.products}
                              </div>
                            )}
                            {entry.paymentMethod && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                                {getPaymentMethodIcon(entry.paymentMethod)}
                                {entry.paymentMethod}
                                {entry.paymentPlatform && ` (${entry.paymentPlatform})`}
                              </div>
                            )}
                            {entry.recordedBy && (
                              <div className="text-xs text-gray-400">
                                By: {entry.recordedBy}
                              </div>
                            )}
                            {entry.paymentId && (
                              <div className="text-xs text-gray-400 font-mono">
                                Payment ID: {entry.paymentId.slice(0, 12)}...
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : "–"}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : "–"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(entry.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {/* TOTAL ROW */}
                    <TableRow className="bg-gray-100 font-bold border-t-2 border-gray-300">
                      <TableCell colSpan={3} className="text-right text-base">
                        TOTAL
                      </TableCell>
                      <TableCell className="text-right text-base text-blue-700">
                        {formatCurrency(totals.totalDebit)}
                      </TableCell>
                      <TableCell className="text-right text-base text-green-700">
                        {formatCurrency(totals.totalCredit)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          
          <div className="px-6 py-2 text-xs text-gray-400 border-t">
            {filteredLedger.length} entries • 
            {searchTerm && ` Filtered by: "${searchTerm}" • `}
            Sorted: {dateOrder === "asc" ? "Oldest First" : "Newest First"}
          </div>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-blue-600" />
              Record Credit Payment
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Customer:</span>
                <span className="font-semibold">{ledgerData.customerName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Outstanding Balance:</span>
                <span className="font-bold text-red-600">{formatCurrency(ledgerData.outstandingBalance)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Credit:</span>
                <span>{formatCurrency(ledgerData.totalSales)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Installment #:</span>
                <span className="font-medium">{ledgerData.totalInstallments + 1}</span>
              </div>
            </div>

            <div>
              <Label>Payment Amount *</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="pl-8"
                  max={ledgerData.outstandingBalance}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Max: {formatCurrency(ledgerData.outstandingBalance)}</p>
            </div>

            <div>
              <Label>Payment Method *</Label>
              <Select 
                value={paymentForm.paymentMethod} 
                onValueChange={(v) => {
                  setPaymentForm({ 
                    ...paymentForm, 
                    paymentMethod: v,
                    paymentPlatform: v === "ONLINE" ? paymentForm.paymentPlatform : "",
                    platformTransactionId: v === "ONLINE" ? paymentForm.platformTransactionId : "",
                  });
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">💵 Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">🏦 Bank Transfer</SelectItem>
                  <SelectItem value="ONLINE">📱 Online Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentForm.paymentMethod === "ONLINE" && (
              <>
                <div>
                  <Label>Payment Platform *</Label>
                  <Select 
                    value={paymentForm.paymentPlatform || ""} 
                    onValueChange={(v) => setPaymentForm({ ...paymentForm, paymentPlatform: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KHALTI">📱 Khalti</SelectItem>
                      <SelectItem value="ESEWA">📱 eSewa</SelectItem>
                      <SelectItem value="FONEPAY">📱 Fonepay</SelectItem>
                      <SelectItem value="OTHER">🌐 Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Platform Transaction ID *</Label>
                  <Input
                    placeholder="Enter transaction ID from platform"
                    value={paymentForm.platformTransactionId}
                    onChange={(e) => setPaymentForm({ ...paymentForm, platformTransactionId: e.target.value })}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The transaction ID provided by the payment platform
                  </p>
                </div>
              </>
            )}

            <div>
              <Label>Payment Date *</Label>
              <Input
                type="date"
                value={paymentForm.paymentDate}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder={`e.g., Installment #${ledgerData.totalInstallments + 1}`}
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                rows={2}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRecordPayment} 
              disabled={submitting} 
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {submitting ? "Processing..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}