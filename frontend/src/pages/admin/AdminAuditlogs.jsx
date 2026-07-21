// src/pages/admin/AdminAuditLogs.jsx
import { useEffect, useState, useCallback } from "react";
import { auditLogsApi } from "@/api/index.js";
import { PageHeader } from "@/components/shared/PageHeader.jsx";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner.jsx";
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
} from "@/components/ui/dialog.jsx";
import { Separator } from "@/components/ui/separator.jsx";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  Calendar,
  Users,
  Activity,
  X,
  Clock,
  Shield,
  Building2,
  CreditCard,
  FileText,
  Package,
  ShoppingCart,
  User,
  DollarSign,
  Truck,
  Box,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateTime, getInitials } from "@/utils/helpers.js";
import * as XLSX from "xlsx";

// ==================== ACTION COLORS ====================
const ACTION_COLORS = {
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  ARCHIVE: "bg-orange-100 text-orange-700",
  RESTORE: "bg-teal-100 text-teal-700",
  LOGIN: "bg-purple-100 text-purple-700",
  LOGOUT: "bg-gray-100 text-gray-700",
  APPROVE: "bg-emerald-100 text-emerald-700",
  REJECT: "bg-rose-100 text-rose-700",
  RECORD_PAYMENT: "bg-indigo-100 text-indigo-700",
  CHANGE_PASSWORD: "bg-amber-100 text-amber-700",
  DEACTIVATE: "bg-red-100 text-red-700",
  ACTIVATE: "bg-green-100 text-green-700",
  STOCK_IN: "bg-cyan-100 text-cyan-700",
  STOCK_OUT: "bg-rose-100 text-rose-700",
  STOCK_ADJUST: "bg-yellow-100 text-yellow-700",
  UPDATE_STATUS: "bg-blue-100 text-blue-700",
  CANCEL: "bg-red-100 text-red-700",
  BULK_UPDATE_STATUS: "bg-purple-100 text-purple-700",
  UPLOAD_INVOICE: "bg-indigo-100 text-indigo-700",
  DELETE_INVOICE: "bg-red-100 text-red-700",
  RECEIVE_GOODS: "bg-emerald-100 text-emerald-700",
  VIEW_REPORT: "bg-gray-100 text-gray-700",
  ADD_PAYMENT: "bg-indigo-100 text-indigo-700",
};

// ==================== MODULE ICONS ====================
const MODULE_ICONS = {
  Users: Users,
  Products: Package,
  Inventory: Package,
  Orders: ShoppingCart,
  Customers: Users,
  Suppliers: Building2,
  "Purchase Orders": ShoppingCart,
  Credit: CreditCard,
  Authentication: Shield,
  Stock: Package,
  "Sales Orders": ShoppingCart,
  Deliveries: Truck,
  Payments: CreditCard,
  Reports: FileText,
  "Raw Materials": Package,
  "Product Catalog": Package,
  Notifications: Activity,
};

// ==================== STAT CARDS ====================
const STAT_CARDS = [
  { label: "Total Logs", key: "total", icon: Activity, color: "bg-blue-500" },
  { label: "Today's Logs", key: "today", icon: Clock, color: "bg-green-500" },
  { label: "Orders", key: "orders", icon: ShoppingCart, color: "bg-purple-500" },
  { label: "Inventory", key: "inventory", icon: Package, color: "bg-orange-500" },
  { label: "Users", key: "users", icon: Users, color: "bg-teal-500" },
];

// ==================== INITIALS COLOR ====================
const getInitialsColor = (name) => {
  if (!name) return "bg-gray-100 text-gray-700";
  const colors = [
    "bg-red-100 text-red-700",
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-yellow-100 text-yellow-700",
    "bg-purple-100 text-purple-700",
    "bg-pink-100 text-pink-700",
    "bg-indigo-100 text-indigo-700",
    "bg-teal-100 text-teal-700",
  ];
  const index = name.charCodeAt(0) || 0;
  return colors[index % colors.length];
};

// ==================== ACTION BADGE ====================
const getActionBadge = (action) => {
  if (!action) return <Badge className="bg-gray-100 text-gray-700">N/A</Badge>;
  const color = ACTION_COLORS[action] || "bg-gray-100 text-gray-700";
  return (
    <Badge className={`${color} text-xs px-2 py-0.5`}>
      {action.replace(/_/g, " ")}
    </Badge>
  );
};

// ==================== TRUNCATE LOG ID ====================
const truncateLogId = (id) => {
  if (!id) return "N/A";
  if (id.length <= 12) return id;
  return id.slice(0, 12);
};

