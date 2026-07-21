// src/pages/admin/AdminProductCatalog.jsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { productCatalogApi } from "@/api/index.js";
import { PageHeader } from "@/components/shared/PageHeader.jsx";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner.jsx";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog.jsx";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import {
  Search,
  Plus,
  Pencil,
  Archive,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCw,
  PlusCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext.jsx";

const ITEM_TYPES = [
  { value: "all", label: "All Types" },
  { value: "PRODUCT", label: "Finished Products" },
  { value: "RAW_MATERIAL", label: "Raw Materials" },
];

const STATUS_FILTERS = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

// Category Creation Dialog
function CategoryForm({ open, onOpenChange, type, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    setLoading(true);
    try {
      if (type === "PRODUCT") {
        await productCatalogApi.createProductCategory(formData);
      } else {
        await productCatalogApi.createRawMaterialCategory(formData);
      }
      toast.success(`${type === "PRODUCT" ? "Product" : "Raw Material"} category created successfully`);
      onSaved();
      onOpenChange(false);
      setFormData({ name: "", description: "" });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New {type === "PRODUCT" ? "Product" : "Raw Material"} Category</DialogTitle>
          <DialogDescription>
            Add a new category to organize your {type === "PRODUCT" ? "products" : "raw materials"}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Category Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Plastic Materials"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label>Description (Optional)</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this category..."
              rows={2}
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Product Form Component
function ProductForm({ open, onOpenChange, editData, onSaved }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [loading, setLoading] = useState(false);
  const [productCategories, setProductCategories] = useState([]);
  const [rawMaterialCategories, setRawMaterialCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    type: "PRODUCT",
    categoryId: "",
    unit: "piece",
    costPrice: "",
    sellingPrice: "",
    productionCost: "",
    reorderLevel: "10",
    description: "",
    supplierId: "",
  });

  useEffect(() => {
    if (open) {
      fetchCategories();
      fetchSuppliers();
    }
  }, [open]);

  useEffect(() => {
    if (open && editData) {
      setFormData({
        name: editData.name || "",
        sku: editData.sku || "",
        type: editData.type || "PRODUCT",
        categoryId: editData.categoryId || "",
        unit: editData.unit || "piece",
        costPrice: editData.costPrice?.toString() || "",
        sellingPrice: editData.sellingPrice?.toString() || "",
        productionCost: editData.productionCost?.toString() || "",
        reorderLevel: editData.reorderLevel?.toString() || "10",
        description: editData.description || "",
        supplierId: editData.supplierId || "",
      });
    } else if (open) {
      setFormData({
        name: "",
        sku: "",
        type: "PRODUCT",
        categoryId: "",
        unit: "piece",
        costPrice: "",
        sellingPrice: "",
        productionCost: "",
        reorderLevel: "10",
        description: "",
        supplierId: "",
      });
    }
  }, [open, editData]);

  const fetchCategories = async () => {
    try {
      const response = await productCatalogApi.getCategories();
      setProductCategories(response.data.data.productCategories || []);
      setRawMaterialCategories(response.data.data.rawMaterialCategories || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { suppliersApi } = await import("@/api/index.js");
      const response = await suppliersApi.getAll({ limit: 100 });
      setSuppliers(response.data.suppliers || []);
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
    }
  };

  const getCategoryOptions = () => {
    if (formData.type === "PRODUCT") {
      return productCategories;
    } else if (formData.type === "RAW_MATERIAL") {
      return rawMaterialCategories;
    }
    return [];
  };

  const handleCategoryCreated = () => {
    fetchCategories();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.type || !formData.categoryId) {
      toast.error("Name, type, and category are required.");
      return;
    }

    setLoading(true);
    try {
      const dataToSend = {
        ...formData,
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : null,
        sellingPrice: formData.sellingPrice ? parseFloat(formData.sellingPrice) : null,
        productionCost: formData.productionCost ? parseFloat(formData.productionCost) : null,
        reorderLevel: parseInt(formData.reorderLevel) || 10,
        supplierId: formData.type === "RAW_MATERIAL" ? (formData.supplierId || null) : null,
      };

      if (editData) {
        await productCatalogApi.update(editData.id, dataToSend, formData.type);
        toast.success(`${formData.type === "PRODUCT" ? "Product" : "Raw Material"} updated successfully`);
      } else {
        await productCatalogApi.create(dataToSend);
        toast.success(`${formData.type === "PRODUCT" ? "Product" : "Raw Material"} created successfully`);
      }

      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editData ? "Edit Product" : "Add New Product"}
            </DialogTitle>
            <DialogDescription>
              {editData ? "Update product details in the catalog" : "Add a new product or raw material to the catalog"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type Selection */}
            <div>
              <Label>Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => {
                  setFormData({ 
                    ...formData, 
                    type: value, 
                    categoryId: "",
                    supplierId: "",
                  });
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRODUCT">Finished Product</SelectItem>
                  <SelectItem value="RAW_MATERIAL">Raw Material</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Product Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter product name"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label>SKU</Label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Enter SKU"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Label>Category *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-blue-600"
                    onClick={() => setCategoryDialogOpen(true)}
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={`Select ${formData.type === "PRODUCT" ? "Product" : "Raw Material"} Category`} />
                  </SelectTrigger>
                  <SelectContent>
                    {getCategoryOptions().map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unit</Label>
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g. piece, kg, liter"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Pricing - Context Aware */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>{formData.type === "PRODUCT" ? "Cost Price" : "Unit Cost"}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              {formData.type === "PRODUCT" && (
                <>
                  <div>
                    <Label>Selling Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.sellingPrice}
                      onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Production Cost</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.productionCost}
                      onChange={(e) => setFormData({ ...formData, productionCost: e.target.value })}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Reorder Level</Label>
                <Input
                  type="number"
                  value={formData.reorderLevel}
                  onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                  placeholder="10"
                  className="mt-1"
                />
              </div>
              {formData.type === "RAW_MATERIAL" && (
                <div>
                  <Label>Supplier</Label>
                  <Select
                    value={formData.supplierId || "none"}
                    onValueChange={(value) => setFormData({ ...formData, supplierId: value === "none" ? "" : value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {suppliers.map((sup) => (
                        <SelectItem key={sup.id} value={sup.id}>
                          {sup.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter product description..."
                rows={2}
                className="mt-1"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : editData ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Category Creation Dialog */}
      <CategoryForm
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        type={formData.type}
        onSaved={handleCategoryCreated}
      />
    </>
  );
}

export default function AdminProductCatalog() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalRawMaterials: 0,
    archived: 0,
    total: 0,
  });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1, limit: 20 });
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [processing, setProcessing] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(search && { search }),
        ...(typeFilter !== "all" && { type: typeFilter }),
        ...(statusFilter !== "all" && { status: statusFilter }),
      };
      const response = await productCatalogApi.getAll(params);
      setItems(response.data.data || []);
      setStats(response.data.stats || { totalProducts: 0, totalRawMaterials: 0, archived: 0, total: 0 });
      setPagination(response.data.pagination || { page: 1, total: 0, pages: 1, limit: 20 });
    } catch (error) {
      toast.error("Failed to load catalog");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, search, typeFilter, statusFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setProcessing(true);
    try {
      await productCatalogApi.archive(archiveTarget.id, archiveTarget.type);
      toast.success(`${archiveTarget.type === "PRODUCT" ? "Product" : "Raw Material"} archived`);
      setArchiveTarget(null);
      fetchItems();
    } catch (error) {
      toast.error("Failed to archive");
    } finally {
      setProcessing(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setProcessing(true);
    try {
      await productCatalogApi.restore(restoreTarget.id, restoreTarget.type);
      toast.success(`${restoreTarget.type === "PRODUCT" ? "Product" : "Raw Material"} restored`);
      setRestoreTarget(null);
      fetchItems();
    } catch (error) {
      toast.error("Failed to restore");
    } finally {
      setProcessing(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
    setPagination({ ...pagination, page: 1 });
  };

  const hasFilters = search || typeFilter !== "all" || statusFilter !== "all";

  const getTypeBadge = (type) => {
    if (type === "PRODUCT") {
      return <Badge className="bg-blue-100 text-blue-700">Finished Product</Badge>;
    }
    return <Badge className="bg-purple-100 text-purple-700">Raw Material</Badge>;
  };

  const getStatusBadge = (status, isArchived) => {
    if (isArchived) {
      return <Badge className="bg-gray-100 text-gray-700">Archived</Badge>;
    }
    return <Badge className="bg-green-100 text-green-700">Active</Badge>;
  };

  const formatPrice = (value) => {
    if (value === null || value === undefined) return "—";
    return `Rs. ${value.toFixed(2)}`;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Product Catalog"
        description="Manage your product master data"
        actionLabel={isAdmin ? "Add Product" : null}
        actionIcon={isAdmin ? Plus : null}
        onAction={isAdmin ? () => { setEditData(null); setFormOpen(true); } : null}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Total Products</p>
            <p className="text-2xl font-bold text-blue-600">{stats.totalProducts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Raw Materials</p>
            <p className="text-2xl font-bold text-purple-600">{stats.totalRawMaterials}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Archived</p>
            <p className="text-2xl font-bold text-gray-600">{stats.archived}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Total Items</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {ITEM_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="gap-2">
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={fetchItems} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center"><LoadingSpinner /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Product Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Cost Price</TableHead>
                    <TableHead className="text-right">Sell Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-gray-400">
                        No items found in the catalog
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={`${item.type}-${item.id}`} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="font-mono text-sm">{item.sku || "—"}</TableCell>
                        <TableCell>{getTypeBadge(item.type)}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell className="text-right">{formatPrice(item.costPrice)}</TableCell>
                        <TableCell className="text-right">{formatPrice(item.sellingPrice)}</TableCell>
                        <TableCell>{getStatusBadge(item.status, item.isArchived)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isAdmin && !item.isArchived && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={() => { setEditData(item); setFormOpen(true); }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700"
                                  onClick={() => setArchiveTarget(item)}
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {isAdmin && item.isArchived && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                                onClick={() => setRestoreTarget(item)}
                              >
                                <RotateCw className="h-4 w-4" />
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
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
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

      {/* Product Form Dialog */}
      <ProductForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editData={editData}
        onSaved={fetchItems}
      />

      {/* Archive Confirmation */}
      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={() => setArchiveTarget(null)}
        title="Archive Item"
        description={`Are you sure you want to archive "${archiveTarget?.name}"? Archived items won't be selectable in transactions.`}
        onConfirm={handleArchive}
        loading={processing}
        confirmLabel="Archive"
        confirmVariant="destructive"
      />

      {/* Restore Confirmation */}
      <ConfirmDialog
        open={!!restoreTarget}
        onOpenChange={() => setRestoreTarget(null)}
        title="Restore Item"
        description={`Are you sure you want to restore "${restoreTarget?.name}"?`}
        onConfirm={handleRestore}
        loading={processing}
        confirmLabel="Restore"
        confirmVariant="default"
      />
    </div>
  );
}