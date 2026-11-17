import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, Clock, ExternalLink, ShieldAlert, CheckCircle2, MessageSquare, AlertTriangle } from 'lucide-react';
import { notificationAPI } from '../../services/api';

export const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationAPI.list({ limit: 15 });
      if (res.data?.success) {
        setNotifications(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s polling
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

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async (id) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'APPLICATION_APPROVED':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />;
      case 'CLARIFICATION_REQUESTED':
        return <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />;
      case 'APPLICATION_REJECTED':
        return <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />;
      case 'CLARIFICATION_RESPONDED':
        return <MessageSquare className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />;
      default:
        return <Clock className="h-4 w-4 text-brand-deep-sage shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 text-stone-500 hover:text-brand-deep-sage hover:bg-stone-100 rounded-md transition-colors"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-amber text-[10px] font-bold text-white shadow">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg bg-white shadow-xl border border-stone-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between border-b border-stone-200 bg-brand-cream/40 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-brand-charcoal">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded bg-brand-pale-sage px-1.5 py-0.5 text-[10px] font-semibold text-brand-deep-sage">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[11px] font-semibold text-brand-deep-sage hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-stone-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400">
                No notifications yet.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                  className={`p-3.5 text-xs transition-colors cursor-pointer hover:bg-stone-50 flex items-start gap-3 ${
                    notif.is_read ? 'bg-white opacity-75' : 'bg-brand-pale-sage/20'
                  }`}
                >
                  {getTypeIcon(notif.notification_type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-semibold text-brand-charcoal truncate">{notif.title}</p>
                      {!notif.is_read && (
                        <span className="h-2 w-2 rounded-full bg-brand-amber shrink-0" />
                      )}
                    </div>
                    <p className="text-stone-600 text-[11px] mt-0.5 leading-snug line-clamp-2">
                      {notif.message}
                    </p>
                    {notif.reference_id && (
                      <span className="inline-block mt-1 font-mono text-[10px] text-brand-deep-sage bg-brand-pale-sage/50 px-1 rounded">
                        Ref: {notif.reference_id}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
