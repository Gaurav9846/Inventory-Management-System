// src/pages/staff/StaffStockAdjustment.jsx
import { useEffect, useState } from "react";
import { productsApi, rawMaterialsApi, stockAdjustmentApi } from "@/api/index.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.jsx";
import { 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  FileText,
  Droplet,
  Box,
  Send
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/utils/helpers.js";

// Predefined adjustment reasons
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

// Item Types
const ITEM_TYPES = [
  { value: "RAW_MATERIAL", label: "Raw Material", icon: Droplet, color: "bg-purple-100 text-purple-800" },
  { value: "PRODUCT", label: "Finished Product", icon: Box, color: "bg-blue-100 text-blue-800" }
];

export default function StaffStockAdjustment() {
  const [products, setProducts] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeTab, setActiveTab] = useState("new");
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1, limit: 10 });
  
  const [formData, setFormData] = useState({
    itemType: "", // "RAW_MATERIAL" or "PRODUCT"
    itemId: "",
    requestedQuantity: "",
    reason: "",
  });

  // Filtered items based on selected type
  const filteredItems = formData.itemType === "RAW_MATERIAL" 
    ? rawMaterials 
    : formData.itemType === "PRODUCT" 
      ? products 
      : [];

  useEffect(() => {
    fetchAllItems();
    fetchMyRequests();
  }, [pagination.page]);

  const fetchAllItems = async () => {
    try {
      const [productsRes, rawMaterialsRes] = await Promise.all([
        productsApi.getAll({ limit: 500 }),
        rawMaterialsApi.getAll({ limit: 500 })
      ]);
      
      setProducts(productsRes.data || []);
      setRawMaterials(rawMaterialsRes.data?.data || rawMaterialsRes.data || []);
    } catch (error) {
      console.error("Failed to load items:", error);
      toast.error("Failed to load products");
    }
  };

  const fetchMyRequests = async () => {
    setLoading(true);
    try {
      const response = await stockAdjustmentApi.getMyRequests({ 
        page: pagination.page, 
        limit: pagination.limit 
      });
      setMyRequests(response.data.data || []);
      if (response.data.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch requests:", error);
      toast.error("Failed to load your requests");
    } finally {
      setLoading(false);
    }
  };

  const handleItemTypeChange = (itemType) => {
    setFormData({ 
      ...formData, 
      itemType, 
      itemId: "",  // Reset item selection when type changes
      requestedQuantity: "",
      reason: ""
    });
    setSelectedItem(null);
  };

  const handleItemSelect = (itemId) => {
    const item = filteredItems.find(i => i.id === itemId);
    setSelectedItem(item);
    setFormData({ ...formData, itemId });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.itemType) {
      toast.error("Please select item type (Raw Material or Finished Product)");
      return;
    }
    if (!formData.itemId) {
      toast.error("Please select an item");
      return;
    }
    if (!formData.requestedQuantity || formData.requestedQuantity === 0) {
      toast.error("Please enter quantity");
      return;
    }
    if (!formData.reason) {
      toast.error("Please select a reason");
      return;
    }

    setSubmitting(true);
    try {
      await stockAdjustmentApi.createRequest({
        productId: formData.itemId,
        adjustmentType: "CORRECTION", // Default type, not used in UI
        requestedQuantity: parseInt(formData.requestedQuantity),
        reason: formData.reason,
      });
      
      toast.success("Stock adjustment request submitted successfully");
      
      setFormData({
        itemType: "",
        itemId: "",
        requestedQuantity: "",
        reason: "",
      });
      setSelectedItem(null);
      fetchMyRequests();
      setActiveTab("history");
      
    } catch (error) {
      console.error("Submission error:", error);
      toast.error(error.response?.data?.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      PENDING: { label: "Pending", className: "bg-yellow-100 text-yellow-800", icon: Clock },
      APPROVED: { label: "Approved", className: "bg-green-100 text-green-800", icon: CheckCircle },
      REJECTED: { label: "Rejected", className: "bg-red-100 text-red-800", icon: XCircle },
    };
    const item = config[status] || { label: status, className: "bg-gray-100", icon: FileText };
    const Icon = item.icon;
    return (
      <Badge className={`${item.className} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {item.label}
      </Badge>
    );
  };

  const getItemCategoryBadge = (itemType) => {
    if (itemType === "RAW_MATERIAL") {
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

  const filteredRequests = myRequests.filter(req =>
    req.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.requestNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate new stock preview
  const newStockPreview = selectedItem && formData.requestedQuantity
    ? selectedItem.currentStock + (parseInt(formData.requestedQuantity) || 0)
    : selectedItem?.currentStock || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Stock Adjustment Requests</h1>
        <p className="text-gray-600 mt-1">Request stock adjustments for damaged, expired, or correction</p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800">How to submit a request:</p>
          <p className="text-sm text-blue-700 mt-1">
            First select if the item is a <strong>Raw Material</strong> or <strong>Finished Product</strong>, 
            then choose the specific item, enter quantity (negative for reduction, positive for addition), 
            and select a reason.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="new" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Request
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            My Requests
          </TabsTrigger>
        </TabsList>

        {/* New Request Tab */}
        <TabsContent value="new" className="mt-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left - Item Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  Select Item
                </CardTitle>
                <p className="text-sm text-gray-500">Choose item type and then the specific item</p>
              </CardHeader>
              <CardContent>
                <form className="space-y-5">
                  {/* Step 1: Item Type Selection */}
                  <div>
                    <Label className="text-base font-semibold">Step 1: Select Item Type *</Label>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {ITEM_TYPES.map((type) => {
                        const Icon = type.icon;
                        const isSelected = formData.itemType === type.value;
                        return (
                          <div
                            key={type.value}
                            onClick={() => handleItemTypeChange(type.value)}
                            className={`cursor-pointer rounded-lg border-2 p-4 text-center transition-all ${
                              isSelected
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className={`flex items-center justify-center w-10 h-10 mx-auto rounded-full ${type.color} mb-2`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <p className={`font-medium ${isSelected ? "text-blue-700" : "text-gray-700"}`}>
                              {type.label}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 2: Specific Item Selection */}
                  {formData.itemType && (
                    <div>
                      <Label className="text-base font-semibold">Step 2: Select Specific Item *</Label>
                      <select
                        value={formData.itemId}
                        onChange={(e) => handleItemSelect(e.target.value)}
                        className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select {formData.itemType === "RAW_MATERIAL" ? "Raw Material" : "Finished Product"}...</option>
                        {filteredItems.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name} - Stock: {item.currentStock} {item.unit}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Item Details */}
                  {selectedItem && (
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2 mt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Item Type</span>
                        <span>{getItemCategoryBadge(formData.itemType)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Current Stock</span>
                        <span className="text-lg font-bold text-gray-900">
                          {selectedItem.currentStock} {selectedItem.unit}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Reorder Level</span>
                        <span className="text-sm">{selectedItem.reorderLevel} {selectedItem.unit}</span>
                      </div>
                      {selectedItem.currentStock <= selectedItem.reorderLevel && (
                        <div className="mt-2 p-2 bg-yellow-50 rounded-lg flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span className="text-xs text-yellow-700">Low stock alert! Reorder level is {selectedItem.reorderLevel}</span>
                        </div>
                      )}
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* Right - Adjustment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Adjustment Details
                </CardTitle>
                <p className="text-sm text-gray-500">Provide details about the adjustment needed</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <Label>Quantity Change *</Label>
                    <div className="relative mt-1.5">
                      <Input
                        type="number"
                        placeholder="Enter quantity (negative for reduction, positive for addition)"
                        value={formData.requestedQuantity}
                        onChange={(e) => setFormData({ ...formData, requestedQuantity: e.target.value })}
                        className="pr-24"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        {selectedItem?.unit || "units"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      <span className="text-red-600">Negative value</span> (e.g., -5) for stock decrease (damage/expired)<br />
                      <span className="text-green-600">Positive value</span> (e.g., +5) for stock increase (correction/return)
                    </p>
                    {selectedItem && formData.requestedQuantity && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Stock Change Preview:</span>
                          <div className="text-right">
                            <span className="text-sm text-gray-500">
                              {selectedItem.currentStock} → 
                              <strong className={`ml-1 ${newStockPreview < 0 ? "text-red-600" : "text-green-600"}`}>
                                {newStockPreview}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Reason for Adjustment *</Label>
                    <select
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select a reason...</option>
                      {ADJUSTMENT_REASONS.map(reason => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={submitting || !formData.itemType || !formData.itemId || !formData.reason}
                    className="w-full bg-blue-600 hover:bg-blue-700 mt-4 py-2.5"
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Submitting...
                      </div>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Adjustment Request
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* My Requests Tab */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <CardTitle className="text-lg">My Adjustment Requests</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by product..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center py-12 text-gray-500">Loading your requests...</div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No adjustment requests found</p>
                  <Button 
                    variant="link" 
                    onClick={() => setActiveTab("new")}
                    className="mt-2"
                  >
                    Create your first request →
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request #</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Response</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-mono font-medium text-gray-900">
                            {req.requestNumber}
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-900">{req.product?.name}</p>
                              <p className="text-xs text-gray-400">Stock: {req.currentStock} → {req.newStock}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {getItemCategoryBadge(req.product?.itemType)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={req.requestedQuantity < 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                              {req.requestedQuantity > 0 ? `+${req.requestedQuantity}` : req.requestedQuantity}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm max-w-xs">
                            <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                              {req.reason}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(req.status)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {formatDate(req.createdAt)}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {req.status === "REJECTED" && (
                              <div className="text-red-600 text-xs" title={req.rejectionReason}>
                                {req.rejectionReason?.length > 40 
                                  ? req.rejectionReason.substring(0, 40) + "..." 
                                  : req.rejectionReason}
                              </div>
                            )}
                            {req.status === "APPROVED" && (
                              <div className="text-green-600 text-xs">
                                Approved by {req.approvedBy?.name}
                              </div>
                            )}
                            {req.status === "PENDING" && (
                              <div className="text-yellow-600 text-xs">
                                Awaiting manager approval
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-gray-500">
                    Showing {filteredRequests.length} of {pagination.total} requests
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                      disabled={pagination.page === 1}
                    >
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
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}