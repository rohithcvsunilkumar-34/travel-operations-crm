'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Download, ArrowUpDown, ArrowUp, ArrowDown,
  Edit, Trash2, MapPin, ChevronDown, ChevronUp, Eye, Filter, FileText, Calendar, Phone, MessageCircle, CreditCard
} from 'lucide-react';
import { ToastMessage } from './Toast';
import PackageModal from './PackageModal';
import DailyLogModal from './DailyLogModal';
import PackageDetailsModal from './PackageDetailsModal';
import RecordPaymentModal from './RecordPaymentModal';
import { formatName, getInitials, getStatusConfig } from '@/lib/formatters';
import * as XLSX from 'xlsx';
import { exportPackagesReportPDF, exportSinglePackagePDF } from '@/lib/pdfExport';
import { getGuestWhatsAppLink } from '@/lib/whatsapp';

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
  const [selectedMonth, setSelectedMonth] = useState('');
  const [agency, setAgency] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showModal, setShowModal] = useState(false);
  const [editPkg, setEditPkg] = useState<Package | undefined>(undefined);
  const [viewPkg, setViewPkg] = useState<Package | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logPkg, setLogPkg] = useState<Package | undefined>(undefined);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentPkg, setPaymentPkg] = useState<Package | null>(null);
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

  const handleMonthChange = (monthStr: string) => {
    setSelectedMonth(monthStr);
    if (!monthStr) {
      setFromDate('');
      setToDate('');
      return;
    }
    const [year, month] = monthStr.split('-').map(Number);
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    setFromDate(start);
    setToDate(end);
  };

  const setQuickMonth = (offset: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + offset);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const monthStr = `${y}-${String(m).padStart(2, '0')}`;
    handleMonthChange(monthStr);
  };

  const downloadPDF = () => {
    if (packages.length === 0) {
      addToast({ type: 'warning', message: 'No packages to export' });
      return;
    }
    const filterInfo = selectedMonth
      ? `Month: ${new Date(selectedMonth + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`
      : search
      ? `Search: "${search}"`
      : fromDate || toDate
      ? `Date Range: ${formatDate(fromDate)} to ${formatDate(toDate)}`
      : undefined;

    exportPackagesReportPDF(packages, filterInfo);
    addToast({ type: 'success', message: 'Packages PDF preview ready!' });
  };

  const downloadSinglePackagePDF = async (pkg: Package) => {
    try {
      addToast({ type: 'info', message: `Preparing updated voucher for ${formatName(pkg.guestName)}...` });
      const res = await fetch(`/api/packages/${pkg._id}`);
      if (res.ok) {
        const fullPkg = await res.json();
        exportSinglePackagePDF(fullPkg, fullPkg.fleetLogs || []);
        addToast({ type: 'success', message: `Voucher PDF ready for ${pkg.bookingId}!` });
      } else {
        exportSinglePackagePDF(pkg, []);
        addToast({ type: 'success', message: `Voucher PDF ready for ${pkg.bookingId}!` });
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to generate package voucher PDF' });
    }
  };

  const clearFilters = () => {
    setSearch('');
    setFromDate('');
    setToDate('');
    setSelectedMonth('');
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
            onClick={downloadPDF}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white rounded-xl transition-opacity hover:opacity-90 shadow-sm"
            style={{ backgroundColor: '#DC2626' }}
            title="Download Filtered Packages PDF"
          >
            <FileText size={16} />
            Export PDF
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
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
          {/* Quick Month Bar */}
          <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-gray-100 text-xs">
            <span className="font-semibold text-gray-500 flex items-center gap-1">
              <Calendar size={13} className="text-amber-500" />
              Filter by Month:
            </span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="px-2.5 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
            />
            <button
              onClick={() => setQuickMonth(0)}
              className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium rounded-lg transition-colors"
            >
              This Month
            </button>
            <button
              onClick={() => setQuickMonth(-1)}
              className="px-2.5 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium rounded-lg transition-colors"
            >
              Last Month
            </button>
            {selectedMonth && (
              <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-medium">
                Active: {new Date(selectedMonth + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </span>
            )}
          </div>

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
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setSelectedMonth('');
                }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setSelectedMonth('');
                }}
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
                        <button
                          onClick={() => setViewPkg(pkg)}
                          className="font-mono font-semibold text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg inline-flex items-center gap-1 transition-colors cursor-pointer"
                          title="Click to view package details"
                        >
                          {pkg.bookingId}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-white font-heading font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm ring-2 ring-amber-100">
                            {getInitials(pkg.guestName)}
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => setViewPkg(pkg)}
                              className="text-left font-semibold text-gray-900 hover:text-amber-600 transition-colors cursor-pointer truncate block max-w-[180px]"
                              title={`Click to view details for ${formatName(pkg.guestName)}`}
                            >
                              {formatName(pkg.guestName)}
                            </button>
                            {pkg.contactNumber ? (
                              <a
                                href={`tel:${pkg.contactNumber}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-1 font-mono"
                                title="Call guest"
                              >
                                <Phone size={10} className="text-gray-400" />
                                {pkg.contactNumber}
                              </a>
                            ) : (
                              <div className="text-xs text-gray-400">—</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs font-medium">{pkg.agencyName || 'Direct'}</td>
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
                        {(() => {
                          const statusConf = getStatusConfig(pkg.status);
                          return (
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full whitespace-nowrap ${statusConf.className}`}
                              title={statusConf.description}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${statusConf.dot} ${statusConf.pulse ? 'animate-pulse' : ''}`}
                              />
                              {statusConf.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            title="View Package Details"
                            onClick={() => setViewPkg(pkg)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors text-blue-600 flex items-center gap-1"
                          >
                            <Eye size={15} />
                            <span className="text-xs font-semibold hidden 2xl:inline">View</span>
                          </button>
                          <button
                            title="Download Full Package Voucher PDF"
                            onClick={() => downloadSinglePackagePDF(pkg)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 transition-colors text-rose-600 flex items-center gap-1"
                          >
                            <FileText size={15} />
                            <span className="text-xs font-semibold hidden 2xl:inline">PDF</span>
                          </button>
                          {pkg.contactNumber && (
                            <a
                              href={getGuestWhatsAppLink(pkg, [])}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg hover:bg-emerald-50 transition-colors text-emerald-600 flex items-center"
                              title={`Send itinerary to ${formatName(pkg.guestName)} on WhatsApp`}
                            >
                              <MessageCircle size={15} />
                            </a>
                          )}
                          <button
                            title="Record Payment & Generate Receipt"
                            onClick={() => {
                              setPaymentPkg(pkg);
                              setShowPaymentModal(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 transition-colors text-emerald-600 flex items-center"
                          >
                            <CreditCard size={15} />
                          </button>
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
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
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
                              {expandedRows.has(pkg._id) ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
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
      <PackageDetailsModal
        isOpen={!!viewPkg}
        onClose={() => setViewPkg(null)}
        pkg={viewPkg as any}
        onEdit={(p) => {
          setViewPkg(null);
          setEditPkg(p as any);
          setShowModal(true);
        }}
        onOpenItinerary={(p) => {
          setViewPkg(null);
          setLogPkg(p as any);
          setShowLogModal(true);
        }}
        onRecordPayment={(p) => {
          setViewPkg(null);
          setPaymentPkg(p as any);
          setShowPaymentModal(true);
        }}
      />
      <RecordPaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setPaymentPkg(null);
        }}
        pkg={paymentPkg}
        onPaymentRecorded={fetchPackages}
        addToast={addToast}
      />
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
