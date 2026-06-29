import { useEffect, useState, useCallback } from "react";
import { productsApi, categoriesApi, suppliersApi } from "@/api/index.js";
import { PageHeader } from "@/components/shared/PageHeader.jsx";
import { StatusBadge } from "@/components/shared/StatusBadge.jsx";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog.jsx";
import { LoadingSpinner, TableSkeleton } from "@/components/shared/LoadingSpinner.jsx";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Pencil, Trash2, Search, Package, ImageOff, Filter } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, truncate } from "@/utils/helpers.js";
import { useAuth } from "@/context/AuthContext.jsx";

const EMPTY_FORM = { name: "", sku: "", description: "", unit: "piece", reorderLevel: 10, currentStock: 0, costPrice: "", sellingPrice: "", categoryId: "", supplierId: "" };

function ProductForm({ open, onOpenChange, editData, categories, suppliers, onSaved }) {
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [image,   setImage]   = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    if (open) {
      setForm(editData ? { ...EMPTY_FORM, ...editData, categoryId: editData.categoryId || "", supplierId: editData.supplierId || "" } : EMPTY_FORM);
      setImage(null);
      setPreview(editData?.imageUrl || null);
    }
  }, [open, editData]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.categoryId) return toast.error("Name and category are required.");
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== "" && v != null) fd.append(k, v); });
      if (image) fd.append("image", image);

      if (editData) {
        await productsApi.update(editData.id, fd);
        toast.success("Product updated.");
      } else {
        await productsApi.create(fd);
        toast.success("Product created.");
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editData ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. 20L Water Jar" required />
            </div>
            <div className="space-y-1.5">
              <Label>SKU</Label>
              <Input value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="e.g. WJ-20L-001" />
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Input value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="piece / litre / box" />
            </div>
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <Select value={form.supplierId || "none"} onValueChange={(v) => set("supplierId", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cost Price (NPR)</Label>
              <Input type="number" value={form.costPrice} onChange={(e) => set("costPrice", e.target.value)} placeholder="0.00" min="0" step="0.01" />
            </div>
            <div className="space-y-1.5">
              <Label>Selling Price (NPR)</Label>
              <Input type="number" value={form.sellingPrice} onChange={(e) => set("sellingPrice", e.target.value)} placeholder="0.00" min="0" step="0.01" />
            </div>
            <div className="space-y-1.5">
              <Label>Current Stock</Label>
              <Input type="number" value={form.currentStock} onChange={(e) => set("currentStock", e.target.value)} min="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Reorder Level</Label>
              <Input type="number" value={form.reorderLevel} onChange={(e) => set("reorderLevel", e.target.value)} min="0" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} placeholder="Optional product description…" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Product Image</Label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted overflow-hidden shrink-0">
                  {preview ? <img src={preview} alt="preview" className="w-full h-full object-cover" /> : <ImageOff className="h-8 w-8 text-muted-foreground" />}
                </div>
                <Input type="file" accept="image/*" onChange={handleFile} className="cursor-pointer" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : editData ? "Update" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Products() {
  const { isManager } = useAuth();
  const [products,    setProducts]    = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [suppliers,   setSuppliers]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [filterCat,   setFilterCat]   = useState("all");
  const [filterLow,   setFilterLow]   = useState(false);
  const [formOpen,    setFormOpen]    = useState(false);
  const [editData,    setEditData]    = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,    setDeleting]    = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)         params.search     = search;
      if (filterCat !== "all") params.categoryId = filterCat;
      if (filterLow)      params.lowStock   = true;

      const [pRes, cRes, sRes] = await Promise.all([
        productsApi.getAll(params),
        categoriesApi.getAll(),
        suppliersApi.getAll(),
      ]);
      setProducts(pRes.data);
      setCategories(cRes.data);
      setSuppliers(sRes.data.suppliers);
    } catch { toast.error("Failed to load products."); }
    finally { setLoading(false); }
  }, [search, filterCat, filterLow]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await productsApi.remove(deleteTarget.id);
      toast.success("Product deleted.");
      setDeleteTarget(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed.");
    } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products"
        description="Manage your product catalog"
        actionLabel="Add Product"
        onAction={isManager ? () => { setEditData(null); setFormOpen(true); } : undefined}
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name or SKU…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant={filterLow ? "destructive" : "outline"} size="sm" onClick={() => setFilterLow(!filterLow)}>
            <Filter className="h-4 w-4" />
            {filterLow ? "Low Stock Only" : "All Stock"}
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? <TableSkeleton rows={6} cols={7} /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Reorder</TableHead>
                  <TableHead>Price (NPR)</TableHead>
                  {isManager && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {!products.length ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No products found</TableCell></TableRow>
                ) : products.map((p) => {
                  const isLow = p.currentStock <= p.reorderLevel;
                  return (
                    <TableRow key={p.id} className={isLow ? "bg-red-50/50" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg border bg-muted overflow-hidden shrink-0">
                            {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <Package className="h-4 w-4 m-2.5 text-muted-foreground" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.unit}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{p.sku || "—"}</TableCell>
                      <TableCell><Badge variant="secondary">{p.category?.name}</Badge></TableCell>
                      <TableCell>
                        <span className={`font-semibold text-sm ${isLow ? "text-destructive" : "text-foreground"}`}>
                          {p.currentStock} {p.unit}(s)
                        </span>
                        {isLow && <span className="ml-2 text-xs text-destructive font-medium">⚠ Low</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{p.reorderLevel}</TableCell>
                      <TableCell className="text-sm">
                        {p.sellingPrice ? formatCurrency(p.sellingPrice) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      {isManager && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => { setEditData(p); setFormOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(p)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ProductForm open={formOpen} onOpenChange={setFormOpen} editData={editData} categories={categories} suppliers={suppliers} onSaved={fetchAll} />
      <ConfirmDialog
        open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}
        title="Delete Product" description={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete} loading={deleting}
      />
    </div>
  );
}
