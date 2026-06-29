// src/pages/manager/ManagerNotifications.jsx
import { useEffect, useState, useCallback } from "react";
import { notificationsApi } from "@/api/index.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.jsx";
import { Separator } from "@/components/ui/separator.jsx";
import { Switch } from "@/components/ui/switch.jsx";
import {
  Bell,
  CheckCheck,
  Trash2,
  Mail,
  Search,
  X,
  AlertCircle,
  CreditCard,
  Package,
  Truck,
  ShoppingBag,
  Users,
  Settings,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Send,
  Clock,
  DollarSign,
  BellRing,
  Smartphone,
  Globe,
  Shield,
  TrendingUp,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, formatDate, formatDateTime } from "@/utils/helpers.js";

const NOTIFICATION_TYPES = [
  { value: "all", label: "All", icon: Bell, color: "text-gray-500" },
  { value: "LOW_STOCK", label: "Low Stock", icon: AlertCircle, color: "text-red-500" },
  { value: "CREDIT_DUE", label: "Credit Due", icon: CreditCard, color: "text-orange-500" },
  { value: "ORDER_UPDATE", label: "Order Update", icon: ShoppingBag, color: "text-blue-500" },
  { value: "SUPPLIER_DELAY", label: "Supplier Delay", icon: Truck, color: "text-yellow-500" },
  { value: "PAYMENT_RECEIVED", label: "Payment", icon: DollarSign, color: "text-green-500" },
  { value: "APPROVAL_REQUEST", label: "Approval", icon: Users, color: "text-purple-500" },
  { value: "SYSTEM_WARNING", label: "System", icon: Shield, color: "text-gray-500" },
  { value: "STOCK_ADJUSTMENT", label: "Stock Adjustment", icon: Package, color: "text-teal-500" },
  { value: "DELIVERY_UPDATE", label: "Delivery", icon: Truck, color: "text-cyan-500" },
  { value: "NEW_ORDER", label: "New Order", icon: ShoppingBag, color: "text-emerald-500" },
];

const PRIORITY_CONFIG = {
  CRITICAL: { label: "Critical", color: "bg-red-100 text-red-800 border-red-200", icon: AlertCircle },
  WARNING: { label: "Warning", color: "bg-amber-100 text-amber-800 border-amber-200", icon: AlertCircle },
  INFORMATION: { label: "Info", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Bell },
};

