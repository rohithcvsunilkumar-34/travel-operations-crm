'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, CalendarCheck, Truck, Package as PackageIcon, Menu,
  ChevronLeft, ChevronRight, RefreshCw, Download
} from 'lucide-react';
import Sidebar from './Sidebar';
import KPICard from './KPICard';
import DailyTaskWidget from './DailyTaskWidget';
import PackagesTab from './PackagesTab';
import FleetTab from './FleetTab';
import CleanupTab from './CleanupTab';
import Toast, { ToastMessage } from './Toast';
import * as XLSX from 'xlsx';

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
  const dateInputRef = useRef<HTMLInputElement>(null);

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
                onClick={downloadFullReport}
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white rounded-xl transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#0B192C' }}
              >
                <Download size={14} />
                Master Report
              </button>
            </div>
          </div>
        </header>

        {/* Main scrollable content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" style={{ backgroundColor: '#F8FAFC' }}>
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
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
                        onClick={downloadFullReport}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        <Download size={18} className="text-gray-700" />
                        <span className="text-sm font-semibold text-gray-700">Download Master Report</span>
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

          {/* Cleanup Tab */}
          {activeTab === 'cleanup' && (
            <CleanupTab addToast={addToast} />
          )}
        </main>
      </div>
    </div>
  );
}
