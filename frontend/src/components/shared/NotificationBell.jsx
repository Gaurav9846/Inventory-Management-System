// src/components/manager/NotificationBell.jsx
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { notificationsApi } from "@/api/index.js";
import { Button } from "@/components/ui/button.jsx";
import { Bell, BellRing, CheckCheck, X, AlertCircle, CreditCard, Package, Truck, ShoppingBag, Users, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "@/utils/helpers.js";

const getNotificationIcon = (type, priority) => {
  const iconClass = priority === 'CRITICAL' ? 'text-red-500' : 
                    priority === 'WARNING' ? 'text-amber-500' : 'text-blue-500';
  
  switch(type) {
    case 'LOW_STOCK': return <AlertCircle className={`h-4 w-4 ${iconClass}`} />;
    case 'CREDIT_DUE': return <CreditCard className={`h-4 w-4 ${iconClass}`} />;
    case 'ORDER_UPDATE': return <ShoppingBag className={`h-4 w-4 ${iconClass}`} />;
    case 'DELIVERY_UPDATE': return <Truck className={`h-4 w-4 ${iconClass}`} />;
    case 'APPROVAL_REQUEST': return <Users className={`h-4 w-4 ${iconClass}`} />;
    case 'PAYMENT_RECEIVED': return <Mail className={`h-4 w-4 ${iconClass}`} />;
    case 'SUPPLIER_DELAY': return <Truck className={`h-4 w-4 ${iconClass}`} />;
    default: return <Bell className={`h-4 w-4 ${iconClass}`} />;
  }
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await notificationsApi.getAll({ limit: 10 });
      setNotifications(response.data.data || []);
      setUnreadCount(response.data.stats?.unreadCount || 0);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  const markAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationsApi.markAsRead(id);
      fetchNotifications();
    } catch (error) {
      toast.error("Failed to mark as read");
    }
  };

  const markAllAsRead = async (e) => {
    e.stopPropagation();
    try {
      await notificationsApi.markAllAsRead();
      toast.success("All notifications marked as read");
      fetchNotifications();
    } catch (error) {
      toast.error("Failed to mark all as read");
    }
  };

  const deleteNotification = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationsApi.delete(id);
      fetchNotifications();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      notificationsApi.markAsRead(notification.id).catch(console.error);
    }
    setIsOpen(false);
    if (notification.type === 'LOW_STOCK') {
      navigate('/manager/low-stock');
    } else if (notification.type === 'APPROVAL_REQUEST') {
      navigate('/manager/stock-adjustments');
    } else if (notification.type === 'CREDIT_DUE') {
      navigate('/manager/credit');
    } else {
      navigate('/manager/notifications');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-8 w-8 rounded-full hover:bg-white/10"
        onClick={() => setIsOpen(!isOpen)}
      >
        {unreadCount > 0 ? (
          <BellRing className="h-4 w-4 text-amber-400" />
        ) : (
          <Bell className="h-4 w-4 text-slate-400" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                <Bell className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`px-4 py-3 border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50 ${
                    !notification.isRead ? 'bg-emerald-50/30' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getNotificationIcon(notification.type, notification.priority)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.isRead ? 'font-semibold' : 'font-normal'} text-slate-800`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {formatDistanceToNow(notification.createdAt)} ago
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {!notification.isRead && (
                        <button
                          onClick={(e) => markAsRead(notification.id, e)}
                          className="text-slate-400 hover:text-emerald-500 transition-colors"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => deleteNotification(notification.id, e)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 text-center">
            <button
              onClick={() => {
                navigate('/manager/notifications');
                setIsOpen(false);
              }}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              View all notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}