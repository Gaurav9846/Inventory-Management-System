import { useEffect, useState, useCallback } from "react";
import { usersApi } from "@/api/index.js";
import { PageHeader } from "@/components/shared/PageHeader.jsx";
import { StatusBadge } from "@/components/shared/StatusBadge.jsx";
import { TableSkeleton } from "@/components/shared/LoadingSpinner.jsx";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog.jsx";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Pencil, UserX, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { formatDate, getInitials } from "@/utils/helpers.js";

function UserForm({ open, onOpenChange, editData, onSaved }) {
  const [form, setForm]     = useState({ name: "", email: "", role: "STAFF" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (open) setForm(editData
      ? { name: editData.name, email: editData.email, role: editData.role }
      : { name: "", email: "", role: "STAFF" });
  }, [open, editData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return toast.error("Name and email are required.");
    setSaving(true);
    try {
      if (editData) { await usersApi.update(editData.id, { name: form.name, role: form.role }); toast.success("User updated."); }
      else          { await usersApi.create(form); toast.success("User created. Credentials sent via email."); }
      onSaved(); onOpenChange(false);
    } catch (err) { toast.error(err.response?.data?.message || "Failed to save."); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{editData ? "Edit User" : "Create User"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5"><Label>Full Name *</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="Full name" /></div>
          {!editData && <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required placeholder="user@company.com" /></div>}
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => set("role", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="STAFF">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!editData && <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3">A temporary password will be generated and emailed to the user.</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : editData ? "Update" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Users() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggling, setToggling]         = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try { const { data } = await usersApi.getAll(); setUsers(data); }
    catch { toast.error("Failed to load users."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleToggle = async () => {
    setToggling(true);
    try {
      await usersApi.update(toggleTarget.id, { isActive: !toggleTarget.isActive });
      toast.success(`User ${toggleTarget.isActive ? "deactivated" : "activated"}.`);
      setToggleTarget(null);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || "Failed."); }
    finally { setToggling(false); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="User Management" description="Manage staff accounts and roles"
        onAction={() => { setEditData(null); setFormOpen(true); }}
        actionLabel="Create User"
      />
      <Card>
        <CardContent className="p-0">
          {loading ? <TableSkeleton rows={5} cols={5} /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!users.length ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No users found</TableCell></TableRow>
                ) : users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                          {getInitials(u.name)}
                        </div>
                        <span className="font-medium text-sm">{u.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell><StatusBadge value={u.role} /></TableCell>
                    <TableCell><StatusBadge value={u.isActive ? "true" : "false"} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditData(u); setFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className={u.isActive ? "text-destructive hover:text-destructive" : "text-success hover:text-success"} onClick={() => setToggleTarget(u)}>
                          {u.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <UserForm open={formOpen} onOpenChange={setFormOpen} editData={editData} onSaved={fetchAll} />
      <ConfirmDialog
        open={!!toggleTarget} onOpenChange={() => setToggleTarget(null)}
        title={toggleTarget?.isActive ? "Deactivate User" : "Activate User"}
        description={`${toggleTarget?.isActive ? "Deactivate" : "Activate"} account for "${toggleTarget?.name}"?`}
        onConfirm={handleToggle} loading={toggling}
        confirmLabel={toggleTarget?.isActive ? "Deactivate" : "Activate"}
        confirmVariant={toggleTarget?.isActive ? "destructive" : "default"}
      />
    </div>
  );
}
