import { useEffect, useState, useCallback } from "react";
import { customersApi } from "@/api/index.js";
import { PageHeader } from "@/components/shared/PageHeader.jsx";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog.jsx";
import { TableSkeleton } from "@/components/shared/LoadingSpinner.jsx";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Pencil, Trash2, Search, Phone, Mail, MapPin } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/utils/helpers.js";
import { useAuth } from "@/context/AuthContext.jsx";

const EMPTY = { name: "", email: "", phone: "", address: "", deliveryAddress: "", notes: "" };

function CustomerForm({ open, onOpenChange, editData, onSaved }) {
  const [form, setForm]     = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => { if (open) setForm(editData ? { ...EMPTY, ...editData } : EMPTY); }, [open, editData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) return toast.error("Name and phone are required.");
    setSaving(true);
    try {
      if (editData) { await customersApi.update(editData.id, form); toast.success("Customer updated."); }
      else          { await customersApi.create(form);              toast.success("Customer created."); }
      onSaved(); onOpenChange(false);
    } catch (err) { toast.error(err.response?.data?.message || "Failed to save."); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editData ? "Edit Customer" : "Add Customer"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5"><Label>Full Name *</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="Customer full name" /></div>
            <div className="space-y-1.5"><Label>Phone *</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} required placeholder="98XXXXXXXX" /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="customer@email.com" /></div>
            <div className="col-span-2 space-y-1.5"><Label>Address</Label><Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Billing address" /></div>
            <div className="col-span-2 space-y-1.5"><Label>Delivery Address</Label><Input value={form.deliveryAddress} onChange={(e) => set("deliveryAddress", e.target.value)} placeholder="Delivery address (if different)" /></div>
            <div className="col-span-2 space-y-1.5"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} /></div>
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

export default function Customers() {
  const { isManager } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [formOpen, setFormOpen]   = useState(false);
  const [editData, setEditData]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]   = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try { const { data } = await customersApi.getAll({ search: search || undefined }); setCustomers(data); }
    catch { toast.error("Failed to load customers."); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async () => {
    setDeleting(true);
    try { await customersApi.remove(deleteTarget.id); toast.success("Customer deleted."); setDeleteTarget(null); fetchAll(); }
    catch (err) { toast.error(err.response?.data?.message || "Delete failed."); }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Customers" description="Manage customer records and order history"
        onAction={isManager ? () => { setEditData(null); setFormOpen(true); } : undefined}
        actionLabel="Add Customer"
      />
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search customers…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          {loading ? <TableSkeleton rows={6} cols={5} /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Delivery Address</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Outstanding (NPR)</TableHead>
                  {isManager && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {!customers.length ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No customers found</TableCell></TableRow>
                ) : customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-sm">{c.name}</TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{c.phone}</div>
                        {c.email && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{c.email}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {c.deliveryAddress ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" />{c.deliveryAddress}</div>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell><span className="font-semibold">{c._count?.salesOrders ?? 0}</span></TableCell>
                    <TableCell>
                      <span className={c.outstandingBalance > 0 ? "font-semibold text-destructive" : "text-muted-foreground"}>
                        {c.outstandingBalance > 0 ? formatCurrency(c.outstandingBalance) : "—"}
                      </span>
                    </TableCell>
                    {isManager && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => { setEditData(c); setFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(c)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <CustomerForm open={formOpen} onOpenChange={setFormOpen} editData={editData} onSaved={fetchAll} />
      <ConfirmDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}
        title="Delete Customer" description={`Delete "${deleteTarget?.name}"? Order history will remain.`}
        onConfirm={handleDelete} loading={deleting} />
    </div>
  );
}
