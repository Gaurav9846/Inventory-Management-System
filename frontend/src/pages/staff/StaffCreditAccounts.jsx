// src/pages/staff/CreditAccounts.jsx
import { useEffect, useState } from "react";
import { creditApi } from "@/api/index.js";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.jsx";
import { 
  Search, 
  Wallet, 
  CreditCard, 
  Calendar, 
  TrendingUp,
  Banknote,
  Landmark,
  Phone,
  User,
  DollarSign,
  Receipt,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/utils/helpers.js";

export default function CreditAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("accounts");
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "CASH",
    paymentDate: new Date().toISOString().split("T")[0],
    notes: "",
    transactionId: "",
  });

  useEffect(() => {
    fetchCreditData();
  }, []);

  const fetchCreditData = async () => {
    setLoading(true);
    try {
      const [accountsRes, transactionsRes, summaryRes] = await Promise.all([
        creditApi.getAccounts(),
        creditApi.getTransactions({ page: 1, limit: 50 }),
        creditApi.getSummary(),
      ]);
      setAccounts(accountsRes.data);
      setTransactions(transactionsRes.data.data || []);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error("Error fetching credit data:", error);
      toast.error("Failed to load credit data");
    } finally {
      setLoading(false);
    }
  };

  const openPaymentDialog = (account) => {
    setSelectedAccount(account);
    setPaymentForm({
      amount: "",
      paymentMethod: "CASH",
      paymentDate: new Date().toISOString().split("T")[0],
      notes: "",
      transactionId: "",
    });
    setPaymentDialogOpen(true);
  };

  const recordPayment = async () => {
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const amount = parseFloat(paymentForm.amount);
    if (amount > selectedAccount.remainingBalance) {
      toast.error(`Amount cannot exceed remaining balance of ${formatCurrency(selectedAccount.remainingBalance)}`);
      return;
    }

    setSubmitting(true);
    try {
      await creditApi.recordPayment({
        creditAccountId: selectedAccount.id,
        amount: amount,
        paymentMethod: paymentForm.paymentMethod,
        paymentDate: paymentForm.paymentDate,
        notes: paymentForm.notes,
        transactionId: paymentForm.transactionId || undefined,
      });
      
      toast.success(`Payment of ${formatCurrency(amount)} recorded successfully`);
      setPaymentDialogOpen(false);
      fetchCreditData();
      
    } catch (error) {
      console.error("Payment error:", error);
      toast.error(error.response?.data?.message || "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      PAID: "bg-green-100 text-green-800",
      PARTIAL: "bg-yellow-100 text-yellow-800",
      OVERDUE: "bg-red-100 text-red-800",
      PENDING: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getPaymentMethodIcon = (method) => {
    switch(method) {
      case "CASH": return <Banknote className="h-3 w-3" />;
      case "BANK_TRANSFER": return <Landmark className="h-3 w-3" />;
      default: return <CreditCard className="h-3 w-3" />;
    }
  };

  const filteredAccounts = accounts.filter(account => 
    account.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.phone?.includes(searchTerm)
  );

  if (loading) {
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
        <p className="text-gray-600 mt-1">Track outstanding credit and payment activity</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm text-gray-500">Total Outstanding</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalRemaining)}</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm text-gray-500">Total Paid</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalPaid)}</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm text-gray-500">Active Accounts</p>
            <p className="text-2xl font-bold text-blue-600">{summary.activeCreditAccounts || 0}</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm text-gray-500">Overdue Accounts</p>
            <p className="text-2xl font-bold text-red-600">{summary.overdueAccounts || 0}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("accounts")}
            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === "accounts"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Wallet className="h-4 w-4" />
            Credit Accounts
          </button>
          <button
            onClick={() => setActiveTab("transactions")}
            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === "transactions"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Receipt className="h-4 w-4" />
            Payment Transactions
          </button>
        </nav>
      </div>

      {/* Credit Accounts Tab */}
      {activeTab === "accounts" && (
        <>
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by customer name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Accounts Table */}
          <div className="rounded-lg bg-white shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Credit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      No credit accounts found
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((account) => (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{account.customerName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {account.phone}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(account.totalCredit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {formatCurrency(account.paidAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                        {formatCurrency(account.remainingBalance)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(account.dueDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getStatusColor(account.status)}>
                          {account.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {account.remainingBalance > 0 && (
                          <Button
                            size="sm"
                            onClick={() => openPaymentDialog(account)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Record Payment
                          </Button>
                        )}
                        {account.remainingBalance === 0 && (
                          <Badge className="bg-green-100 text-green-800">Fully Paid</Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Payment Transactions Tab */}
      {activeTab === "transactions" && (
        <div className="rounded-lg bg-white shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recorded By</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No payment transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {tx.transactionId?.slice(0, 12)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tx.customer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1 w-fit">
                        {getPaymentMethodIcon(tx.paymentMethod)}
                        {tx.paymentMethod}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(tx.paymentDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {tx.notes || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tx.recordedBy}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Credit Payment</DialogTitle>
          </DialogHeader>
          
          {selectedAccount && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Customer: <span className="font-semibold">{selectedAccount.customerName}</span></p>
                <p className="text-sm text-gray-600">Outstanding Balance: <span className="font-bold text-red-600">{formatCurrency(selectedAccount.remainingBalance)}</span></p>
                <p className="text-sm text-gray-600">Total Credit: {formatCurrency(selectedAccount.totalCredit)}</p>
              </div>

              <div>
                <Label>Payment Amount *</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="pl-8"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Max: {formatCurrency(selectedAccount.remainingBalance)}</p>
              </div>

              <div>
                <Label>Payment Method *</Label>
                <Select value={paymentForm.paymentMethod} onValueChange={(v) => setPaymentForm({ ...paymentForm, paymentMethod: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">💵 Cash</SelectItem>
                    <SelectItem value="BANK_TRANSFER">🏦 Bank Transfer</SelectItem>
                    <SelectItem value="ESEWA">📱 eSewa</SelectItem>
                    <SelectItem value="KHALTI">📱 Khalti</SelectItem>
                    <SelectItem value="CONNECTIPS">💳 ConnectIPS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                <Label>Transaction ID (Optional)</Label>
                <Input
                  placeholder="e.g., TXN123456"
                  value={paymentForm.transactionId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  placeholder="Additional notes..."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={recordPayment} disabled={submitting} className="bg-green-600">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {submitting ? "Processing..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}