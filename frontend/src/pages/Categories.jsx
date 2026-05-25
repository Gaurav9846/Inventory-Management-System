import { useEffect, useState, useCallback } from "react";
import { categoriesApi } from "@/api/index.js";
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
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/utils/helpers.js";
import { useAuth } from "@/context/AuthContext.jsx";

function CategoryForm({ open, onOpenChange, editData, onSaved }) {
  const [form, setForm]   = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(editData ? { name: editData.name, description: editData.description || "" } : { name: "", description: "" });
  }, [open, editData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Category name is required.");
    setSaving(true);
    try {
      if (editData) { await categoriesApi.update(editData.id, form); toast.success("Category updated."); }
      else          { await categoriesApi.create(form);              toast.success("Category created."); }
      onSaved(); onOpenChange(false);
    } catch (err) { toast.error(err.response?.data?.message || "Failed to save."); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{editData ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Water Jars" required />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} placeholder="Optional description…" />
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

export default function Categories() {
  const { isManager }  = useAuth();
  const [cats,    setCats]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try { const { data } = await categoriesApi.getAll(); setCats(data); }
    catch { toast.error("Failed to load categories."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async () => {
    setDeleting(true);
    try { await categoriesApi.remove(deleteTarget.id); toast.success("Category deleted."); setDeleteTarget(null); fetchAll(); }
    catch (err) { toast.error(err.response?.data?.message || "Delete failed."); }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Categories" description="Product classification groups"
        onAction={isManager ? () => { setEditData(null); setFormOpen(true); } : undefined}
        actionLabel="Add Category"
      />
      <Card>
        <CardContent className="p-0">
          {loading ? <TableSkeleton rows={5} cols={4} /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Created</TableHead>
                  {isManager && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {!cats.length ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No categories found</TableCell></TableRow>
                ) : cats.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{c.description || "—"}</TableCell>
                    <TableCell><span className="font-semibold">{c._count?.products ?? 0}</span></TableCell>
                    <TableCell className="text-muted-foreground text-xs">{formatDate(c.createdAt)}</TableCell>
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
      <CategoryForm open={formOpen} onOpenChange={setFormOpen} editData={editData} onSaved={fetchAll} />
      <ConfirmDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}
        title="Delete Category" description={`Delete "${deleteTarget?.name}"? Products in this category will be affected.`}
        onConfirm={handleDelete} loading={deleting} />
    </div>
  );
}