// ==================== FORMAT IP ====================
const formatIP = (ip) => {
  if (!ip) return "—";
  if (ip.includes("::1") || ip.includes("127.0.0.1")) {
    return "Localhost";
  }
  if (ip.startsWith("::ffff:")) {
    return ip.substring(7);
  }
  return ip;
};

// ==================== AUDIT LOG DETAIL MODAL ====================
function AuditLogDetailModal({ open, onOpenChange, log }) {
  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Audit Log Details
          </DialogTitle>
          <DialogDescription>
            Log ID: <span className="font-mono text-sm">{log.id}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Badge className={`${ACTION_COLORS[log.action] || "bg-gray-100"} text-sm px-3 py-1`}>
              {log.action.replace(/_/g, " ")}
            </Badge>
            <span className="text-sm font-medium">{log.module || "N/A"}</span>
            <span className="text-xs text-gray-400 ml-auto">{formatDateTime(log.createdAt)}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Performed By</p>
              <p className="font-medium">{log.userName || "Unknown"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Role</p>
              <Badge variant="outline">{log.userRole || "N/A"}</Badge>
            </div>
            <div>
              <p className="text-xs text-gray-500">Module</p>
              <p>{log.module || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Date</p>
              <p>{formatDateTime(log.createdAt)}</p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-xs text-gray-500">Description</p>
            <p className="text-sm">{log.description || "N/A"}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Affected Entity</p>
              <p>{log.entity || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Entity ID</p>
              <p className="font-mono text-sm">{log.entityId || "N/A"}</p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-xs text-gray-500">IP Address</p>
            <p className="font-mono text-sm">{formatIP(log.ipAddress)}</p>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== MAIN PAGE ====================
export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    orders: 0,
    inventory: 0,
    users: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });
  const [filters, setFilters] = useState({
    search: "",
    module: "all",
    action: "all",
    userId: "all",
    role: "all",
    startDate: "",
    endDate: "",
  });
  const [filterOptions, setFilterOptions] = useState({
    modules: [],
    actions: [],
    users: [],
    roles: [],
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // ==================== FETCH LOGS ====================
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.search && { search: filters.search }),
        ...(filters.module !== "all" && { module: filters.module }),
        ...(filters.action !== "all" && { action: filters.action }),
        ...(filters.userId !== "all" && { userId: filters.userId }),
        ...(filters.role !== "all" && { role: filters.role }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      };

      const response = await auditLogsApi.getAll(params);
      setLogs(response.data.data || []);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, filters]);

  // ==================== FETCH STATS ====================
  const fetchStats = useCallback(async () => {
    try {
      const response = await auditLogsApi.getStats();
      setStats(response.data.data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, []);

  // ==================== FETCH FILTERS ====================
  const fetchFilters = useCallback(async () => {
    try {
      const response = await auditLogsApi.getFilters();
      setFilterOptions(response.data.data);
    } catch (error) {
      console.error("Failed to fetch filters:", error);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchStats();
    fetchFilters();
  }, []);

  // ==================== CLEAR FILTERS ====================
  const clearFilters = () => {
    setFilters({
      search: "",
      module: "all",
      action: "all",
      userId: "all",
      role: "all",
      startDate: "",
      endDate: "",
    });
    setPagination({ ...pagination, page: 1 });
  };

  const hasFilters = filters.search || 
    filters.module !== "all" || 
    filters.action !== "all" || 
    filters.userId !== "all" || 
    filters.role !== "all" || 
    filters.startDate || 
    filters.endDate;

  // ==================== EXPORT EXCEL ====================
  const handleExportExcel = () => {
    if (logs.length === 0) {
      toast.error("No logs to export");
      return;
    }

    const exportData = logs.map(log => ({
      "Log ID": truncateLogId(log.id),
      "Date": formatDateTime(log.createdAt),
      "User": log.userName || "Unknown",
      "Role": log.userRole || "N/A",
      "Module": log.module || "N/A",
      "Action": log.action || "N/A",
      "Description": log.description || "",
      "IP Address": formatIP(log.ipAddress) || "",
      "Entity": log.entity || "",
      "Entity ID": log.entityId || "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Audit Logs");
    XLSX.writeFile(wb, `audit-logs-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Export successful");
  };

  // ==================== PRINT FUNCTION ====================
  const handlePrint = () => {
    const printData = logs;

    const tableRows = printData.map((log) => {
      const userName = log.userName || "Unknown User";
      const role = log.userRole || "N/A";
      const action = log.action || "N/A";
      const description = log.description || "—";
      const ip = formatIP(log.ipAddress);
      const dateTime = formatDateTime(log.createdAt);
      const module = log.module || "N/A";
      const logId = truncateLogId(log.id);

      return `
        <tr>
          <td>${logId}</td>
          <td>
            <div class="user-cell">
              <div class="avatar">${getInitials(userName)}</div>
              <div>
                <div class="user-name">${userName}</div>
                <div class="user-role">${role}</div>
              </div>
            </div>
          </td>
          <td>${module}</td>
          <td><span class="action-badge action-${action}">${action.replace(/_/g, " ")}</span></td>
          <td>${description}</td>
          <td>${ip}</td>
          <td>${dateTime}</td>
        </tr>
      `;
    }).join('');

    const statsData = {
      total: stats.total || logs.length,
      today: stats.today || 0,
      orders: stats.orders || 0,
      inventory: stats.inventory || 0,
      users: stats.users || 0,
    };

    const getFilterLabel = (type, value) => {
      if (value === "all" || !value) return "All";
      if (type === "module") {
        const found = filterOptions.modules.find(m => m.value === value);
        return found?.label || value;
      }
      if (type === "action") {
        const found = filterOptions.actions.find(a => a.value === value);
        return found?.label || value;
      }
      if (type === "user") {
        const found = filterOptions.users.find(u => u.value === value);
        return found?.label || value;
      }
      if (type === "role") {
        const found = filterOptions.roles.find(r => r.value === value);
        return found?.label || value;
      }
      return value;
    };

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Audit Logs Report</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            padding: 40px;
            color: #1f2937;
            background: white;
            line-height: 1.5;
          }
          .container { max-width: 1200px; margin: 0 auto; }
          
          .header {
            text-align: center;
            padding: 20px 0 30px;
            border-bottom: 3px double #10b981;
            margin-bottom: 30px;
          }
          .header h1 {
            font-size: 28px;
            font-weight: 700;
            color: #1a1a1a;
            letter-spacing: 1px;
          }
          .header h2 {
            font-size: 16px;
            font-weight: 400;
            color: #6b7280;
            margin-top: 4px;
          }
          .header .meta {
            font-size: 12px;
            color: #9ca3af;
            margin-top: 8px;
          }
          
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 12px;
            margin-bottom: 25px;
          }
          .stat-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 12px 16px;
            text-align: center;
          }
          .stat-card .stat-value {
            font-size: 22px;
            font-weight: 700;
            color: #1a1a1a;
          }
          .stat-card .stat-label {
            font-size: 11px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 2px;
          }
          .stat-card.blue .stat-value { color: #3b82f6; }
          .stat-card.green .stat-value { color: #10b981; }
          .stat-card.purple .stat-value { color: #8b5cf6; }
          .stat-card.orange .stat-value { color: #f59e0b; }
          .stat-card.teal .stat-value { color: #14b8a6; }
          
          .filters-info {
            background: #f9fafb;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 12px;
            border: 1px solid #e5e7eb;
          }
          .filters-info .label { color: #6b7280; font-weight: 500; }
          .filters-info .value { color: #1f2937; font-weight: 600; }
          .filters-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 4px 20px;
            margin-top: 4px;
          }
          .filters-grid .filter-item {
            display: flex;
            justify-content: space-between;
            padding: 2px 0;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-top: 10px;
          }
          table th {
            background: #f3f4f6;
            padding: 10px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #6b7280;
            border-bottom: 2px solid #d1d5db;
          }
          table td {
            padding: 10px 12px;
            border-bottom: 1px solid #e5e7eb;
            vertical-align: middle;
          }
          table tr:nth-child(even) { background: #f9fafb; }
          table tr:hover { background: #f3f4f6; }
          
          .user-cell {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #e5e7eb;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 700;
            color: #4b5563;
          }
          .user-name { font-weight: 500; }
          .user-role { font-size: 10px; color: #6b7280; }
          
          .action-badge {
            display: inline-block;
            padding: 2px 10px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .action-CREATE { background: #d1fae5; color: #065f46; }
          .action-UPDATE { background: #dbeafe; color: #1e40af; }
          .action-DELETE { background: #fee2e2; color: #991b1b; }
          .action-ARCHIVE { background: #fed7aa; color: #9a3412; }
          .action-RESTORE { background: #ccfbf1; color: #0f766e; }
          .action-LOGIN { background: #e9d5ff; color: #5b21b6; }
          .action-LOGOUT { background: #f3f4f6; color: #374151; }
          .action-APPROVE { background: #d1fae5; color: #065f46; }
          .action-REJECT { background: #fee2e2; color: #991b1b; }
          .action-RECORD_PAYMENT { background: #e0e7ff; color: #3730a3; }
          .action-STOCK_IN { background: #cffafe; color: #0e7490; }
          .action-STOCK_OUT { background: #fce7f3; color: #9d174d; }
          .action-STOCK_ADJUST { background: #fef3c7; color: #92400e; }
          .action-UPDATE_STATUS { background: #dbeafe; color: #1e40af; }
          .action-CANCEL { background: #fee2e2; color: #991b1b; }
          
          .footer {
            text-align: center;
            padding-top: 20px;
            margin-top: 25px;
            border-top: 2px solid #e5e7eb;
            font-size: 11px;
            color: #9ca3af;
          }
          .footer .count {
            font-weight: 600;
            color: #1f2937;
          }
          
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
            table { font-size: 10px; }
            table th, table td { padding: 6px 8px; }
            .stat-card { padding: 8px 12px; }
            .stat-card .stat-value { font-size: 18px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>FUSION IMS</h1>
            <h2>Audit Log Report</h2>
            <div class="meta">
              Generated on: ${new Date().toLocaleString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-card blue">
              <div class="stat-value">${statsData.total}</div>
              <div class="stat-label">Total Logs</div>
            </div>
            <div class="stat-card green">
              <div class="stat-value">${statsData.today}</div>
              <div class="stat-label">Today's Logs</div>
            </div>
            <div class="stat-card purple">
              <div class="stat-value">${statsData.orders}</div>
              <div class="stat-label">Orders</div>
            </div>
            <div class="stat-card orange">
              <div class="stat-value">${statsData.inventory}</div>
              <div class="stat-label">Inventory</div>
            </div>
            <div class="stat-card teal">
              <div class="stat-value">${statsData.users}</div>
              <div class="stat-label">Users</div>
            </div>
          </div>

          <div class="filters-info">
            <div style="font-weight:600; margin-bottom:6px; font-size:13px;">📋 Applied Filters</div>
            <div class="filters-grid">
              <div class="filter-item">
                <span class="label">Module:</span>
                <span class="value">${getFilterLabel('module', filters.module)}</span>
              </div>
              <div class="filter-item">
                <span class="label">Action:</span>
                <span class="value">${getFilterLabel('action', filters.action)}</span>
              </div>
              <div class="filter-item">
                <span class="label">User:</span>
                <span class="value">${getFilterLabel('user', filters.userId)}</span>
              </div>
              <div class="filter-item">
                <span class="label">Role:</span>
                <span class="value">${getFilterLabel('role', filters.role)}</span>
              </div>
              <div class="filter-item">
                <span class="label">Date Range:</span>
                <span class="value">${filters.startDate || 'Any'} ${filters.startDate && filters.endDate ? '→' : ''} ${filters.endDate || 'Any'}</span>
              </div>
              <div class="filter-item">
                <span class="label">Search:</span>
                <span class="value">${filters.search || 'None'}</span>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Log ID</th>
                <th>User / Role</th>
                <th>Module</th>
                <th>Action</th>
                <th>Description</th>
                <th>IP Address</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="footer">
            <p>Showing <span class="count">${printData.length}</span> of <span class="count">${statsData.total}</span> audit logs</p>
            <p style="margin-top:4px;">Fusion IMS – Inventory Management System v2.0.0</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    printWindow.onload = function() {
      printWindow.print();
    };
  };

  // ==================== HANDLE ROW CLICK ====================
  const handleRowClick = (log) => {
    setSelectedLog(log);
    setDetailModalOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        title="Audit Logs"
        description="Complete activity trail across the system"
      >
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExportExcel} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Export CSV
          </Button>
          <Button size="sm" variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button size="sm" variant="outline" onClick={() => { fetchLogs(); fetchStats(); }} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {STAT_CARDS.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stats[stat.key]}</p>
                </div>
                <div className={`p-2 rounded-xl ${stat.color}`}>
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          {/* Search Bar */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by user, description, or entity ID..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-9"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters({ ...filters, search: "" })}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-500 gap-1">
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          {/* Advanced Filters - Original Design */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
            <div>
              <Label className="text-xs text-gray-500 font-medium">Module</Label>
              <Select
                value={filters.module}
                onValueChange={(value) => setFilters({ ...filters, module: value })}
              >
                <SelectTrigger className="mt-1 h-9 text-sm bg-white">
                  <SelectValue placeholder="All Modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {filterOptions.modules.map((mod) => (
                    <SelectItem key={mod.value} value={mod.value}>
                      {mod.label} ({mod.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-gray-500 font-medium">Action</Label>
              <Select
                value={filters.action}
                onValueChange={(value) => setFilters({ ...filters, action: value })}
              >
                <SelectTrigger className="mt-1 h-9 text-sm bg-white">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {filterOptions.actions.map((action) => (
                    <SelectItem key={action.value} value={action.value}>
                      {action.label} ({action.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-gray-500 font-medium">User</Label>
              <Select
                value={filters.userId}
                onValueChange={(value) => setFilters({ ...filters, userId: value })}
              >
                <SelectTrigger className="mt-1 h-9 text-sm bg-white">
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {filterOptions.users.map((user) => (
                    <SelectItem key={user.value} value={user.value}>
                      {user.label} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-gray-500 font-medium">Role</Label>
              <Select
                value={filters.role}
                onValueChange={(value) => setFilters({ ...filters, role: value })}
              >
                <SelectTrigger className="mt-1 h-9 text-sm bg-white">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {filterOptions.roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 md:col-span-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-500 font-medium">From Date</Label>
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="mt-1 h-9 text-sm bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 font-medium">To Date</Label>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="mt-1 h-9 text-sm bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500 font-medium">Active Filters:</span>
              {filters.search && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  Search: {filters.search}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, search: "" })} />
                </Badge>
              )}
              {filters.module !== "all" && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  Module: {filterOptions.modules.find(m => m.value === filters.module)?.label || filters.module}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, module: "all" })} />
                </Badge>
              )}
              {filters.action !== "all" && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  Action: {filterOptions.actions.find(a => a.value === filters.action)?.label || filters.action}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, action: "all" })} />
                </Badge>
              )}
              {filters.userId !== "all" && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  User: {filterOptions.users.find(u => u.value === filters.userId)?.label || filters.userId}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, userId: "all" })} />
                </Badge>
              )}
              {filters.role !== "all" && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  Role: {filterOptions.roles.find(r => r.value === filters.role)?.label || filters.role}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, role: "all" })} />
                </Badge>
              )}
              {filters.startDate && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  From: {new Date(filters.startDate).toLocaleDateString()}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, startDate: "" })} />
                </Badge>
              )}
              {filters.endDate && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  To: {new Date(filters.endDate).toLocaleDateString()}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, endDate: "" })} />
                </Badge>
              )}
            </div>
          )}
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
                    <TableHead className="w-28 text-xs font-medium text-gray-500">Log ID</TableHead>
                    <TableHead className="text-xs font-medium text-gray-500">User / Role</TableHead>
                    <TableHead className="text-xs font-medium text-gray-500">Module</TableHead>
                    <TableHead className="text-xs font-medium text-gray-500">Action</TableHead>
                    <TableHead className="text-xs font-medium text-gray-500">Description</TableHead>
                    <TableHead className="text-xs font-medium text-gray-500">IP Address</TableHead>
                    <TableHead className="text-xs font-medium text-gray-500 whitespace-nowrap">Date & Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                        <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">No audit logs found</p>
                        <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => {
                      const userName = log.userName || "Unknown User";
                      const initials = getInitials(userName);
                      const initialsColor = getInitialsColor(userName);
                      const ModuleIcon = MODULE_ICONS[log.module] || Activity;
                      const role = log.userRole || "N/A";
                      const roleColor = {
                        ADMIN: "text-purple-600",
                        MANAGER: "text-blue-600",
                        STAFF: "text-green-600",
                      }[role] || "text-gray-500";

                      return (
                        <TableRow
                          key={log.id}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => handleRowClick(log)}
                        >
                          <TableCell className="font-mono text-xs font-medium text-gray-600">
                            {truncateLogId(log.id)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${initialsColor}`}>
                                {initials}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{userName}</p>
                                <p className={`text-xs font-medium ${roleColor}`}>{role}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <ModuleIcon className="h-3.5 w-3.5 text-gray-400" />
                              <span className="text-sm">{log.module || "N/A"}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getActionBadge(log.action)}</TableCell>
                          <TableCell>
                            <p className="text-sm truncate max-w-[200px]">
                              {log.description || "—"}
                            </p>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                              {formatIP(log.ipAddress)}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                            {formatDateTime(log.createdAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })
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
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} logs
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

      {/* Detail Modal */}
      <AuditLogDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        log={selectedLog}
      />
    </div>
  );
}