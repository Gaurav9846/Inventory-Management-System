// src/pages/manager/ManagerStaffActivity.jsx
import { useEffect, useState, useCallback } from "react";
import { usersApi } from "@/api/index.js";
import { analyticsApi } from "@/api/index.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { StatusBadge } from "@/components/shared/StatusBadge.jsx";
import { TableSkeleton, LoadingSpinner } from "@/components/shared/LoadingSpinner.jsx";
import { PageHeader } from "@/components/shared/PageHeader.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";
import { UserCheck, Activity, Clock, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime, getInitials } from "@/utils/helpers.js";

export default function ManagerStaffActivity() {
  const [staffUsers, setStaffUsers] = useState([]);
  const [auditLogs,  setAuditLogs]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filterUser, setFilterUser] = useState("all");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterUser !== "all") params.userId = filterUser;
      const [uRes, aRes] = await Promise.all([
        usersApi.getAll(),
        analyticsApi.auditLogs({ ...params, limit: 100 }),
      ]);
      setStaffUsers(uRes.data.filter((u) => u.role === "STAFF"));
      setAuditLogs(aRes.data.data);
    } catch { toast.error("Failed to load staff activity."); }
    finally { setLoading(false); }
  }, [filterUser]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Per-staff action counts
  const staffStats = staffUsers.map((u) => {
    const logs = auditLogs.filter((l) => l.userId === u.id);
    return {
      ...u,
      totalActions: logs.length,
      lastActive: logs[0]?.createdAt ?? null,
      actions: {
        STOCK_IN:  logs.filter((l) => l.action === "STOCK_IN").length,
        STOCK_OUT: logs.filter((l) => l.action === "STOCK_OUT").length,
        CREATE:    logs.filter((l) => l.action === "CREATE").length,
      },
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Staff Activity" description="Monitor your team's daily operations and actions" />

      {/* Staff cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {staffStats.map((s) => (
          <Card key={s.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${s.isActive ? "bg-violet-600" : "bg-slate-400"}`}>
                  {getInitials(s.name)}
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-800">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.email}</p>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold mt-0.5 ${s.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {s.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-green-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-green-700">{s.actions.STOCK_IN}</p>
                  <p className="text-xs text-green-600">Stock IN</p>
                </div>
                <div className="bg-red-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-red-700">{s.actions.STOCK_OUT}</p>
                  <p className="text-xs text-red-600">Stock OUT</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-blue-700">{s.actions.CREATE}</p>
                  <p className="text-xs text-blue-600">Orders</p>
                </div>
              </div>
              {s.lastActive && (
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Last active: {formatDateTime(s.lastActive)}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
        {!staffStats.length && !loading && (
          <div className="col-span-3 text-center py-10 text-muted-foreground text-sm">No staff accounts found</div>
        )}
      </div>

      {/* Activity log */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" /> Activity Log
          </CardTitle>
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="All staff" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {staffUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? <TableSkeleton rows={8} cols={4} /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!auditLogs.length
                  ? <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No activity yet</TableCell></TableRow>
                  : auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">
                            {getInitials(log.user?.name)}
                          </div>
                          <span className="text-xs font-medium">{log.user?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          log.action.includes("IN") ? "bg-green-100 text-green-700" :
                          log.action.includes("OUT") ? "bg-red-100 text-red-700" :
                          log.action.includes("CREATE") ? "bg-blue-100 text-blue-700" :
                          "bg-slate-100 text-slate-700"
                        }`}>{log.action.replace(/_/g, " ")}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.entity}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-40 truncate">
                        {log.details ? JSON.stringify(log.details).slice(0, 60) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</TableCell>
                    </TableRow>
                  ))
                }
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
