// src/components/stock/StockDetailModal.jsx
import { useEffect, useState } from "react";
import { stockDetailApi } from "@/api/index.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Separator } from "@/components/ui/separator.jsx";
import { ScrollArea } from "@/components/ui/scroll-area.jsx";
import {
  Package,
  Box,
  Tag,
  DollarSign,
  Building2,
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  User,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime } from "@/utils/helpers.js";
import { Skeleton } from "@/components/ui/skeleton.jsx";

const StatusBadge = ({ currentStock, reorderLevel }) => {
  if (currentStock === 0) {
    return (
      <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        Out of Stock
      </Badge>
    );
  }
  if (currentStock <= reorderLevel) {
    return (
      <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Low Stock
      </Badge>
    );
  }
  return (
    <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
      <CheckCircle className="h-3 w-3" />
      In Stock
    </Badge>
  );
};

const ActivityItem = ({ activity }) => {
  const isIn = activity.type === "IN";
  const isOut = activity.type === "OUT";
  const isAdjustment = activity.type === "ADJUSTMENT";

  const getIcon = () => {
    if (isIn) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (isOut) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-blue-500" />;
  };

  const getLabel = () => {
    if (isIn) return "Stock In";
    if (isOut) return "Stock Out";
    return "Adjustment";
  };

  const getColor = () => {
    if (isIn) return "bg-green-50 border-green-200";
    if (isOut) return "bg-red-50 border-red-200";
    return "bg-blue-50 border-blue-200";
  };

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${getColor()}`}>
      <div className="flex items-center gap-3">
        {getIcon()}
        <div>
          <p className="text-sm font-medium">{getLabel()}</p>
          <p className="text-xs text-gray-500">
            {activity.note || "No note"} • {formatDateTime(activity.createdAt)}
          </p>
          {activity.user && (
            <p className="text-xs text-gray-400">By: {activity.user}</p>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-bold ${isIn ? "text-green-600" : isOut ? "text-red-600" : "text-blue-600"}`}>
          {isIn ? "+" : isOut ? "-" : "±"}{activity.quantity}
        </p>
      </div>
    </div>
  );
};

export function StockDetailModal({ open, onOpenChange, item }) {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (open && item) {
      fetchDetail();
    }
  }, [open, item]);

  const fetchDetail = async () => {
    if (!item) return;
    setLoading(true);
    try {
      let response;
      if (item.type === "raw") {
        response = await stockDetailApi.getRawMaterial(item.id);
      } else {
        response = await stockDetailApi.getProduct(item.id);
      }
      setDetail(response.data.data);
    } catch (error) {
      console.error("Failed to fetch detail:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  const isRawMaterial = item.type === "raw";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {isRawMaterial ? <Box className="h-5 w-5 text-purple-500" /> : <Package className="h-5 w-5 text-blue-500" />}
            {item.name}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : detail ? (
          <div className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">SKU</p>
                <p className="font-mono text-sm font-medium">{detail.sku || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Category</p>
                <p className="text-sm font-medium">{detail.category?.name || "Uncategorized"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Unit</p>
                <p className="text-sm font-medium">{detail.unit || "piece"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <StatusBadge currentStock={detail.currentStock} reorderLevel={detail.reorderLevel} />
              </div>
            </div>

            {/* Inventory Information */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600">Current Stock</p>
                <p className="text-xl font-bold text-blue-700">
                  {detail.currentStock.toLocaleString()}
                </p>
                <p className="text-xs text-blue-500">{detail.unit}s</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-xs text-yellow-600">Reorder Level</p>
                <p className="text-xl font-bold text-yellow-700">
                  {detail.reorderLevel.toLocaleString()}
                </p>
                <p className="text-xs text-yellow-500">{detail.unit}s</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-600">Total Stock Value</p>
                <p className="text-xl font-bold text-green-700">
                  {formatCurrency(detail.totalStockValue || 0)}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-xs text-purple-600">
                  {isRawMaterial ? "Unit Cost" : "Cost Price"}
                </p>
                <p className="text-xl font-bold text-purple-700">
                  {formatCurrency(detail.costPrice || 0)}
                </p>
                <p className="text-xs text-purple-500">per {detail.unit}</p>
              </div>
            </div>

            {/* Pricing Information (Products only) */}
            {!isRawMaterial && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <p className="text-xs text-indigo-600">Selling Price</p>
                  <p className="text-lg font-bold text-indigo-700">
                    {formatCurrency(detail.sellingPrice || 0)}
                  </p>
                  <p className="text-xs text-indigo-500">per {detail.unit}</p>
                </div>
                <div className="p-3 bg-teal-50 rounded-lg">
                  <p className="text-xs text-teal-600">Production Cost</p>
                  <p className="text-lg font-bold text-teal-700">
                    {formatCurrency(detail.productionCost || 0)}
                  </p>
                  <p className="text-xs text-teal-500">per {detail.unit}</p>
                </div>
              </div>
            )}

            {/* Supplier Information */}
            {detail.supplier && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4" />
                  Supplier Information
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Supplier</p>
                    <p className="font-medium">{detail.supplier.name}</p>
                  </div>
                  {detail.supplier.phone && (
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {detail.supplier.phone}
                      </p>
                    </div>
                  )}
                  {detail.supplier.email && (
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {detail.supplier.email}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Last Activity Info */}
            {isRawMaterial ? (
              detail.lastPurchase && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4" />
                    Last Purchase
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Supplier</p>
                      <p className="font-medium">{detail.lastPurchase.supplier || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Date</p>
                      <p>{formatDate(detail.lastPurchase.date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Unit Price</p>
                      <p>{formatCurrency(detail.lastPurchase.unitPrice || 0)}</p>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {detail.lastProduction && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4" />
                      Last Production
                    </h4>
                    <p className="text-sm">
                      {detail.lastProduction.quantity.toLocaleString()} {detail.unit}s
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(detail.lastProduction.date)}
                    </p>
                  </div>
                )}
                {detail.lastSale && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4" />
                      Last Sale
                    </h4>
                    <p className="text-sm">
                      {detail.lastSale.quantity.toLocaleString()} {detail.unit}s
                    </p>
                    <p className="text-xs text-gray-500">
                      {detail.lastSale.customer || "Unknown customer"} • {formatDate(detail.lastSale.date)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Used In (Raw Materials only) */}
            {isRawMaterial && detail.usedInProducts && detail.usedInProducts.length > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4" />
                  Used In Products
                </h4>
                <div className="flex flex-wrap gap-2">
                  {detail.usedInProducts.map((product) => (
                    <Badge key={product.id} variant="outline" className="text-sm">
                      {product.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            {detail.recentActivity && detail.recentActivity.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4" />
                  Recent Activity
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {detail.recentActivity.slice(0, 10).map((activity, index) => (
                    <ActivityItem key={index} activity={activity} />
                  ))}
                </div>
              </div>
            )}

            {(!detail.recentActivity || detail.recentActivity.length === 0) && (
              <div className="text-center py-6 text-gray-400 text-sm">
                No recent activity recorded
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">Failed to load details</div>
        )}

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}