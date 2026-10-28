'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  X, Calendar, CalendarDays, Search, Download, FileText,
  Filter, CheckCircle, Loader2, Sparkles
} from 'lucide-react';
import { ToastMessage } from './Toast';
import {
  exportMasterReportPDF,
  exportPackagesReportPDF,
  exportFleetReportPDF,
} from '@/lib/pdfExport';
import * as XLSX from 'xlsx';

interface CustomReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  addToast: (msg: Omit<ToastMessage, 'id'>) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const YEARS = [2024, 2025, 2026, 2027, 2028];

export default function CustomReportModal({
  isOpen,
  onClose,
  addToast,
}: CustomReportModalProps) {
  const now = new Date();
  const [filterMode, setFilterMode] = useState<'month' | 'range'>('month');
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth()); // 0-indexed

  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [reportType, setReportType] = useState<'master' | 'packages' | 'fleet'>('master');

  // Preview state
  const [loading, setLoading] = useState<boolean>(false);
  const [matchCounts, setMatchCounts] = useState<{ packages: number; vehicles: number } | null>(null);

  // Compute active date boundaries
  const getDateRange = useCallback((): { start: string; end: string; label: string } => {
    if (filterMode === 'month') {
      const year = selectedYear;
      const month = selectedMonth;
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const start = firstDay.toISOString().slice(0, 10);
      const end = lastDay.toISOString().slice(0, 10);
      const label = `${MONTH_NAMES[month]} ${year}`;
      return { start, end, label };
    } else {
      const start = fromDate || '';
      const end = toDate || '';
      const label = start && end ? `${start} to ${end}` : 'Custom Range';
      return { start, end, label };
    }
  }, [filterMode, selectedYear, selectedMonth, fromDate, toDate]);

  // Fetch count preview whenever filters change
  const fetchCounts = useCallback(async () => {
    const { start, end } = getDateRange();
    if (!start || !end) {
      setMatchCounts(null);
      return;
    }

    setLoading(true);
    try {
      const pkgParams = new URLSearchParams();
      pkgParams.set('fromDate', start);
      pkgParams.set('toDate', end);
      if (searchQuery.trim()) pkgParams.set('search', searchQuery.trim());

      const vehParams = new URLSearchParams();
      vehParams.set('fromDate', start);
      vehParams.set('toDate', end);
      if (searchQuery.trim()) vehParams.set('search', searchQuery.trim());

      const [pRes, vRes] = await Promise.all([
        fetch(`/api/packages?${pkgParams.toString()}`),
        fetch(`/api/vehicles?${vehParams.toString()}`),
      ]);

      const pkgs = pRes.ok ? await pRes.json() : [];
      const vehs = vRes.ok ? await vRes.json() : [];

      setMatchCounts({ packages: pkgs.length, vehicles: vehs.length });
    } catch {
      setMatchCounts(null);
    } finally {
      setLoading(false);
    }
  }, [getDateRange, searchQuery]);

  useEffect(() => {
    if (isOpen) {
      fetchCounts();
    }
  }, [isOpen, fetchCounts]);

  const fetchFilteredData = async () => {
    const { start, end } = getDateRange();
    const pkgParams = new URLSearchParams();
    if (start) pkgParams.set('fromDate', start);
    if (end) pkgParams.set('toDate', end);
    if (searchQuery.trim()) pkgParams.set('search', searchQuery.trim());

    const vehParams = new URLSearchParams();
    if (start) vehParams.set('fromDate', start);
    if (end) vehParams.set('toDate', end);
    if (searchQuery.trim()) vehParams.set('search', searchQuery.trim());

    const [pRes, vRes] = await Promise.all([
      fetch(`/api/packages?${pkgParams.toString()}`),
      fetch(`/api/vehicles?${vehParams.toString()}`),
    ]);

    const packages = pRes.ok ? await pRes.json() : [];
    const vehicles = vRes.ok ? await vRes.json() : [];
    return { packages, vehicles };
  };

  const handleGeneratePDF = async () => {
    setLoading(true);
    try {
      const { start, end, label } = getDateRange();
      if (!start || !end) {
        addToast({ type: 'warning', message: 'Please select valid date boundaries' });
        return;
      }

      const { packages, vehicles } = await fetchFilteredData();

      if (packages.length === 0 && vehicles.length === 0) {
        addToast({
          type: 'warning',
          message: 'No records found matching this date range/name.',
        });
        return;
      }

      const searchSuffix = searchQuery.trim() ? ` (Filtered: "${searchQuery.trim()}")` : '';
      const fullLabel = `${label}${searchSuffix}`;

      if (reportType === 'master') {
        exportMasterReportPDF(packages, vehicles, null, fullLabel);
      } else if (reportType === 'packages') {
        exportPackagesReportPDF(packages, fullLabel);
      } else if (reportType === 'fleet') {
        exportFleetReportPDF(vehicles, fullLabel);
      }

      addToast({
        type: 'success',
        message: `PDF report for ${fullLabel} generated successfully!`,
      });
      onClose();
    } catch {
      addToast({ type: 'error', message: 'Failed to generate PDF report' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateExcel = async () => {
    setLoading(true);
    try {
      const { start, end, label } = getDateRange();
      const { packages, vehicles } = await fetchFilteredData();

      if (packages.length === 0 && vehicles.length === 0) {
        addToast({ type: 'warning', message: 'No records found to export' });
        return;
      }

      const wb = XLSX.utils.book_new();

      // Sheet 1: Packages
      const sheet1Data = packages.map((p: any) => ({
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
      }));
      const ws1 = XLSX.utils.json_to_sheet(sheet1Data.length > 0 ? sheet1Data : [{ Status: 'No packages found' }]);
      XLSX.utils.book_append_sheet(wb, ws1, 'Packages');

      // Sheet 2: Fleet
      const sheet2Data = vehicles.map((v: any) => ({
        'Date': v.operationDate ? new Date(v.operationDate).toLocaleDateString('en-IN') : '',
        'Booking ID': v.packageId || '—',
        'Guest Name': v.guestName,
        'Pax': v.paxInVehicle,
        'Vehicle Type': v.vehicleType,
        'Vehicle Number': v.vehicleNumber || '—',
        'Vendor Name': v.vendorName || '—',
        'Driver Name': v.driverName || '—',
        'Driver Phone': v.driverPhone || '—',
        'Duty Route': v.dutyRoute,
      }));
      const ws2 = XLSX.utils.json_to_sheet(sheet2Data.length > 0 ? sheet2Data : [{ Status: 'No fleet logs found' }]);
      XLSX.utils.book_append_sheet(wb, ws2, 'Fleet Roster');

      const sanitizedLabel = label.replace(/[^a-zA-Z0-9_-]/g, '_');
      XLSX.writeFile(wb, `TravelCRM_Report_${sanitizedLabel}.xlsx`);
      addToast({ type: 'success', message: 'Excel report downloaded!' });
      onClose();
    } catch {
      addToast({ type: 'error', message: 'Failed to export Excel report' });
    } finally {
      setLoading(false);
    }
  };

  const quickSetMonth = (monthOffset: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    setSelectedYear(d.getFullYear());
    setSelectedMonth(d.getMonth());
    setFilterMode('month');
  };

  if (!isOpen) return null;

  const { label } = getDateRange();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col modal-content overflow-hidden">
        {/* Header */}
        <div
          className="p-6 text-white flex items-center justify-between"
          style={{ backgroundColor: '#0B192C' }}
        >
          <div>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs"
                style={{ backgroundColor: '#FF9F1C' }}
              >
                PDF
              </div>
              <h2 className="font-heading font-bold text-xl text-white">
                Download Custom PDF Report
              </h2>
            </div>
            <p className="text-xs text-white/60 mt-1">
              Filter by month name, custom date range, or guest name & export instant PDF
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Filter Mode Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              1. Choose Date Selection Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFilterMode('month')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${
                  filterMode === 'month'
                    ? 'border-amber-500 bg-amber-50/70 text-amber-900 shadow-sm'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <CalendarDays size={18} className={filterMode === 'month' ? 'text-amber-600' : 'text-gray-400'} />
                <span>By Month Name</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('range')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${
                  filterMode === 'range'
                    ? 'border-amber-500 bg-amber-50/70 text-amber-900 shadow-sm'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Calendar size={18} className={filterMode === 'range' ? 'text-amber-600' : 'text-gray-400'} />
                <span>By Custom Date Range</span>
              </button>
            </div>
          </div>

          {/* Month Selector Mode */}
          {filterMode === 'month' ? (
            <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">Select Month & Year:</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => quickSetMonth(0)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-md bg-white border border-gray-200 hover:border-amber-400 text-gray-700"
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    onClick={() => quickSetMonth(-1)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-md bg-white border border-gray-200 hover:border-amber-400 text-gray-700"
                  >
                    Last Month
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={name} value={idx}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            /* Custom Date Range Mode */
            <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">Enter Exact Date Range:</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      const to = d.toISOString().slice(0, 10);
                      d.setDate(d.getDate() - 30);
                      const from = d.toISOString().slice(0, 10);
                      setFromDate(from);
                      setToDate(to);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold rounded-md bg-white border border-gray-200 hover:border-amber-400 text-gray-700"
                  >
                    Last 30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      const to = d.toISOString().slice(0, 10);
                      d.setDate(d.getDate() - 7);
                      const from = d.toISOString().slice(0, 10);
                      setFromDate(from);
                      setToDate(to);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold rounded-md bg-white border border-gray-200 hover:border-amber-400 text-gray-700"
                  >
                    Last 7 Days
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Filter by Name / Keyword */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              2. Filter by Name, Agency or Driver (Optional)
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. Rahul Sharma, MakeMyTrip, Ghulam Rasool, etc."
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-800"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Leave empty to include all guests and vehicles in the selected period.
            </p>
          </div>

          {/* Report Scope Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              3. Report Scope & Contents
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setReportType('master')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  reportType === 'master'
                    ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/30'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-semibold text-xs text-gray-900">Full Master Report</div>
                <div className="text-[11px] text-gray-500 mt-0.5">Packages + Daily Fleet</div>
              </button>

              <button
                type="button"
                onClick={() => setReportType('packages')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  reportType === 'packages'
                    ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/30'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-semibold text-xs text-gray-900">Packages Only</div>
                <div className="text-[11px] text-gray-500 mt-0.5">Guests, Hotels & Billing</div>
              </button>

              <button
                type="button"
                onClick={() => setReportType('fleet')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  reportType === 'fleet'
                    ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/30'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-semibold text-xs text-gray-900">Fleet Roster Only</div>
                <div className="text-[11px] text-gray-500 mt-0.5">Drivers, Cabs & Routes</div>
              </button>
            </div>
          </div>

          {/* Live Query Match Counter */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
              <div>
                <span className="font-semibold text-emerald-900">Active Criteria: </span>
                <span className="text-emerald-800 font-medium">{label}</span>
                {searchQuery.trim() && (
                  <span className="text-emerald-700"> • Matching "{searchQuery.trim()}"</span>
                )}
              </div>
            </div>

            <div className="text-right">
              {loading ? (
                <Loader2 size={16} className="animate-spin text-emerald-600" />
              ) : (
                <div className="font-bold text-emerald-900">
                  {matchCounts ? (
                    <span>
                      {matchCounts.packages} Pkg / {matchCounts.vehicles} Cabs
                    </span>
                  ) : (
                    <span>Ready</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-5 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateExcel}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              <Download size={14} />
              <span>Download Excel</span>
            </button>

            <button
              onClick={handleGeneratePDF}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-opacity hover:opacity-95 disabled:opacity-50"
              style={{ backgroundColor: '#DC2626' }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={15} />}
              <span>Download PDF Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