export default function ManagerNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    critical: 0,
    warning: 0,
    info: 0,
    last7Days: 0,
    emailSent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showPreferences, setShowPreferences] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1, limit: 20 });
  
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    inAppNotifications: true,
    lowStockAlerts: true,
    creditDueAlerts: true,
    supplierDelayAlerts: true,
    orderUpdates: true,
    systemWarnings: true,
    approvalRequests: true,
    stockAdjustments: true,
    deliveryUpdates: true,
    criticalAlerts: true,
    warningAlerts: true,
    infoAlerts: true,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(activeTab !== "all" && {
          ...(activeTab === "unread" && { isRead: "false" }),
          ...(activeTab === "read" && { isRead: "true" }),
          ...(activeTab === "critical" && { priority: "CRITICAL" }),
          ...(activeTab === "warning" && { priority: "WARNING" }),
          ...(activeTab === "info" && { priority: "INFORMATION" }),
        }),
        ...(typeFilter !== "all" && { type: typeFilter }),
        ...(priorityFilter !== "all" && { priority: priorityFilter }),
        ...(searchTerm && { search: searchTerm }),
      };
      const response = await notificationsApi.getAll(params);
      setNotifications(response.data.data || []);
      if (response.data.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (error) {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [activeTab, typeFilter, priorityFilter, searchTerm, pagination.page]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await notificationsApi.getStats();
      if (response.data.stats) {
        setStats(prev => ({ ...prev, ...response.data.stats }));
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, []);

  const fetchPreferences = useCallback(async () => {
    try {
      const response = await notificationsApi.getPreferences();
      if (response.data.data) {
        setPreferences(prev => ({ ...prev, ...response.data.data }));
      }
    } catch (error) {
      console.error("Failed to fetch preferences:", error);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchStats();
    fetchPreferences();
  }, [fetchNotifications, fetchStats, fetchPreferences]);

  const markAsRead = async (id) => {
    try {
      await notificationsApi.markAsRead(id);
      fetchNotifications();
      fetchStats();
      toast.success("Marked as read");
    } catch (error) {
      toast.error("Failed to mark as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      fetchNotifications();
      fetchStats();
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark all as read");
    }
  };

  const deleteNotification = async (id) => {
    try {
      await notificationsApi.delete(id);
      fetchNotifications();
      fetchStats();
      toast.success("Notification deleted");
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const deleteAllRead = async () => {
    if (!confirm("Delete all read notifications? This cannot be undone.")) return;
    try {
      await notificationsApi.deleteAllRead();
      fetchNotifications();
      fetchStats();
      toast.success("All read notifications deleted");
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const resendEmail = async (id) => {
    try {
      await notificationsApi.resendEmail(id);
      toast.success("Email resent successfully");
    } catch (error) {
      toast.error("Failed to resend email");
    }
  };

  const updatePreferences = async () => {
    setSavingPrefs(true);
    try {
      await notificationsApi.updatePreferences(preferences);
      toast.success("Preferences updated");
      setShowPreferences(false);
    } catch (error) {
      toast.error("Failed to update preferences");
    } finally {
      setSavingPrefs(false);
    }
  };

  const getTypeIcon = (type) => {
    const found = NOTIFICATION_TYPES.find(t => t.value === type);
    if (found) return { icon: found.icon, color: found.color };
    return { icon: Bell, color: "text-gray-500" };
  };

  const getPriorityBadge = (priority) => {
    const config = PRIORITY_CONFIG[priority];
    if (!config) return <Badge variant="outline">{priority}</Badge>;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} flex items-center gap-1 text-xs`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const tabs = [
    { id: "all", label: "All", icon: Bell, count: stats.total },
    { id: "unread", label: "Unread", icon: BellRing, count: stats.unread },
    { id: "read", label: "Read", icon: CheckCheck, count: stats.total - stats.unread },
    { id: "critical", label: "Critical", icon: AlertCircle, count: stats.critical },
    { id: "warning", label: "Warning", icon: AlertCircle, count: stats.warning },
    { id: "info", label: "Information", icon: Bell, count: stats.info },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600 mt-1">Real-time alerts, approvals, and system updates</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowPreferences(!showPreferences)}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Preferences
          </Button>
          <Button onClick={markAllAsRead} variant="outline" size="sm" className="gap-2">
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
          <Button onClick={deleteAllRead} variant="outline" size="sm" className="gap-2 text-red-600">
            <Trash2 className="h-4 w-4" />
            Clear read
          </Button>
          <Button onClick={fetchNotifications} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <p className="text-xs text-blue-600 font-medium">Total Sent</p>
            <p className="text-2xl font-bold text-blue-700">{stats.total || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <p className="text-xs text-green-600 font-medium">Emails Sent</p>
            <p className="text-2xl font-bold text-green-700">{stats.emailSent || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <p className="text-xs text-purple-600 font-medium">SMS Sent</p>
            <p className="text-2xl font-bold text-purple-700">0</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <p className="text-xs text-red-600 font-medium">Critical Alerts</p>
            <p className="text-2xl font-bold text-red-700">{stats.critical || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <p className="text-xs text-amber-600 font-medium">Last 7 Days</p>
            <p className="text-2xl font-bold text-amber-700">{stats.last7Days || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardContent className="p-4">
            <p className="text-xs text-indigo-600 font-medium">Unread</p>
            <p className="text-2xl font-bold text-indigo-700">{stats.unread || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Preferences Panel */}
      {showPreferences && (
        <Card className="border-2 border-emerald-200">
          <CardHeader className="pb-3 bg-emerald-50/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4 text-emerald-600" />
                Notification Preferences
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowPreferences(false)} className="h-7 w-7 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-5">
            {/* Channel Preferences */}
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Notification Channels</h4>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Email</span>
                  </div>
                  <Switch
                    checked={preferences.emailNotifications}
                    onCheckedChange={(val) => setPreferences({ ...preferences, emailNotifications: val })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-green-500" />
                    <span className="text-sm">SMS</span>
                  </div>
                  <Switch
                    checked={preferences.smsNotifications}
                    onCheckedChange={(val) => setPreferences({ ...preferences, smsNotifications: val })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">In-App</span>
                  </div>
                  <Switch
                    checked={preferences.inAppNotifications}
                    onCheckedChange={(val) => setPreferences({ ...preferences, inAppNotifications: val })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-amber-500" />
                    <span className="text-sm">Push</span>
                  </div>
                  <Switch
                    checked={preferences.pushNotifications}
                    onCheckedChange={(val) => setPreferences({ ...preferences, pushNotifications: val })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Alert Types */}
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Alert Configuration</h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm">Low Stock Alerts</span>
                  <Switch
                    checked={preferences.lowStockAlerts}
                    onCheckedChange={(val) => setPreferences({ ...preferences, lowStockAlerts: val })}
                  />
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm">Credit Due Alerts</span>
                  <Switch
                    checked={preferences.creditDueAlerts}
                    onCheckedChange={(val) => setPreferences({ ...preferences, creditDueAlerts: val })}
                  />
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm">Supplier Delay Alerts</span>
                  <Switch
                    checked={preferences.supplierDelayAlerts}
                    onCheckedChange={(val) => setPreferences({ ...preferences, supplierDelayAlerts: val })}
                  />
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm">Order Updates</span>
                  <Switch
                    checked={preferences.orderUpdates}
                    onCheckedChange={(val) => setPreferences({ ...preferences, orderUpdates: val })}
                  />
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm">System Warnings</span>
                  <Switch
                    checked={preferences.systemWarnings}
                    onCheckedChange={(val) => setPreferences({ ...preferences, systemWarnings: val })}
                  />
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm">Approval Requests</span>
                  <Switch
                    checked={preferences.approvalRequests}
                    onCheckedChange={(val) => setPreferences({ ...preferences, approvalRequests: val })}
                  />
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm">Stock Adjustments</span>
                  <Switch
                    checked={preferences.stockAdjustments}
                    onCheckedChange={(val) => setPreferences({ ...preferences, stockAdjustments: val })}
                  />
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm">Delivery Updates</span>
                  <Switch
                    checked={preferences.deliveryUpdates}
                    onCheckedChange={(val) => setPreferences({ ...preferences, deliveryUpdates: val })}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button variant="outline" onClick={() => setShowPreferences(false)}>Cancel</Button>
              <Button onClick={updatePreferences} disabled={savingPrefs} className="bg-emerald-600">
                {savingPrefs ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters Section */}
      <Card>
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700 gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                    <Badge variant="secondary" className="text-xs ml-1">
                      {tab.count}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          <Separator className="my-4" />

          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              {NOTIFICATION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="all">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="WARNING">Warning</option>
              <option value="INFORMATION">Information</option>
            </select>

            {(typeFilter !== "all" || priorityFilter !== "all" || searchTerm) && (
              <Button variant="ghost" size="sm" onClick={() => {
                setTypeFilter("all");
                setPriorityFilter("all");
                setSearchTerm("");
              }} className="text-gray-500">
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin text-gray-400" />
              <p>Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No notifications found</p>
              <p className="text-sm mt-1">Try changing your filters</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => {
                const { icon: Icon, color: iconColor } = getTypeIcon(notification.type);
                const isUnread = !notification.isRead;
                
                return (
                  <div key={notification.id} className={`p-5 transition-colors ${isUnread ? "bg-emerald-50/30 hover:bg-emerald-50/50" : "hover:bg-gray-50"}`}>
                    <div className="flex items-start gap-4">
                      <div className="mt-1 shrink-0">
                        <Icon className={`h-5 w-5 ${iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className={`text-sm font-medium ${isUnread ? "text-gray-900" : "text-gray-700"}`}>
                            {notification.title}
                          </h3>
                          {getPriorityBadge(notification.priority)}
                          <Badge variant="outline" className="text-xs">
                            {notification.type?.replace(/_/g, " ")}
                          </Badge>
                          {notification.emailSent && (
                            <Badge variant="outline" className="text-xs text-green-600 gap-1">
                              <Mail className="h-3 w-3" />
                              Email sent
                            </Badge>
                          )}
                          {isUnread && <Badge className="bg-emerald-100 text-emerald-700 text-xs">New</Badge>}
                        </div>
                        <p className="text-sm text-gray-600 mb-2 leading-relaxed">{notification.message}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(notification.createdAt)} ago
                          </span>
                          <span>{formatDate(notification.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {!notification.isRead && (
                          <Button size="sm" variant="ghost" onClick={() => markAsRead(notification.id)} className="h-8 w-8 p-0" title="Mark as read">
                            <CheckCheck className="h-4 w-4 text-emerald-500" />
                          </Button>
                        )}
                        {!notification.emailSent && (
                          <Button size="sm" variant="ghost" onClick={() => resendEmail(notification.id)} className="h-8 w-8 p-0" title="Resend email">
                            <Send className="h-4 w-4 text-green-500" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => deleteNotification(notification.id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-600" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })} disabled={pagination.page === 1}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <span className="px-3 py-1 text-sm bg-gray-100 rounded-md">Page {pagination.page} of {pagination.pages}</span>
            <Button variant="outline" size="sm" onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })} disabled={pagination.page === pagination.pages}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}