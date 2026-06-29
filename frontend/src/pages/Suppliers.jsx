// src/pages/Suppliers.jsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { suppliersApi } from "@/api/index.js";
import { PageHeader } from "@/components/shared/PageHeader.jsx";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog.jsx";
import { TableSkeleton } from "@/components/shared/LoadingSpinner.jsx";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";
import { Search, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext.jsx";

// ─────────────────────────────────────────────────────────────────────────
// Supplier Form Modal (Add / Edit)
// ─────────────────────────────────────────────────────────────────────────
const EMPTY = { name: "", contactPerson: "", email: "", phone: "", address: "", paymentTerms: "", notes: "" };

function SupplierForm({ open, onOpenChange, editData, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (open) setForm(editData ? { ...EMPTY, ...editData } : EMPTY);
  }, [open, editData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) return toast.error("Name and phone are required.");
    setSaving(true);
    try {
      if (editData) {
        await suppliersApi.update(editData.id, form);
        toast.success("Supplier updated.");
      } else {
        await suppliersApi.create(form);
        toast.success("Supplier created.");
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editData ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className=" space-y-1.5">
              <Label>Company Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Supplier name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Person</Label>
              <Input
                value={form.contactPerson}
                onChange={(e) => set("contactPerson", e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone *</Label>
              <Input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="98XXXXXXXX"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="supplier@email.com"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Full address"
              />
            </div>
            
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : editData ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Main Suppliers Component
// ─────────────────────────────────────────────────────────────────────────
export default function Suppliers() {
  const { isManager } = useAuth();
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // Modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await suppliersApi.getAll({
        search: search || undefined,
        page,
        limit,
      });
      setSuppliers(data.suppliers);
      setTotalPages(data.totalPages);
    } catch {
      toast.error("Failed to load suppliers.");
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await suppliersApi.remove(deleteTarget.id);
      toast.success("Supplier deleted.");
      setDeleteTarget(null);
      fetchSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Suppliers"
        description="View supplier details and order history"
        onAction={
          isManager
            ? () => {
                setEditData(null);
                setFormOpen(true);
              }
            : undefined
        }
        actionLabel="Add Supplier"
      />

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or contact..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton rows={limit} cols={5} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Total Orders</TableHead>
                    <TableHead>Outstanding (Unpaid)</TableHead>
                    <TableHead>Last Order</TableHead>
                    {isManager && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        No suppliers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    suppliers.map((supplier) => (
                      <TableRow
                        key={supplier.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/suppliers/${supplier.id}`)}
                      >
                        <TableCell>
                          <p className="font-medium">{supplier.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {supplier.contactPerson || "—"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{supplier.phone}</div>
                            {supplier.email && (
                              <div className="text-xs text-muted-foreground">{supplier.email}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{supplier._count?.purchaseOrders ?? 0}</TableCell>
                        <TableCell className="text-red-600 font-medium">
                          ${supplier.outstandingBalance?.toFixed(2) ?? "0.00"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {supplier.lastOrderDate
                            ? new Date(supplier.lastOrderDate).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        {isManager && (
                          <TableCell
                            className="text-right"
                            onClick={(e) => e.stopPropagation()} // Prevent row click
                          >
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditData(supplier);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(supplier)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Supplier Modal */}
      <SupplierForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editData={editData}
        onSaved={fetchSuppliers}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Delete Supplier"
        description={`Delete "${deleteTarget?.name}"? Related records may be affected.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}