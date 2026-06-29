// src/pages/manager/ManagerStockAdjustments.jsx
import { useState, useEffect } from 'react';
import { stockAdjustmentApi } from '@/api/index.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  CheckCircle, XCircle, Clock, ThumbsUp, ThumbsDown,
  RefreshCw, AlertTriangle, Package, Search, Filter,
  Droplet, Box, TrendingUp, TrendingDown
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/utils/helpers';

// Predefined reasons for adjustment (for display)
const ADJUSTMENT_REASONS = [
  "Damaged Inventory",
  "Production Wastage",
  "Quality Control Rejection",
  "Physical Count Mismatch",
  "Stock Audit Correction",
  "Wrong Stock Entry",
  "Supplier Quantity Shortage",
  "Supplier Quantity Excess",
  "Returned Goods",
  "Expired Products",
  "Theft/Shrinkage",
  "Lost Inventory",
  "Other"
];

export default function ManagerStockAdjustments() {
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [historyRequests, setHistoryRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, totalRequests: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch pending requests
      const pendingRes = await stockAdjustmentApi.getPending();
      setPendingRequests(pendingRes.data?.data || pendingRes.data || []);
      
      // Fetch all requests for history (only approved and rejected)
      const allRes = await stockAdjustmentApi.getAll({ limit: 100 });
      const allData = allRes.data?.data || allRes.data || [];
      const historyData = allData.filter(req => req.status === 'APPROVED' || req.status === 'REJECTED');
      setHistoryRequests(historyData);
      
      // Fetch stats
      const statsRes = await stockAdjustmentApi.getStats();
      setStats(statsRes);
    } catch (error) {
      console.error('Error fetching adjustments:', error);
      toast.error(error.response?.data?.message || 'Failed to load adjustment requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    try {
      await stockAdjustmentApi.approve(selectedRequest.id);
      toast.success(`Request approved - Stock updated`);
      setApproveDialogOpen(false);
      setSelectedRequest(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      await stockAdjustmentApi.reject(selectedRequest.id, { rejectionReason });
      toast.success(`Request rejected`);
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject request');
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      PENDING: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
      APPROVED: { label: 'Approved', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-800', icon: XCircle },
    };
    const item = config[status] || { label: status, className: 'bg-gray-100', icon: AlertTriangle };
    const Icon = item.icon;
    return (
      <Badge className={`${item.className} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {item.label}
      </Badge>
    );
  };

  // Get item category badge (Raw Material or Finished Product)
  const getItemCategoryBadge = (itemType) => {
    if (itemType === 'RAW_MATERIAL') {
      return (
        <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1">
          <Droplet className="h-3 w-3" />
          Raw Material
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
          <Box className="h-3 w-3" />
          Finished Product
        </Badge>
      );
    }
  };

  // Format reason to show predefined reason from list
  const formatReason = (reason) => {
    const matchedReason = ADJUSTMENT_REASONS.find(r => 
      reason?.toLowerCase().includes(r.toLowerCase())
    );
    return matchedReason || reason || 'Other';
  };

  // Get stock change display with arrow
  const getStockChangeDisplay = (currentStock, newStock, unit) => {
    const isIncrease = newStock > currentStock;
    const isDecrease = newStock < currentStock;
    const changeAmount = Math.abs(newStock - currentStock);
    
    if (isIncrease) {
      return (
        <div className="flex items-center gap-1">
          <span className="text-gray-500">{currentStock}</span>
          <TrendingUp className="h-3 w-3 text-green-500" />
          <span className="text-gray-500">{newStock}</span>
          <span className="text-xs text-green-600 ml-1">(+{changeAmount}{unit})</span>
        </div>
      );
    } else if (isDecrease) {
      return (
        <div className="flex items-center gap-1">
          <span className="text-gray-500">{currentStock}</span>
          <TrendingDown className="h-3 w-3 text-red-500" />
          <span className="text-gray-500">{newStock}</span>
          <span className="text-xs text-red-600 ml-1">(-{changeAmount}{unit})</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1">
          <span className="text-gray-500">{currentStock}</span>
          <span className="text-gray-500">→</span>
          <span className="text-gray-500">{newStock}</span>
        </div>
      );
    }
  };

  // Get requested change display with stock preview
  const getRequestedChangeDisplay = (requestedQuantity, currentStock, unit, newStock) => {
    const isIncrease = requestedQuantity > 0;
    const absQuantity = Math.abs(requestedQuantity);
    
    return (
      <div>
        <div className="flex items-center gap-1">
          {isIncrease ? (
            <TrendingUp className="h-3 w-3 text-green-500" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-500" />
          )}
          <span className={`font-semibold ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
            {isIncrease ? `+${requestedQuantity}` : requestedQuantity} {unit}
          </span>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          Stock: {currentStock} → {newStock}
        </div>
      </div>
    );
  };

  const filteredPending = pendingRequests.filter(req =>
    req.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.requestNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredHistory = historyRequests.filter(req =>
    req.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.requestNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-gray-500">Loading adjustment requests...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Stock Adjustments</h1>
        <p className="text-gray-600 mt-1">Inventory {'>'} Stock Adjustments</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-yellow-700">{stats.pending || 0}</p>
            <p className="text-xs text-yellow-600">Pending Requests</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-700">{stats.approved || 0}</p>
            <p className="text-xs text-green-600">Approved</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 text-center">
            <XCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-700">{stats.rejected || 0}</p>
            <p className="text-xs text-red-600">Rejected</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <Package className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-700">{stats.totalRequests || 0}</p>
            <p className="text-xs text-blue-600">Total Requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by product name or request #..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs - Toggle between Pending and History */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-all duration-200 ${
              activeTab === 'pending'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-blue-500 hover:border-blue-300'
            }`}
          >
            <Clock className="h-4 w-4" />
            Pending Adjustment Requests
            {stats.pending > 0 && (
              <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                activeTab === 'pending'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {stats.pending}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-all duration-200 ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-blue-500 hover:border-blue-300'
            }`}
          >
            <Filter className="h-4 w-4" />
            Approved / Rejected History
          </button>
        </nav>
      </div>

      {/* Pending Requests Tab */}
      {activeTab === 'pending' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Requested Change</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Requested On</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPending.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                        No pending adjustment requests
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPending.map((req) => (
                      <TableRow key={req.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">{req.product?.name}</p>
                            <p className="text-xs text-gray-400">Request #{req.requestNumber}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {getStockChangeDisplay(req.currentStock, req.newStock, req.product?.unit || 'units')}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{getItemCategoryBadge(req.product?.itemType)}</TableCell>
                        <TableCell>
                          {getRequestedChangeDisplay(
                            req.requestedQuantity, 
                            req.currentStock, 
                            req.product?.unit || 'units',
                            req.newStock
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <span className="text-sm px-2 py-1 bg-gray-100 rounded-full" title={req.reason}>
                            {formatReason(req.reason)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{req.requestedBy?.name}</p>
                            <p className="text-xs text-gray-400">{req.requestedBy?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{formatDate(req.createdAt)}</TableCell>
                        <TableCell>{getStatusBadge(req.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 h-8"
                              onClick={() => {
                                setSelectedRequest(req);
                                setApproveDialogOpen(true);
                              }}
                            >
                              <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 px-3 py-1 h-8"
                              onClick={() => {
                                setSelectedRequest(req);
                                setRejectDialogOpen(true);
                              }}
                            >
                              <ThumbsDown className="h-3.5 w-3.5 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {filteredPending.length > 0 && (
              <div className="px-6 py-3 border-t text-sm text-gray-500">
                Showing {filteredPending.length} of {pendingRequests.length} requests
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Approved / Rejected History Tab */}
      {activeTab === 'history' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Approved/Rejected By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                        No approved or rejected requests found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHistory.map((req) => (
                      <TableRow key={req.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">{req.product?.name}</p>
                            <p className="text-xs text-gray-400">Request #{req.requestNumber}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {getStockChangeDisplay(req.currentStock, req.newStock, req.product?.unit || 'units')}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{getItemCategoryBadge(req.product?.itemType)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {req.requestedQuantity > 0 ? (
                              <TrendingUp className="h-3 w-3 text-green-500" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-500" />
                            )}
                            <span className={`font-semibold ${req.requestedQuantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {req.requestedQuantity > 0 ? `+${req.requestedQuantity}` : req.requestedQuantity} {req.product?.unit}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            Stock: {req.currentStock} → {req.newStock}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="text-sm px-2 py-1 bg-gray-100 rounded-full">
                              {formatReason(req.reason)}
                            </span>
                            {req.rejectionReason && (
                              <div className="text-xs text-red-500 mt-1">
                                Rejection: {req.rejectionReason}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{req.approvedBy?.name || '-'}</p>
                            {req.approvedBy?.email && (
                              <p className="text-xs text-gray-400">{req.approvedBy?.email}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(req.approvedAt || req.updatedAt)}
                        </TableCell>
                        <TableCell>{getStatusBadge(req.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {filteredHistory.length > 0 && (
              <div className="px-6 py-3 border-t text-sm text-gray-500">
                Showing {filteredHistory.length} of {historyRequests.length} records
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Adjustment Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <p className="text-sm font-medium text-yellow-800">⚠️ Warning</p>
                <p className="text-sm text-yellow-700">
                  This will update stock from <strong>{selectedRequest.currentStock}</strong> to <strong>{selectedRequest.newStock}</strong>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Item Details</p>
                  <p className="font-medium">{selectedRequest.product?.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getItemCategoryBadge(selectedRequest.product?.itemType)}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Stock Change: {selectedRequest.currentStock} → {selectedRequest.newStock}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Requested By</p>
                  <p className="text-sm font-medium">{selectedRequest.requestedBy?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Requested On</p>
                  <p className="text-sm">{formatDate(selectedRequest.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Requested Change</p>
                  <p className={`text-sm font-semibold ${selectedRequest.requestedQuantity < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {selectedRequest.requestedQuantity > 0 ? `+${selectedRequest.requestedQuantity}` : selectedRequest.requestedQuantity} {selectedRequest.product?.unit}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Current → New Stock</p>
                  <p className="text-sm font-semibold">
                    {selectedRequest.currentStock} → {selectedRequest.newStock}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Reason</p>
                  <p className="text-sm">{formatReason(selectedRequest.reason)}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
              <ThumbsUp className="h-4 w-4 mr-2" />
              Confirm Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Adjustment Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Item Details</p>
                  <p className="font-medium">{selectedRequest.product?.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getItemCategoryBadge(selectedRequest.product?.itemType)}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Requested Change: {selectedRequest.requestedQuantity > 0 ? `+${selectedRequest.requestedQuantity}` : selectedRequest.requestedQuantity} {selectedRequest.product?.unit}
                  </p>
                  <p className="text-xs text-gray-500">
                    Stock: {selectedRequest.currentStock} → {selectedRequest.newStock}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Requested By</p>
                  <p className="text-sm font-medium">{selectedRequest.requestedBy?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Requested Change</p>
                  <p className="text-sm">{selectedRequest.requestedQuantity}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Reason</p>
                  <p className="text-sm">{formatReason(selectedRequest.reason)}</p>
                </div>
              </div>
              <div>
                <Label>Rejection Reason *</Label>
                <Textarea
                  placeholder="Explain why this request is being rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReject} variant="destructive">
              <ThumbsDown className="h-4 w-4 mr-2" />
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}