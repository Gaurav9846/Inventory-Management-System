// src/pages/Alerts.jsx - Updated to use notificationsApi
import { useEffect, useState, useCallback } from "react";
import { notificationsApi } from "@/api/index.js"; // Changed from alertsApi
import { PageHeader } from "@/components/shared/PageHeader.jsx";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner.jsx";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { AlertTriangle, Bell, BellOff, Trash2, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { timeAgo } from "@/utils/helpers.js";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterUnread, setFilterUnread] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // Only get LOW_STOCK type notifications
      const params = { 
        type: "LOW_STOCK",
        ...(filterUnread && { isRead: "false" })
      };
      const { data } = await notificationsApi.getAll(params);
      setAlerts(data.data || []);
    } catch { 
      toast.error("Failed to load alerts."); 
    }
    finally { 
      setLoading(false); 
    }
  }, [filterUnread]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const markRead = async (id) => {
    try { 
      await notificationsApi.markAsRead(id); 
      fetchAll(); 
    }
    catch { toast.error("Failed to mark as read."); }
  };

  const markAll = async () => {
    try { 
      await notificationsApi.markAllAsRead(); 
      toast.success("All alerts marked as read."); 
      fetchAll(); 
    }
    catch { toast.error("Failed to mark all as read."); }
  };

  const deleteAlert = async (id) => {
    try { 
      await notificationsApi.delete(id); 
      toast.success("Alert dismissed."); 
      fetchAll(); 
    }
    catch { toast.error("Failed to dismiss alert."); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Alerts" description="Low stock notifications and system alerts">
        <div className="flex items-center gap-2">
          <Button variant={filterUnread ? "default" : "outline"} size="sm" onClick={() => setFilterUnread(true)}>
            <Bell className="h-4 w-4" /> Unread
          </Button>
          <Button variant={filterUnread ? "outline" : "default"} size="sm" onClick={() => setFilterUnread(false)}>
            <BellOff className="h-4 w-4" /> All
          </Button>
          {alerts.length > 0 && filterUnread && (
            <Button variant="outline" size="sm" onClick={markAll}>
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          )}
        </div>
      </PageHeader>

      {loading ? <LoadingSpinner /> : (
        <div className="space-y-3">
          {!alerts.length ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <Bell className="h-10 w-10 opacity-30" />
                <p className="text-sm">{filterUnread ? "No unread alerts. All caught up!" : "No alerts found."}</p>
              </CardContent>
            </Card>
          ) : alerts.map((alert) => (
            <Card key={alert.id} className={alert.isRead ? "opacity-60" : "border-orange-200 bg-orange-50/50"}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 shrink-0 mt-0.5">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground leading-snug">{alert.message}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <p className="text-xs text-muted-foreground">{timeAgo(alert.createdAt)}</p>
                        {!alert.isRead && <Badge variant="warning" className="bg-orange-100 text-orange-700 text-xs">New</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!alert.isRead && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markRead(alert.id)}>
                          Mark read
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteAlert(alert.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}