'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Download, ArrowUpDown, ArrowUp, ArrowDown,
  Edit, Trash2, MapPin, ChevronDown, ChevronUp, Eye, Filter
} from 'lucide-react';
import { ToastMessage } from './Toast';
import PackageModal from './PackageModal';
import DailyLogModal from './DailyLogModal';
import * as XLSX from 'xlsx';

interface DailyLog {
  dayNumber: number;
  date: string;
  placesVisited: string;
  hotelStayed: string;
  dailyRemarks: string;
}

interface Package {
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
  dailyLogs: DailyLog[];
}

interface PackagesTabProps {
  addToast: (msg: Omit<ToastMessage, 'id'>) => void;
}

const STATUS_STYLES: Record<string, string> = {
  Upcoming: 'status-upcoming',
  Ongoing: 'status-ongoing',
  Completed: 'status-completed',
  Cancelled: 'status-cancelled',
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export default function PackagesTab({ addToast }: PackagesTabProps) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [agency, setAgency] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showModal, setShowModal] = useState(false);
  const [editPkg, setEditPkg] = useState<Package | undefined>(undefined);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logPkg, setLogPkg] = useState<Package | undefined>(undefined);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
      if (agency) params.set('agency', agency);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('sort', sortDir);
      const res = await fetch(`/api/packages?${params}`);
      if (res.ok) setPackages(await res.json());
    } catch {
      addToast({ type: 'error', message: 'Failed to load packages' });
    } finally {
      setLoading(false);
    }
  }, [search, fromDate, toDate, agency, statusFilter, sortDir, addToast]);

  useEffect(() => {
    const timer = setTimeout(fetchPackages, 300);
    return () => clearTimeout(timer);
  }, [fetchPackages]);

  const handleDelete = async (pkg: Package) => {
    if (!confirm(`Delete package for ${pkg.guestName} (${pkg.bookingId})? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/packages/${pkg._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      addToast({ type: 'success', message: `Package ${pkg.bookingId} deleted` });
      fetchPackages();
    } catch {
      addToast({ type: 'error', message: 'Failed to delete package' });
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const downloadExcel = async () => {
    if (packages.length === 0) {
      addToast({ type: 'warning', message: 'No packages to export' });
      return;
    }

    try {
      addToast({ type: 'info', message: 'Preparing multi-sheet Excel export...' });

      // Sheet 1: Filtered Packages & Daily Itinerary
      const sheet1Data = packages.map((p) => ({
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
          .join('\n'),
      }));

      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
      ws1['!cols'] = [
        { wch: 12 }, { wch: 22 }, { wch: 15 }, { wch: 18 }, { wch: 6 },
        { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 30 }, { wch: 16 },
        { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 60 },
      ];
      XLSX.utils.book_append_sheet(wb, ws1, 'Packages & Daily Logs');

      // Sheet 2: Daily Fleet Logs for the same date window / search
      const fleetParams = new URLSearchParams();
      if (fromDate) fleetParams.set('fromDate', fromDate);
      if (toDate) fleetParams.set('toDate', toDate);
      if (search) fleetParams.set('search', search);
      fleetParams.set('sort', sortDir);

      const fleetRes = await fetch(`/api/vehicles?${fleetParams.toString()}`);
      const fleetLogs = fleetRes.ok ? await fleetRes.json() : [];

      const sheet2Data = fleetLogs.map((v: {
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
        'Date': formatDate(v.operationDate),
        'Booking ID': v.packageId || '—',
        'Guest Assigned': v.guestName,
        'Pax in Vehicle': v.paxInVehicle,
        'Vehicle Type': v.vehicleType,
        'Vehicle Number': v.vehicleNumber || '—',
        'Vendor Name': v.vendorName || '—',
        'Driver Name': v.driverName || '—',
        'Driver Contact': v.driverPhone || '—',
        'Duty Route': v.dutyRoute,
        'Remarks': v.remarks || '',
      }));

      const ws2 = XLSX.utils.json_to_sheet(
        sheet2Data.length > 0 ? sheet2Data : [{ 'Status': 'No fleet logs for current filter' }]
      );
      ws2['!cols'] = [
        { wch: 14 }, { wch: 12 }, { wch: 22 }, { wch: 6 }, { wch: 15 },
        { wch: 14 }, { wch: 20 }, { wch: 18 }, { wch: 16 }, { wch: 32 }, { wch: 25 },
      ];
      XLSX.utils.book_append_sheet(wb, ws2, 'Daily Fleet Logs');

      const dateStr = new Date().toLocaleDateString('en-IN').replace(/\//g, '-');
      XLSX.writeFile(wb, `TravelCRM_Packages_and_Fleet_${dateStr}.xlsx`);
      addToast({ type: 'success', message: 'Download Sorted Excel (.xlsx) complete!' });
    } catch {
      addToast({ type: 'error', message: 'Failed to export Excel report' });
    }
  };

  const clearFilters = () => {
    setSearch('');
    setFromDate('');
    setToDate('');
    setAgency('');
    setStatusFilter('all');
    setSortDir('asc');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-heading font-bold text-2xl text-gray-900">Packages & Guests</h2>
          <p className="text-sm text-gray-500">{packages.length} record{packages.length !== 1 ? 's' : ''} found</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Filter size={16} />
            Filters
            {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={downloadExcel}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-xl transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#0B192C' }}
          >
            <Download size={16} />
            Export Excel
          </button>
          <button
            onClick={() => { setEditPkg(undefined); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-xl transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#FF9F1C' }}
          >
            <Plus size={16} />
            Add Package
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Search</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Guest name, Booking ID..."
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Agency</label>
              <input
                type="text"
                value={agency}
                onChange={(e) => setAgency(e.target.value)}
                placeholder="Filter by agency"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="all">All Statuses</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Sort</label>
              <button
                onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                Check-in {sortDir === 'asc' ? 'Asc' : 'Desc'}
              </button>
            </div>
            <div className="mt-5">
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#0B192C' }}>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Booking ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Guest</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Agency</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  <button className="flex items-center gap-1" onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}>
                    Check-in <ArrowUpDown size={12} className="text-white/50" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Check-out</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Pax</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 11 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : packages.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <Search size={32} className="opacity-30" />
                      <span>No packages found. Add your first package!</span>
                    </div>
                  </td>
                </tr>
              ) : (
                packages.map((pkg, idx) => (
                  <>
                    <tr key={pkg._id} className="table-row-hover transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-lg">
                          {pkg.bookingId}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-semibold text-gray-900">{pkg.guestName}</div>
                          <div className="text-xs text-gray-400">{pkg.contactNumber}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{pkg.agencyName}</td>
                      <td className="px-4 py-3 text-gray-700 font-medium text-xs">{formatDate(pkg.checkInDate)}</td>
                      <td className="px-4 py-3 text-gray-700 text-xs">{formatDate(pkg.checkOutDate)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-lg font-semibold text-xs">{pkg.totalPax}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-xs font-medium">{formatCurrency(pkg.packageAmount)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${pkg.balancePending > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(pkg.balancePending)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLES[pkg.status] || ''}`}>
                          {pkg.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            title="View/Edit Itinerary"
                            onClick={() => { setLogPkg(pkg); setShowLogModal(true); }}
                            className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                            style={{ color: '#FF9F1C' }}
                          >
                            <MapPin size={15} />
                          </button>
                          <button
                            title="Edit Package"
                            onClick={() => { setEditPkg(pkg); setShowModal(true); }}
                            className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors text-blue-600"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            title="Delete Package"
                            onClick={() => handleDelete(pkg)}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-red-500"
                          >
                            <Trash2 size={15} />
                          </button>
                          {pkg.dailyLogs && pkg.dailyLogs.length > 0 && (
                            <button
                              title="Toggle itinerary preview"
                              onClick={() => toggleRow(pkg._id)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
                            >
                              {expandedRows.has(pkg._id) ? <ChevronUp size={15} /> : <Eye size={15} />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedRows.has(pkg._id) && pkg.dailyLogs && pkg.dailyLogs.length > 0 && (
                      <tr key={`${pkg._id}-expanded`} className="bg-amber-50/40">
                        <td colSpan={11} className="px-6 py-3">
                          <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">Itinerary Preview</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {pkg.dailyLogs.map((log) => (
                              <div key={log.dayNumber} className="bg-white rounded-lg p-2 border border-amber-100">
                                <div className="font-semibold text-gray-800 text-xs mb-1">
                                  Day {log.dayNumber} — {formatDate(log.date)}
                                </div>
                                {log.placesVisited && (
                                  <div className="text-gray-600 text-xs">📍 {log.placesVisited}</div>
                                )}
                                {log.hotelStayed && (
                                  <div className="text-gray-600 text-xs">🏨 {log.hotelStayed}</div>
                                )}
                                {log.dailyRemarks && (
                                  <div className="text-gray-400 text-xs italic">{log.dailyRemarks}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <PackageModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditPkg(undefined); }}
        onSave={fetchPackages}
        editData={editPkg}
        addToast={addToast}
      />
      {logPkg && (
        <DailyLogModal
          isOpen={showLogModal}
          onClose={() => { setShowLogModal(false); setLogPkg(undefined); }}
          packageId={logPkg._id}
          guestName={logPkg.guestName}
          checkInDate={logPkg.checkInDate}
          checkOutDate={logPkg.checkOutDate}
          totalDays={logPkg.totalDays}
          existingLogs={logPkg.dailyLogs}
          addToast={addToast}
          onSave={fetchPackages}
        />
      )}
    </div>
  );
}
