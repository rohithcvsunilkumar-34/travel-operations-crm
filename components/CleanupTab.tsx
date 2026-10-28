'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Trash2, ShieldCheck, Download, AlertTriangle, RefreshCw,
  HardDrive, Calendar, Database, CheckCircle, Clock,
  Cloud, CloudOff, ArrowUpRight, ArrowDownLeft, Loader2
} from 'lucide-react';
import { ToastMessage } from './Toast';
import * as XLSX from 'xlsx';

interface CleanupTabProps {
  addToast: (msg: Omit<ToastMessage, 'id'>) => void;
}

interface PackageItem {
  _id: string;
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
  dailyLogs: Array<{
    dayNumber: number;
    date: string;
    placesVisited: string;
    hotelStayed: string;
    dailyRemarks: string;
  }>;
}

interface VehicleItem {
  _id: string;
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
}

interface CleanupData {
  packages: PackageItem[];
  vehicleLogs: VehicleItem[];
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function CleanupTab({ addToast }: CleanupTabProps) {
  // Auto-purge state
  const [autoData, setAutoData] = useState<CleanupData>({ packages: [], vehicleLogs: [] });
  const [loadingAuto, setLoadingAuto] = useState(false);
  const [purgingAuto, setPurgingAuto] = useState(false);

  // Custom range state
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [rangeData, setRangeData] = useState<CleanupData | null>(null);
  const [loadingRange, setLoadingRange] = useState(false);
  const [purgingRange, setPurgingRange] = useState(false);

  // Overall database stats
  const [totalPackages, setTotalPackages] = useState<number>(0);
  const [totalVehicles, setTotalVehicles] = useState<number>(0);

  // Cloud Sync state
  const [syncStatus, setSyncStatus] = useState<{
    configured: boolean;
    connected: boolean;
    message?: string;
    cloudCounts?: { packages: number; vehicles: number; tasks: number };
  } | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const scanAutoPurge = useCallback(async () => {
    setLoadingAuto(true);
    try {
      const res = await fetch('/api/cleanup?mode=auto');
      if (res.ok) {
        const data = await res.json();
        setAutoData(data);
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to scan older records' });
    } finally {
      setLoadingAuto(false);
    }
  }, [addToast]);

  const fetchOverallStats = useCallback(async () => {
    try {
      const [pRes, vRes] = await Promise.all([
        fetch('/api/packages?sort=asc'),
        fetch('/api/vehicles?sort=asc'),
      ]);
      if (pRes.ok) {
        const pkgs = await pRes.json();
        setTotalPackages(pkgs.length);
      }
      if (vRes.ok) {
        const vehs = await vRes.json();
        setTotalVehicles(vehs.length);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchSyncStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/sync');
      if (res.ok) {
        setSyncStatus(await res.json());
      }
    } catch {
      // ignore
    }
  }, []);

  const triggerSync = async (direction: 'push' | 'pull') => {
    setSyncing(true);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast({
          type: 'success',
          message:
            direction === 'push'
              ? `Synced ${data.synced?.packages || 0} packages and ${data.synced?.vehicles || 0} vehicles to Cloud Atlas!`
              : `Restored ${data.synced?.packages || 0} packages and ${data.synced?.vehicles || 0} vehicles from Cloud Atlas!`,
        });
        fetchSyncStatus();
        fetchOverallStats();
      } else {
        addToast({ type: 'error', message: data.error || 'Sync failed' });
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to communicate with sync endpoint' });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    scanAutoPurge();
    fetchOverallStats();
    fetchSyncStatus();
  }, [scanAutoPurge, fetchOverallStats, fetchSyncStatus]);

  const generateAndDownloadExcel = (data: CleanupData, filename: string): boolean => {
    if (data.packages.length === 0 && data.vehicleLogs.length === 0) {
      return false;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Packages
    const sheet1Data = data.packages.map((p) => ({
      'Booking ID': p.bookingId,
      'Guest Name': p.guestName,
      'Contact': p.contactNumber,
      'Agency': p.agencyName,
      'Pax': p.totalPax,
      'Check-in': formatDate(p.checkInDate),
      'Check-out': formatDate(p.checkOutDate),
      'Duration': p.totalDays,
      'Hotels': p.hotelDetails,
      'Package Amount (₹)': p.packageAmount,
      'Advance Paid (₹)': p.advancePaid,
      'Balance Pending (₹)': p.balancePending,
      'Status': p.status,
      'Daily Itinerary': (p.dailyLogs || [])
        .map(
          (l) =>
            `Day ${l.dayNumber} (${formatDate(l.date)}): ${l.placesVisited || '—'} | Hotel: ${l.hotelStayed || '—'} | ${l.dailyRemarks || ''}`
        )
        .join(' | '),
    }));

    const ws1 = XLSX.utils.json_to_sheet(
      sheet1Data.length > 0 ? sheet1Data : [{ 'Status': 'No packages to purge' }]
    );
    ws1['!cols'] = [
      { wch: 12 },
      { wch: 22 },
      { wch: 15 },
      { wch: 18 },
      { wch: 6 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
      { wch: 30 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 12 },
      { wch: 60 },
    ];
    XLSX.utils.book_append_sheet(wb, ws1, 'Archived Packages');

    // Sheet 2: Fleet Logs
    const sheet2Data = data.vehicleLogs.map((v) => ({
      'Operation Date': formatDate(v.operationDate),
      'Booking ID': v.packageId || '—',
      'Guest Name': v.guestName,
      'Pax in Vehicle': v.paxInVehicle,
      'Vehicle Type': v.vehicleType,
      'Vehicle No.': v.vehicleNumber || '—',
      'Vendor Name': v.vendorName || '—',
      'Driver Name': v.driverName || '—',
      'Driver Phone': v.driverPhone || '—',
      'Duty Route': v.dutyRoute,
      'Remarks': v.remarks || '',
    }));

    const ws2 = XLSX.utils.json_to_sheet(
      sheet2Data.length > 0 ? sheet2Data : [{ 'Status': 'No fleet logs to purge' }]
    );
    ws2['!cols'] = [
      { wch: 15 },
      { wch: 14 },
      { wch: 22 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
      { wch: 20 },
      { wch: 18 },
      { wch: 16 },
      { wch: 32 },
      { wch: 25 },
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'Archived Fleet Logs');

    XLSX.writeFile(wb, filename);
    return true;
  };

  const handleAutoPurge = async () => {
    if (autoData.packages.length === 0 && autoData.vehicleLogs.length === 0) {
      addToast({
        type: 'info',
        message: 'No records older than 60 days found in database.',
      });
      return;
    }

    // Step 1: Download Excel backup first
    const dateStr = new Date().toLocaleDateString('en-IN').replace(/\//g, '-');
    const filename = `TravelCRM_PurgeBackup_OlderThan60Days_${dateStr}.xlsx`;
    generateAndDownloadExcel(autoData, filename);
    addToast({
      type: 'success',
      message: 'Automatic Excel backup generated and downloaded to your laptop!',
    });

    // Step 2: Confirmation modal
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Deletion of >60 Days Old Data',
      description: `Excel backup '${filename}' has been downloaded to your computer. Are you sure you want to permanently delete ${autoData.packages.length} package(s) and ${autoData.vehicleLogs.length} fleet log(s) from your local MongoDB?`,
      onConfirm: async () => {
        setPurgingAuto(true);
        try {
          const res = await fetch('/api/cleanup', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'auto' }),
          });
          const result = await res.json();
          if (res.ok) {
            addToast({
              type: 'success',
              message: `Deleted ${result.deletedPackages} packages and ${result.deletedVehicleLogs} vehicle logs.`,
            });
            scanAutoPurge();
            fetchOverallStats();
          } else {
            throw new Error(result.error);
          }
        } catch {
          addToast({ type: 'error', message: 'Failed to purge data' });
        } finally {
          setPurgingAuto(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleScanRange = async () => {
    if (!fromDate || !toDate) {
      addToast({ type: 'error', message: 'Please select both From and To dates' });
      return;
    }
    setLoadingRange(true);
    try {
      const res = await fetch(`/api/cleanup?mode=range&fromDate=${fromDate}&toDate=${toDate}`);
      if (res.ok) {
        const data = await res.json();
        setRangeData(data);
        addToast({
          type: 'info',
          message: `Found ${data.packages.length} packages and ${data.vehicleLogs.length} vehicle logs in selected range`,
        });
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to scan selected range' });
    } finally {
      setLoadingRange(false);
    }
  };

  const handlePurgeRange = async () => {
    if (!rangeData || (rangeData.packages.length === 0 && rangeData.vehicleLogs.length === 0)) {
      addToast({ type: 'warning', message: 'No records found in range to delete' });
      return;
    }

    const filename = `TravelCRM_RangeBackup_${fromDate}_to_${toDate}.xlsx`;
    generateAndDownloadExcel(rangeData, filename);
    addToast({
      type: 'success',
      message: 'Excel backup of date range downloaded to your laptop!',
    });

    setConfirmModal({
      isOpen: true,
      title: 'Confirm Range Deletion',
      description: `Backup '${filename}' has been downloaded. Confirm permanent deletion of ${rangeData.packages.length} package(s) and ${rangeData.vehicleLogs.length} fleet log(s) between ${formatDate(fromDate)} and ${formatDate(toDate)}?`,
      onConfirm: async () => {
        setPurgingRange(true);
        try {
          const res = await fetch('/api/cleanup', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'range', fromDate, toDate }),
          });
          const result = await res.json();
          if (res.ok) {
            addToast({
              type: 'success',
              message: `Deleted ${result.deletedPackages} packages and ${result.deletedVehicleLogs} vehicle logs.`,
            });
            setRangeData(null);
            setFromDate('');
            setToDate('');
            scanAutoPurge();
            fetchOverallStats();
          } else {
            throw new Error(result.error);
          }
        } catch {
          addToast({ type: 'error', message: 'Failed to purge date range' });
        } finally {
          setPurgingRange(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-heading font-bold text-2xl text-gray-900">
          Storage & Data Retention Manager
        </h2>
        <p className="text-sm text-gray-500">
          Local-first MongoDB storage management, safe 2-month retention, and automated Excel backup purges
        </p>
      </div>

      {/* Retention Policy Banner */}
      <div
        className="rounded-2xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        style={{ backgroundColor: '#0B192C' }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#FF9F1C' }}
          >
            <ShieldCheck size={24} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-lg">2-Month Local Retention Guaranteed</h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-sm text-white/70 mt-1 max-w-2xl">
              All package itineraries, guest communications, and daily fleet movements remain safely stored
              inside your local MongoDB database for at least 60 days. No records are ever deleted without
              first creating a complete downloadable Excel archive.
            </p>
          </div>
        </div>
      </div>

      {/* Database Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Database size={22} />
          </div>
          <div>
            <div className="text-xs text-gray-400 font-medium">Total Packages in DB</div>
            <div className="text-2xl font-bold font-heading text-gray-900">{totalPackages}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <HardDrive size={22} />
          </div>
          <div>
            <div className="text-xs text-gray-400 font-medium">Total Fleet Logs in DB</div>
            <div className="text-2xl font-bold font-heading text-gray-900">{totalVehicles}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle size={22} />
          </div>
          <div>
            <div className="text-xs text-gray-400 font-medium">Database Target</div>
            <div className="text-xs font-mono font-semibold text-gray-800 truncate max-w-[180px]">
              travel_operations_crm
            </div>
            <div className="text-[10px] text-gray-400">127.0.0.1:27017</div>
          </div>
        </div>
      </div>

      {/* Hybrid Local + Cloud Sync Card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                syncStatus?.connected
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {syncStatus?.connected ? <Cloud size={24} /> : <CloudOff size={24} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-lg text-gray-900">
                  Hybrid Local + Cloud Sync
                </h3>
                {syncStatus?.connected ? (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    🟢 Cloud Connected
                  </span>
                ) : syncStatus?.configured ? (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    ⚠️ Cloud Configured (Offline)
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    ⚪ Local Storage Only
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1 max-w-xl">
                {syncStatus?.connected
                  ? `Real-time dual-write is ACTIVE. Every new booking or fleet log writes to your laptop instantly and mirrors to MongoDB Atlas in the cloud. Cloud has: ${
                      syncStatus.cloudCounts?.packages ?? 0
                    } packages, ${syncStatus.cloudCounts?.vehicles ?? 0} vehicles.`
                  : syncStatus?.configured
                  ? 'Cloud connection configured in .env.local, but currently cannot reach MongoDB Atlas. Check your internet connection or IP whitelist.'
                  : 'To enable automatic cloud backup & remote sync, add MONGODB_ATLAS_URI to your .env.local file. All changes will sync seamlessly in the background.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => triggerSync('push')}
              disabled={syncing || !syncStatus?.connected}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white rounded-xl transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: '#0B192C' }}
            >
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpRight size={14} />}
              <span>Push All to Cloud</span>
            </button>
            <button
              onClick={() => triggerSync('pull')}
              disabled={syncing || !syncStatus?.connected}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-40"
            >
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <ArrowDownLeft size={14} />}
              <span>Restore from Cloud</span>
            </button>
            <button
              onClick={fetchSyncStatus}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              title="Refresh Cloud Sync Status"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Action Cards: Auto-Purge & Custom Range */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Auto-Purge (> 60 Days) */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock size={20} className="text-amber-500" />
                <h3 className="font-heading font-bold text-lg text-gray-900">
                  Auto-Purge Old Data (&gt; 2 Months)
                </h3>
              </div>
              <button
                onClick={scanAutoPurge}
                disabled={loadingAuto}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                title="Rescan"
              >
                <RefreshCw size={16} className={loadingAuto ? 'animate-spin' : ''} />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Finds all packages with Check-out Date older than 60 days, and all vehicle logs older than
              60 days. Automatically exports an Excel backup to your laptop before initiating deletion.
            </p>

            <div className="bg-slate-50 rounded-xl p-4 border border-gray-100 space-y-2 mb-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Old Packages (&gt; 60 Days):</span>
                <span className="font-bold text-gray-900">{autoData.packages.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Old Vehicle Logs (&gt; 60 Days):</span>
                <span className="font-bold text-gray-900">{autoData.vehicleLogs.length}</span>
              </div>
              <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
                <span>Threshold:</span>
                <span>
                  Older than {new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleAutoPurge}
              disabled={
                loadingAuto ||
                purgingAuto ||
                (autoData.packages.length === 0 && autoData.vehicleLogs.length === 0)
              }
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: '#FF9F1C' }}
            >
              <Download size={16} />
              <span>Backup & Auto-Purge (&gt; 60 Days)</span>
            </button>
            <p className="text-[11px] text-gray-400 text-center">
              Safety lock: Automatically downloads Excel archive before database removal
            </p>
          </div>
        </div>

        {/* Section 2: Custom Date Range Purge */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={20} className="text-blue-600" />
              <h3 className="font-heading font-bold text-lg text-gray-900">
                Custom Date-Range Purge & Archive
              </h3>
            </div>

            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Archive and purge records for a specific completed month, season, or arbitrary date window.
              Requires a mandatory Excel export before records are cleared.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setRangeData(null);
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setRangeData(null);
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            {rangeData && (
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 mb-4 text-xs space-y-1">
                <div className="font-semibold text-amber-900">Range Scan Results:</div>
                <div className="text-amber-800">
                  • <b>{rangeData.packages.length}</b> packages found in this date window
                </div>
                <div className="text-amber-800">
                  • <b>{rangeData.vehicleLogs.length}</b> fleet logs found in this date window
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {!rangeData ? (
              <button
                onClick={handleScanRange}
                disabled={loadingRange || !fromDate || !toDate}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm text-gray-800 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-40"
              >
                <RefreshCw size={16} className={loadingRange ? 'animate-spin' : ''} />
                <span>Scan Records in Range</span>
              </button>
            ) : (
              <button
                onClick={handlePurgeRange}
                disabled={
                  purgingRange ||
                  (rangeData.packages.length === 0 && rangeData.vehicleLogs.length === 0)
                }
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: '#DC2626' }}
              >
                <Trash2 size={16} />
                <span>Backup Excel & Delete Range</span>
              </button>
            )}
            <p className="text-[11px] text-gray-400 text-center">
              Creates a multi-sheet spreadsheet backup before executing deletion
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 modal-content space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div className="text-center">
              <h3 className="font-heading font-bold text-lg text-gray-900">
                {confirmModal.title}
              </h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                {confirmModal.description}
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

