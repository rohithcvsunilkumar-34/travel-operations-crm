'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, CalendarCheck, Truck, Package as PackageIcon, Menu,
  ChevronLeft, ChevronRight, RefreshCw, Download, FileText, CalendarDays, LogOut, Bell
} from 'lucide-react';
import Sidebar from './Sidebar';
import KPICard from './KPICard';
import DailyTaskWidget from './DailyTaskWidget';
import PackagesTab from './PackagesTab';
import FleetTab from './FleetTab';
import HotelsTab from './HotelsTab';
import CabVendorsTab from './CabVendorsTab';
import CleanupTab from './CleanupTab';
import FinancialAnalyticsWidget from './FinancialAnalyticsWidget';
import Toast, { ToastMessage } from './Toast';
import CustomReportModal from './CustomReportModal';
import NotificationCenter from './NotificationCenter';
import PackageDetailsModal from './PackageDetailsModal';
import * as XLSX from 'xlsx';
import { exportMasterReportPDF } from '@/lib/pdfExport';

interface KPIData {
  checkInsToday: number;
  vehiclesRunningToday: number;
  totalGuestsOnGround: number;
  upcomingPackages: number;
}

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDisplayDate(isoDate: string): string {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showCustomReportModal, setShowCustomReportModal] = useState(false);
  const [selectedNotifPackage, setSelectedNotifPackage] = useState<any | null>(null);
  const [showNotifPackageModal, setShowNotifPackageModal] = useState(false);
  const [urgentAlerts, setUrgentAlerts] = useState<any[]>([]);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const fetchUrgentAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.notifications)) {
          const urgents = data.notifications.filter(
            (n: any) => n.stage === 'today' || n.stage === '1_day' || n.stage === '3_days'
          );
          setUrgentAlerts(urgents);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchUrgentAlerts();
  }, [fetchUrgentAlerts]);

  const handleOpenNotificationPackage = async (packageId: string) => {
    try {
      const res = await fetch(`/api/packages/${packageId}`);
      if (res.ok) {
        const pkgData = await res.json();
        setSelectedNotifPackage(pkgData);
        setShowNotifPackageModal(true);
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to load package details' });
    }
  };

  const addToast = useCallback((msg: Omit<ToastMessage, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...msg, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchKPI = useCallback(async () => {
    setKpiLoading(true);
    try {
      const res = await fetch(`/api/kpi?date=${selectedDate}`);
      if (res.ok) {
        setKpi(await res.json());
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to load dashboard stats' });
    } finally {
      setKpiLoading(false);
    }
  }, [selectedDate, addToast]);

  useEffect(() => {
    fetchKPI();
  }, [fetchKPI]);

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to sign out of the CRM?')) return;
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/login';
    }
  };

  const downloadFullReport = async () => {
    try {
      addToast({ type: 'warning', message: 'Generating full report...' });

      // Fetch all packages
      const pkgRes = await fetch('/api/packages?sort=asc');
      const packages = pkgRes.ok ? await pkgRes.json() : [];

      // Fetch all vehicle logs
      const vehRes = await fetch('/api/vehicles?sort=asc');
      const vehicles = vehRes.ok ? await vehRes.json() : [];

      const wb = XLSX.utils.book_new();

      // Sheet 1: Packages
      const sheet1Data = packages.map((p: {
        bookingId: string;
        guestName: string;
        contactNumber: string;
        agencyName: string;
        totalPax: number;
        checkInDate: string;
        checkOutDate: string;
        totalDays: string;
        hotelDetails: string;
        packageAmount: number;
        advancePaid: number;
        balancePending: number;
        status: string;
        dailyLogs: Array<{ dayNumber: number; date: string; placesVisited: string; hotelStayed: string; dailyRemarks: string }>;
      }) => ({
        'Booking ID': p.bookingId,
        'Guest Name': p.guestName,
        'Contact': p.contactNumber,
        'Agency': p.agencyName,
        'Pax': p.totalPax,
        'Check-in': p.checkInDate ? new Date(p.checkInDate).toLocaleDateString('en-IN') : '',
        'Check-out': p.checkOutDate ? new Date(p.checkOutDate).toLocaleDateString('en-IN') : '',
        'Duration': p.totalDays,
        'Hotels': p.hotelDetails,
        'Package Amount (₹)': p.packageAmount,
        'Advance Paid (₹)': p.advancePaid,
        'Balance Pending (₹)': p.balancePending,
        'Status': p.status,
        'Daily Itinerary': (p.dailyLogs || [])
          .map((l: { dayNumber: number; date: string; placesVisited: string; hotelStayed: string; dailyRemarks: string }) =>
            `Day ${l.dayNumber}: ${l.placesVisited || '—'} | ${l.hotelStayed || '—'}`
          )
          .join(' | '),
      }));

      const ws1 = XLSX.utils.json_to_sheet(sheet1Data.length > 0 ? sheet1Data : [{ 'Info': 'No packages found' }]);
      ws1['!cols'] = [
        { wch: 12 }, { wch: 22 }, { wch: 15 }, { wch: 18 }, { wch: 6 },
        { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 30 }, { wch: 16 },
        { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 50 },
      ];
      XLSX.utils.book_append_sheet(wb, ws1, 'Packages & Daily Logs');

      // Sheet 2: Fleet logs
      const sheet2Data = vehicles.map((v: {
        operationDate: string;
        packageId: string;
        guestName: string;
        paxInVehicle: number;
        vehicleType: string;
        vehicleNumber: string;
        vendorName: string;
        driverName: string;
        driverPhone: string;
        dutyRoute: string;
        remarks: string;
      }) => ({
        'Date': v.operationDate ? new Date(v.operationDate).toLocaleDateString('en-IN') : '',
        'Booking ID': v.packageId || '—',
        'Guest Name': v.guestName,
        'Pax': v.paxInVehicle,
        'Vehicle Type': v.vehicleType,
        'Vehicle No.': v.vehicleNumber || '—',
        'Vendor Name': v.vendorName,
        'Driver Name': v.driverName,
        'Driver Phone': v.driverPhone,
        'Duty Route': v.dutyRoute,
        'Remarks': v.remarks,
      }));

      const ws2 = XLSX.utils.json_to_sheet(sheet2Data.length > 0 ? sheet2Data : [{ 'Info': 'No fleet logs found' }]);
      ws2['!cols'] = [
        { wch: 14 }, { wch: 12 }, { wch: 22 }, { wch: 6 }, { wch: 15 },
        { wch: 14 }, { wch: 20 }, { wch: 18 }, { wch: 14 }, { wch: 30 }, { wch: 25 },
      ];
      XLSX.utils.book_append_sheet(wb, ws2, 'Daily Fleet Logs');

      const dateStr = new Date().toLocaleDateString('en-IN').replace(/\//g, '-');
      XLSX.writeFile(wb, `TravelCRM_MasterReport_${dateStr}.xlsx`);
      addToast({ type: 'success', message: 'Master report downloaded!' });
    } catch {
      addToast({ type: 'error', message: 'Failed to generate report' });
    }
  };

  const downloadFullReportPDF = async () => {
    try {
      addToast({ type: 'info', message: 'Generating Master PDF Report...' });
      const [pkgRes, vehRes] = await Promise.all([
        fetch('/api/packages?sort=asc'),
        fetch('/api/vehicles?sort=asc'),
      ]);
      const packages = pkgRes.ok ? await pkgRes.json() : [];
      const vehicles = vehRes.ok ? await vehRes.json() : [];
      exportMasterReportPDF(packages, vehicles, kpi, selectedDate);
      addToast({ type: 'success', message: 'Master PDF report opened!' });
    } catch {
      addToast({ type: 'error', message: 'Failed to generate PDF report' });
    }
  };

  const isToday = selectedDate === getTodayISO();

  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-100 px-4 lg:px-6 py-3 flex-shrink-0 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={20} className="text-gray-600" />
              </button>
              <div>
                <h1 className="font-heading font-bold text-gray-900 text-lg leading-tight">
                  {activeTab === 'dashboard' && 'Operations Command Center'}
                  {activeTab === 'packages' && 'Packages & Guest CRM'}
                  {activeTab === 'fleet' && 'Daily Fleet Tracker'}
                  {activeTab === 'cleanup' && 'Data Storage & Cleanup'}
                </h1>
                {activeTab === 'dashboard' && (
                  <p className="text-xs text-gray-400">Live operations overview for your selected date</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Date Navigator (only on dashboard) */}
              {activeTab === 'dashboard' && (
                <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1">
                  <button
                    onClick={() => setSelectedDate((d) => addDays(d, -1))}
                    className="p-1 rounded-lg hover:bg-gray-200 transition-colors"
                    title="Previous day"
                  >
                    <ChevronLeft size={16} className="text-gray-600" />
                  </button>
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-2 py-1 text-sm font-medium text-gray-800 bg-transparent border-none focus:outline-none cursor-pointer"
                  />
                  <button
                    onClick={() => setSelectedDate((d) => addDays(d, 1))}
                    className="p-1 rounded-lg hover:bg-gray-200 transition-colors"
                    title="Next day"
                  >
                    <ChevronRight size={16} className="text-gray-600" />
                  </button>
                </div>
              )}

              {!isToday && activeTab === 'dashboard' && (
                <button
                  onClick={() => setSelectedDate(getTodayISO())}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
                  style={{ backgroundColor: '#FF9F1C', color: 'white' }}
                >
                  Today
                </button>
              )}

              {activeTab === 'dashboard' && (
                <button
                  onClick={fetchKPI}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
                  title="Refresh"
                >
                  <RefreshCw size={16} />
                </button>
              )}

              <button
                onClick={() => setShowCustomReportModal(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white rounded-xl transition-opacity hover:opacity-90 shadow-sm"
                style={{ backgroundColor: '#FF9F1C' }}
                title="Download PDF/Excel by Month Name, Custom Date Range, or Guest Name"
              >
                <CalendarDays size={14} />
                Custom Month/Range Report
              </button>

              <button
                onClick={downloadFullReportPDF}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white rounded-xl transition-opacity hover:opacity-90 shadow-sm"
                style={{ backgroundColor: '#DC2626' }}
                title="Download Master Operations PDF Report"
              >
                <FileText size={14} />
                Master PDF
              </button>

              <button
                onClick={downloadFullReport}
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white rounded-xl transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#0B192C' }}
                title="Download Master Excel (.xlsx) Report"
              >
                <Download size={14} />
                Excel Report
              </button>

              {/* In-App Check-in Notifications Center */}
              <NotificationCenter
                onOpenPackageDetails={handleOpenNotificationPackage}
                onNavigateToPackages={() => setActiveTab('packages')}
              />

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 hover:text-red-600 bg-gray-100 hover:bg-red-50 rounded-xl transition-colors border border-gray-200"
                title="Sign out of CRM"
              >
                <LogOut size={14} />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main scrollable content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" style={{ backgroundColor: '#F8FAFC' }}>
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Urgent Arrivals Alert Banner */}
              {urgentAlerts.length > 0 && (
                <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200 border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 shadow-inner">
                      <Bell size={20} className="text-white animate-bounce" />
                    </div>
                    <div>
                      <div className="font-bold text-sm tracking-tight flex items-center gap-2">
                        <span>🚨 Operational Alert:</span>
                        <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-semibold">
                          {urgentAlerts.length} Upcoming Arrival{urgentAlerts.length > 1 ? 's' : ''} Require Attention!
                        </span>
                      </div>
                      <div className="text-xs text-white/90 mt-0.5">
                        {urgentAlerts
                          .map((u) => `${u.guestName} (${u.badge})`)
                          .slice(0, 3)
                          .join(' • ')}
                        {urgentAlerts.length > 3 ? ` • +${urgentAlerts.length - 3} more` : ''}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('packages')}
                    className="px-3.5 py-1.5 rounded-xl bg-white text-gray-900 font-bold text-xs shadow hover:bg-slate-100 transition-colors whitespace-nowrap self-end sm:self-auto"
                  >
                    View Packages &rarr;
                  </button>
                </div>
              )}

              {/* Date Display Banner */}
              <div
                className="rounded-2xl px-6 py-4 flex items-center justify-between"
                style={{ backgroundColor: '#0B192C' }}
              >
                <div>
                  <div className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">
                    Viewing Operations For
                  </div>
                  <div className="text-white font-heading font-bold text-xl">
                    {formatDisplayDate(selectedDate)}
                  </div>
                  {isToday && (
                    <span className="mt-1 inline-block text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FF9F1C', color: 'white' }}>
                      TODAY
                    </span>
                  )}
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <button
                    onClick={() => setSelectedDate((d) => addDays(d, -1))}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => setSelectedDate(getTodayISO())}
                    className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                    style={{ backgroundColor: '#FF9F1C', color: 'white' }}
                  >
                    Jump to Today
                  </button>
                  <button
                    onClick={() => setSelectedDate((d) => addDays(d, 1))}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <KPICard
                  title="Check-ins Today"
                  value={kpi?.checkInsToday ?? 0}
                  icon={CalendarCheck}
                  color="#FF9F1C"
                  subtitle="Packages arriving today"
                  loading={kpiLoading}
                />
                <KPICard
                  title="Vehicles Running"
                  value={kpi?.vehiclesRunningToday ?? 0}
                  icon={Truck}
                  color="#0B192C"
                  subtitle="Cabs deployed today"
                  loading={kpiLoading}
                />
                <KPICard
                  title="Guests on Ground"
                  value={kpi?.totalGuestsOnGround ?? 0}
                  icon={Users}
                  color="#6366f1"
                  subtitle="Total active pax today"
                  loading={kpiLoading}
                />
                <KPICard
                  title="Upcoming Packages"
                  value={kpi?.upcomingPackages ?? 0}
                  icon={PackageIcon}
                  color="#22c55e"
                  subtitle="Packages after today"
                  loading={kpiLoading}
                />
              </div>

              {/* Dedicated Financial Overview Chart Widget */}
              <FinancialAnalyticsWidget />

              {/* Bottom section: Tasks + Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Daily Tasks Widget */}
                <div className="lg:col-span-2">
                  <DailyTaskWidget selectedDate={selectedDate} addToast={addToast} />
                </div>

                {/* Quick Nav Cards */}
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <h3 className="font-heading font-semibold text-gray-800 mb-4 text-sm">Quick Actions</h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => setActiveTab('packages')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors hover:opacity-90"
                        style={{ backgroundColor: '#FF9F1C' }}
                      >
                        <PackageIcon size={18} className="text-white" />
                        <span className="text-sm font-semibold text-white">Manage Packages</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('fleet')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors hover:opacity-90"
                        style={{ backgroundColor: '#0B192C' }}
                      >
                        <Truck size={18} className="text-white" />
                        <span className="text-sm font-semibold text-white">Log Vehicle</span>
                      </button>
                      <button
                        onClick={() => setShowCustomReportModal(true)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left bg-amber-50 hover:bg-amber-100 transition-colors border border-amber-200/70"
                      >
                        <CalendarDays size={18} className="text-amber-600" />
                        <span className="text-sm font-semibold text-amber-900">Custom Month / Range PDF</span>
                      </button>
                      <button
                        onClick={downloadFullReportPDF}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left bg-red-50 hover:bg-red-100 transition-colors border border-red-200/60"
                      >
                        <FileText size={18} className="text-red-600" />
                        <span className="text-sm font-semibold text-red-700">Download Master PDF</span>
                      </button>
                      <button
                        onClick={downloadFullReport}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        <Download size={18} className="text-gray-700" />
                        <span className="text-sm font-semibold text-gray-700">Download Master Excel</span>
                      </button>
                    </div>
                  </div>

                  {/* Date picker shortcut */}
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <h3 className="font-heading font-semibold text-gray-800 mb-3 text-sm">Jump to Date</h3>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <button
                      onClick={() => setSelectedDate(getTodayISO())}
                      className="w-full mt-2 px-3 py-2 text-sm font-semibold rounded-lg transition-colors hover:opacity-90"
                      style={{ backgroundColor: '#0B192C', color: 'white' }}
                    >
                      Reset to Today
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Packages Tab */}
          {activeTab === 'packages' && (
            <PackagesTab addToast={addToast} />
          )}

          {/* Fleet Tab */}
          {activeTab === 'fleet' && (
            <FleetTab addToast={addToast} defaultDate={selectedDate} />
          )}

          {/* Hotels Tab */}
          {activeTab === 'hotels' && (
            <HotelsTab addToast={addToast} onViewPackage={handleOpenNotificationPackage} />
          )}

          {/* Cab Vendors Tab */}
          {activeTab === 'vendors' && (
            <CabVendorsTab addToast={addToast} />
          )}

          {/* Cleanup Tab */}
          {activeTab === 'cleanup' && (
            <CleanupTab addToast={addToast} />
          )}
        </main>
      </div>

      {/* Custom Report (Month / Range / Name) Modal */}
      <CustomReportModal
        isOpen={showCustomReportModal}
        onClose={() => setShowCustomReportModal(false)}
        addToast={addToast}
      />

      {/* Package Details Modal from In-App Notification click */}
      <PackageDetailsModal
        isOpen={showNotifPackageModal}
        onClose={() => {
          setShowNotifPackageModal(false);
          setSelectedNotifPackage(null);
        }}
        pkg={selectedNotifPackage}
      />
    </div>
  );
}
