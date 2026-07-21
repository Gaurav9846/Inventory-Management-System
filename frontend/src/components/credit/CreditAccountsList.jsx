// src/components/credit/CreditAccountsList.jsx

import { useState, useEffect } from "react";
import { creditApi } from "@/api/index.js";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import {
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Clock,
  CheckCircle,
  AlertCircle,
  Phone,
  User,
  Banknote,
  Smartphone,
  Landmark,
  Loader2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/utils/helpers.js";
import { CustomerLedger } from "./CustomerLedger.jsx";
import NepaliRupeeIcon from "@/components/ui/NepaliRupeeIcon.jsx";

// ==================== STATUS CONFIGURATION ====================

const STATUS_COLORS = {
  PAID: "bg-green-100 text-green-800 border-green-200",
  PARTIAL: "bg-yellow-100 text-yellow-800 border-yellow-200",
  OVERDUE: "bg-red-100 text-red-800 border-red-200",
  PENDING: "bg-gray-100 text-gray-800 border-gray-200",
};

const STATUS_ICONS = {
  PAID: CheckCircle,
  PARTIAL: Clock,
  OVERDUE: AlertCircle,
  PENDING: Clock,
};

const STATUS_LABELS = {
  PAID: "Fully Paid",
  PARTIAL: "Partial",
  OVERDUE: "Overdue",
  PENDING: "Pending",
};

// ==================== CREDIT ACCOUNTS LIST ====================

export function CreditAccountsList() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    pages: 1,
    limit: 10,
  });

  // Ledger Modal State
  const [showLedger, setShowLedger] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState("");

  // Payment Dialog State
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "CASH",
    paymentPlatform: "",
    platformTransactionId: "",
    paymentDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // ==================== FETCH ACCOUNTS ====================

  useEffect(() => {
    fetchAccounts();
  }, [search, statusFilter, pagination.page]);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(search && { search }),
        ...(statusFilter !== "all" && { status: statusFilter }),
      };
      const response = await creditApi.getAccounts(params);
      setAccounts(response.data.data || []);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
      toast.error("Failed to load credit accounts");
    } finally {
      setLoading(false);
    }
  };

  // ==================== GET STATUS BADGE ====================

  const getStatusBadge = (status) => {
    const color = STATUS_COLORS[status] || "bg-gray-100 text-gray-800";
    const Icon = STATUS_ICONS[status] || Clock;
    const label = STATUS_LABELS[status] || status;
    return (
      <Badge className={`${color} flex items-center gap-1 px-3 py-1`}>
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  // ==================== GET PAYMENT METHOD ICON ====================

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case "CASH":
        return <Banknote className="h-3 w-3" />;
      case "BANK_TRANSFER":
        return <Landmark className="h-3 w-3" />;
      case "ONLINE":
        return <Smartphone className="h-3 w-3" />;
      default:
        return <Wallet className="h-3 w-3" />;
    }
  };

  // ==================== OPEN LEDGER ====================

  const openLedger = (customerId, customerName) => {
    setSelectedCustomer(customerId);
    setSelectedCustomerName(customerName);
    setShowLedger(true);
  };

  // ==================== OPEN PAYMENT DIALOG ====================

  const openPaymentDialog = (account) => {
    setSelectedAccount(account);
    setPaymentForm({
      amount: "",
      paymentMethod: "CASH",
      paymentPlatform: "",
      platformTransactionId: "",
      paymentDate: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setShowPaymentDialog(true);
  };

  // ==================== RECORD PAYMENT ====================

  const handleRecordPayment = async () => {
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const amount = parseFloat(paymentForm.amount);
    if (amount > selectedAccount.remainingBalance) {
      toast.error(
        `Amount cannot exceed remaining balance of ${formatCurrency(
          selectedAccount.remainingBalance
        )}`
      );
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
        customerId: selectedAccount.customerId,
        amount: amount,
        paymentMethod: paymentForm.paymentMethod,
        paymentDate: paymentForm.paymentDate,
        notes: paymentForm.notes || `Payment for ${selectedAccount.customerName}`,
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
      fetchAccounts();
    } catch (error) {
      console.error("Payment error:", error);
      toast.error(error.response?.data?.message || "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== FILTERS ====================

  const statusFilters = [
    { value: "all", label: "All" },
    { value: "PENDING", label: "Pending" },
    { value: "PARTIAL", label: "Partial" },
    { value: "OVERDUE", label: "Overdue" },
    { value: "PAID", label: "Paid" },
  ];

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPagination({ ...pagination, page: 1 });
  };

  const hasFilters = search || statusFilter !== "all";

  // ==================== RENDER ====================

  if (loading && accounts.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-500">Loading credit accounts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Credit Accounts</h1>
        <p className="text-gray-600 mt-1">
          Manage customer credit and installment payments
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by customer name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {statusFilters.map((filter) => (
            <Button
              key={filter.value}
              variant={statusFilter === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setStatusFilter(filter.value);
                setPagination({ ...pagination, page: 1 });
              }}
            >
              {filter.label}
            </Button>
          ))}
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-500">
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Accounts Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[200px]">Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Total Credit</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Installments</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-gray-500">
                      <Wallet className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No credit accounts found</p>
                      {hasFilters && (
                        <Button variant="link" onClick={clearFilters} className="mt-2">
                          Clear filters
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map((account) => (
                    <TableRow key={account.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {account.customerName}
                            </p>
                            {account.email && (
                              <p className="text-xs text-gray-400">{account.email}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {account.phone}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-blue-600">
                        {formatCurrency(account.totalCredit)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(account.paidAmount)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        {formatCurrency(account.remainingBalance)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(account.dueDate)}
                        {new Date(account.dueDate) < new Date() &&
                          account.remainingBalance > 0 && (
                            <span className="ml-2 text-xs text-red-500">(Overdue)</span>
                          )}
                      </TableCell>
                      <TableCell>{getStatusBadge(account.status)}</TableCell>
                      <TableCell className="text-center">
                        <div>
                          <span className="font-medium">
                            {account.paymentSummary?.totalInstallments || 0}
                          </span>
                          {account.paymentSummary?.lastPaymentDate && (
                            <div className="text-xs text-gray-400">
                              Last: {formatDate(account.paymentSummary.lastPaymentDate)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              openLedger(account.customerId, account.customerName)
                            }
                            className="gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            Ledger
                          </Button>
                          {account.remainingBalance > 0 && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 gap-1"
                              onClick={() => openPaymentDialog(account)}
                            >
                              <NepaliRupeeIcon className="h-4 w-4" />
                              Pay
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} accounts
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
                <span className="px-3 py-1 text-sm bg-gray-100 rounded-md">
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
        </CardContent>
      </Card>

      {/* ==================== LEDGER MODAL ==================== */}
      {showLedger && selectedCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl max-h-[95vh] overflow-y-auto">
              <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Credit Ledger - {selectedCustomerName}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Complete transaction history and outstanding balance
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowLedger(false);
                    setSelectedCustomer(null);
                    setSelectedCustomerName("");
                  }}
                >
                  ✕ Close
                </Button>
              </div>
              <div className="p-6">
                <CustomerLedger
                  customerId={selectedCustomer}
                  onClose={() => {
                    setShowLedger(false);
                    setSelectedCustomer(null);
                    setSelectedCustomerName("");
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== PAYMENT DIALOG ==================== */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-blue-600" />
              Record Credit Payment
            </DialogTitle>
          </DialogHeader>

          {selectedAccount && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-semibold">{selectedAccount.customerName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Outstanding Balance:</span>
                  <span className="font-bold text-red-600">
                    {formatCurrency(selectedAccount.remainingBalance)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Credit:</span>
                  <span>{formatCurrency(selectedAccount.totalCredit)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Installment #:</span>
                  <span className="font-medium">
                    {(selectedAccount.paymentSummary?.totalInstallments || 0) + 1}
                  </span>
                </div>
              </div>

              <div>
                <Label>Payment Amount *</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    ₹
                  </span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={paymentForm.amount}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, amount: e.target.value })
                    }
                    className="pl-8"
                    max={selectedAccount.remainingBalance}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Max: {formatCurrency(selectedAccount.remainingBalance)}
                </p>
              </div>

              <div>
                <Label>Payment Method *</Label>
                <Select
                  value={paymentForm.paymentMethod}
                  onValueChange={(v) => {
                    setPaymentForm({
                      ...paymentForm,
                      paymentMethod: v,
                      paymentPlatform:
                        v === "ONLINE" ? paymentForm.paymentPlatform : "",
                      platformTransactionId:
                        v === "ONLINE" ? paymentForm.platformTransactionId : "",
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
                      onValueChange={(v) =>
                        setPaymentForm({ ...paymentForm, paymentPlatform: v })
                      }
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
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          platformTransactionId: e.target.value,
                        })
                      }
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
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, paymentDate: e.target.value })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  placeholder={`e.g., Installment #${
                    (selectedAccount.paymentSummary?.totalInstallments || 0) + 1
                  }`}
                  value={paymentForm.notes}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, notes: e.target.value })
                  }
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {submitting ? "Processing..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}