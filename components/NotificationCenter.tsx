'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  X,
  Calendar,
  Users,
  Phone,
  Truck,
  IndianRupee,
  Eye,
  CheckCheck,
  RefreshCw,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { InAppNotification } from '@/lib/notificationService';

interface NotificationCenterProps {
  onOpenPackageDetails?: (packageId: string) => void;
  onNavigateToPackages?: () => void;
}

export default function NotificationCenter({
  onOpenPackageDetails,
  onNavigateToPackages,
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<'all' | 'urgent' | '3_days' | '7_days'>('all');
  const panelRef = useRef<HTMLDivElement>(null);

  // Load dismissed IDs from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('crm_dismissed_notifications');
      if (saved) {
        setDismissedIds(new Set(JSON.parse(saved)));
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        }
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const dismissNotification = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = new Set(dismissedIds);
    next.add(id);
    setDismissedIds(next);
    try {
      localStorage.setItem('crm_dismissed_notifications', JSON.stringify(Array.from(next)));
    } catch {
      // ignore
    }
  };

  const clearAllNotifications = () => {
    const next = new Set(dismissedIds);
    notifications.forEach((n) => next.add(n.id));
    setDismissedIds(next);
    try {
      localStorage.setItem('crm_dismissed_notifications', JSON.stringify(Array.from(next)));
    } catch {
      // ignore
    }
  };

  // Active un-dismissed notifications
  const activeNotifications = notifications.filter((n) => !dismissedIds.has(n.id));

  const filteredNotifications = activeNotifications.filter((n) => {
    if (activeFilter === 'urgent') return n.stage === '1_day' || n.stage === 'today';
    if (activeFilter === '3_days') return n.stage === '3_days';
    if (activeFilter === '7_days') return n.stage === '7_days';
    return true;
  });

  const urgentCount = activeNotifications.filter((n) => n.severity === 'urgent').length;
  const unreadCount = activeNotifications.length;

  const formatDate = (isoStr: string) => {
    if (!isoStr) return '—';
    try {
      return new Date(isoStr).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all border border-gray-200/80 bg-white shadow-sm flex items-center justify-center"
        title="Check-in Notifications & Alerts"
        aria-label="Notifications"
      >
        <Bell size={18} className={urgentCount > 0 ? 'text-red-600 animate-wiggle' : 'text-gray-600'} />

        {unreadCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-md ${
              urgentCount > 0 ? 'bg-red-600 animate-pulse' : 'bg-amber-500'
            }`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-[380px] sm:w-[440px] max-w-[95vw] bg-white rounded-3xl shadow-2xl border border-gray-100 z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-150"
          style={{ fontFamily: 'Inter, sans-serif', maxHeight: '82vh' }}
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-slate-950 via-[#0B192C] to-slate-900 text-white flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Bell size={16} />
              </div>
              <div>
                <h3 className="font-heading font-bold text-sm text-white leading-tight">
                  Check-in Notifications
                </h3>
                <p className="text-[11px] text-white/60">
                  Upcoming arrivals (1 week, 3 days, tomorrow)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={fetchNotifications}
                disabled={loading}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Refresh notifications"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-gray-100 flex items-center justify-between gap-1 overflow-x-auto text-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  activeFilter === 'all'
                    ? 'bg-[#0B192C] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-200/70'
                }`}
              >
                All ({activeNotifications.length})
              </button>
              <button
                onClick={() => setActiveFilter('urgent')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                  activeFilter === 'urgent'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-red-700 bg-red-50 hover:bg-red-100'
                }`}
              >
                <span>🚨 Urgent</span>
                {urgentCount > 0 && <span className="text-[10px]">({urgentCount})</span>}
              </button>
              <button
                onClick={() => setActiveFilter('3_days')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  activeFilter === '3_days'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                }`}
              >
                ⏰ 3 Days
              </button>
              <button
                onClick={() => setActiveFilter('7_days')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  activeFilter === '7_days'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-blue-700 bg-blue-50 hover:bg-blue-100'
                }`}
              >
                📅 1 Week
              </button>
            </div>

            {activeNotifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="text-[11px] font-semibold text-gray-400 hover:text-gray-700 whitespace-nowrap pl-2 transition-colors"
                title="Dismiss all active notifications"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Notification Items List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-gray-50 max-h-[58vh]">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-2 border border-green-200/50">
                  <CheckCheck size={24} />
                </div>
                <h4 className="font-bold text-gray-800 text-sm">All caught up!</h4>
                <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                  {activeFilter === 'all'
                    ? 'No upcoming package check-in alerts for the next 7 days.'
                    : `No notifications matching the "${activeFilter}" filter.`}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const isUrgent = notif.severity === 'urgent';
                const is3Days = notif.stage === '3_days';

                return (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (onOpenPackageDetails) {
                        onOpenPackageDetails(notif.packageId);
                        setIsOpen(false);
                      }
                    }}
                    className={`pt-2.5 first:pt-0 p-3 rounded-2xl transition-all cursor-pointer border ${
                      isUrgent
                        ? 'bg-red-50/40 hover:bg-red-50/80 border-red-100'
                        : is3Days
                        ? 'bg-amber-50/40 hover:bg-amber-50/80 border-amber-100'
                        : 'bg-white hover:bg-slate-50 border-gray-100'
                    }`}
                  >
                    {/* Top Row: Stage Badge + Booking ID + Dismiss */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            isUrgent
                              ? 'bg-red-600 text-white'
                              : is3Days
                              ? 'bg-amber-500 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {isUrgent && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                          {notif.badge}
                        </span>

                        <span className="font-mono text-xs font-semibold text-gray-500 bg-white/80 px-1.5 py-0.5 rounded border border-gray-200">
                          {notif.bookingId}
                        </span>
                      </div>

                      <button
                        onClick={(e) => dismissNotification(notif.id, e)}
                        className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors"
                        title="Dismiss notification"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Guest Name & Check-in Date */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">
                          {notif.guestName}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} className="text-gray-400" />
                            Check-in: <strong>{formatDate(notif.checkInDate)}</strong>
                          </span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1">
                            <Users size={12} className="text-gray-400" />
                            {notif.totalPax} Pax
                          </span>
                        </div>
                      </div>

                      {notif.contactNumber && (
                        <a
                          href={`tel:${notif.contactNumber}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors flex items-center gap-1 text-xs font-semibold"
                          title="Call guest"
                        >
                          <Phone size={12} />
                          <span className="hidden sm:inline">Call</span>
                        </a>
                      )}
                    </div>

                    {/* Operational Badges (Fleet & Balance) */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                      {notif.fleetAssigned ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/60">
                          <Truck size={11} />
                          {notif.fleetSummary}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100/70 text-amber-800 font-bold border border-amber-300/60 animate-pulse">
                          <AlertTriangle size={11} />
                          Cab Pending
                        </span>
                      )}

                      {notif.balancePending > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold border border-rose-200">
                          <IndianRupee size={11} />
                          ₹{notif.balancePending.toLocaleString('en-IN')} Due
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                          Paid
                        </span>
                      )}

                      <span className="text-gray-400 text-[10px] ml-auto">
                        via {notif.agencyName}
                      </span>
                    </div>

                    {/* View Details Hint */}
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-blue-600 font-semibold">
                      <span>Click to view tour voucher & fleet &rarr;</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Showing {filteredNotifications.length} of {activeNotifications.length} alerts
            </span>
            {onNavigateToPackages && (
              <button
                onClick={() => {
                  onNavigateToPackages();
                  setIsOpen(false);
                }}
                className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Go to Packages Table &rarr;
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
