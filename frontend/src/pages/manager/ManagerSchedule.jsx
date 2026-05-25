// src/pages/manager/ManagerSchedule.jsx
import { useEffect, useState } from "react";
import { usersApi } from "@/api/index.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { PageHeader } from "@/components/shared/PageHeader.jsx";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner.jsx";
import {
  Calendar, Plus, Clock, User, CheckCircle,
  Circle, Trash2, AlarmClock,
} from "lucide-react";
import { toast } from "sonner";
import { getInitials } from "@/utils/helpers.js";

// Local task storage (in a real app this would be in the DB)
const STORAGE_KEY = "ims_manager_tasks";
const loadTasks   = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } };
const saveTasks   = (tasks) => localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));

const TASK_TYPES = [
  { value: "stock",    label: "Stock Check",      color: "bg-blue-100 text-blue-700"   },
  { value: "delivery", label: "Delivery",          color: "bg-cyan-100 text-cyan-700"   },
  { value: "order",    label: "Order Processing",  color: "bg-amber-100 text-amber-700" },
  { value: "cleaning", label: "Cleaning / Maint.", color: "bg-green-100 text-green-700" },
  { value: "other",    label: "Other",             color: "bg-slate-100 text-slate-700" },
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function AddTaskDialog({ open, onOpenChange, staffUsers, onSaved }) {
  const [form, setForm] = useState({
    staffId: "", title: "", type: "stock", day: "Monday",
    startTime: "09:00", endTime: "17:00", notes: "",
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (open) setForm({ staffId: "", title: "", type: "stock", day: "Monday", startTime: "09:00", endTime: "17:00", notes: "" });
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.staffId || !form.title) return toast.error("Staff and title are required.");
    const staff = staffUsers.find((u) => u.id === form.staffId);
    const tasks = loadTasks();
    tasks.push({ ...form, id: Date.now().toString(), staffName: staff?.name, done: false, createdAt: new Date().toISOString() });
    saveTasks(tasks);
    toast.success("Task assigned.");
    onSaved(); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><AlarmClock className="h-5 w-5 text-emerald-600" />Assign Task</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Assign To *</Label>
            <Select value={form.staffId} onValueChange={(v) => set("staffId", v)}>
              <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
              <SelectContent>
                {staffUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Task Title *</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Check warehouse stock" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Task Type</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Day</Label>
              <Select value={form.day} onValueChange={(v) => set("day", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Start Time</Label>
              <Input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End Time</Label>
              <Input type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Additional instructions…" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Assign Task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ManagerSchedule() {
  const [staffUsers, setStaffUsers] = useState([]);
  const [tasks,      setTasks]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [formOpen,   setFormOpen]   = useState(false);
  const [filterDay,  setFilterDay]  = useState("All");
  const [filterStaff,setFilterStaff]= useState("all");

  const loadAll = async () => {
    try {
      const { data } = await usersApi.getAll();
      setStaffUsers(data.filter((u) => u.role === "STAFF" && u.isActive));
    } catch { toast.error("Failed to load staff."); }
    finally { setLoading(false); }
    setTasks(loadTasks());
  };

  useEffect(() => { loadAll(); }, []);

  const handleRefresh = () => setTasks(loadTasks());

  const toggleDone = (id) => {
    const updated = tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t);
    saveTasks(updated); setTasks(updated);
  };

  const deleteTask = (id) => {
    const updated = tasks.filter((t) => t.id !== id);
    saveTasks(updated); setTasks(updated);
    toast.success("Task removed.");
  };

  const filtered = tasks.filter((t) => {
    const matchDay   = filterDay   === "All"  || t.day === filterDay;
    const matchStaff = filterStaff === "all"  || t.staffId === filterStaff;
    return matchDay && matchStaff;
  });

  const pending  = filtered.filter((t) => !t.done).length;
  const complete = filtered.filter((t) =>  t.done).length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Work Schedule"
        description="Assign tasks and shifts to your team"
        actionLabel="Assign Task"
        actionIcon={Plus}
        onAction={() => setFormOpen(true)}
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-3xl font-black text-slate-800">{staffUsers.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Active Staff Members</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-3xl font-black text-amber-700">{pending}</p>
          <p className="text-xs text-amber-600 mt-1">Pending Tasks</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-3xl font-black text-green-700">{complete}</p>
          <p className="text-xs text-green-600 mt-1">Completed Tasks</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold text-muted-foreground">Day:</span>
        {["All", ...DAYS].map((d) => (
          <button key={d} onClick={() => setFilterDay(d)}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${filterDay === d ? "bg-emerald-600 text-white border-emerald-600" : "bg-white border-slate-200 text-slate-600 hover:border-emerald-300"}`}>
            {d}
          </button>
        ))}
        <span className="text-xs font-semibold text-muted-foreground ml-3">Staff:</span>
        <Select value={filterStaff} onValueChange={setFilterStaff}>
          <SelectTrigger className="w-40 h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Staff</SelectItem>
            {staffUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Weekly schedule grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {(filterDay === "All" ? DAYS : [filterDay]).map((day) => {
          const dayTasks = filtered.filter((t) => t.day === day);
          return (
            <Card key={day} className="overflow-hidden">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                    {day}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">{dayTasks.length} task{dayTasks.length !== 1 ? "s" : ""}</Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {!dayTasks.length
                  ? <p className="text-xs text-muted-foreground py-2 text-center">No tasks</p>
                  : dayTasks.map((task) => {
                    const taskType = TASK_TYPES.find((t) => t.value === task.type);
                    return (
                      <div key={task.id}
                        className={`rounded-lg border p-3 transition-opacity ${task.done ? "opacity-50" : ""}`}>
                        <div className="flex items-start gap-2">
                          <button onClick={() => toggleDone(task.id)} className="mt-0.5 shrink-0">
                            {task.done
                              ? <CheckCircle className="h-4 w-4 text-green-600" />
                              : <Circle className="h-4 w-4 text-slate-300" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold leading-tight ${task.done ? "line-through text-muted-foreground" : "text-slate-800"}`}>
                              {task.title}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${taskType?.color ?? "bg-slate-100 text-slate-700"}`}>
                                {taskType?.label ?? task.type}
                              </span>
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" />{task.startTime}–{task.endTime}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mt-1.5">
                              <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0">
                                {getInitials(task.staffName)}
                              </div>
                              <span className="text-xs text-muted-foreground">{task.staffName}</span>
                            </div>
                            {task.notes && <p className="text-xs text-muted-foreground mt-1 italic">{task.notes}</p>}
                          </div>
                          <button onClick={() => deleteTask(task.id)} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Staff overview cards */}
      {filterDay === "All" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" />Staff Workload Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {staffUsers.map((u) => {
              const staffTasks  = tasks.filter((t) => t.staffId === u.id);
              const doneTasks   = staffTasks.filter((t) => t.done).length;
              const totalTasks  = staffTasks.length;
              const pct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
              return (
                <div key={u.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {getInitials(u.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{totalTasks} task(s)</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{doneTasks}/{totalTasks} done</p>
                </div>
              );
            })}
            {!staffUsers.length && (
              <div className="col-span-4 text-center py-6 text-sm text-muted-foreground">No active staff members</div>
            )}
          </CardContent>
        </Card>
      )}

      <AddTaskDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        staffUsers={staffUsers}
        onSaved={handleRefresh}
      />
    </div>
  );
}
