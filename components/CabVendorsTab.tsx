'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck, Search, Calendar, ChevronLeft, ChevronRight, RefreshCw,
  Download, Users, ArrowUpDown, ChevronDown, ChevronUp, MapPin, Phone
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ToastMessage } from './Toast';

interface TripItem {
  logId: string;
  date: string;
  packageId: string;
  guestName: string;
  dutyRoute: string;
  vehicleType: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  cabs: number;
  pax: number;
}

interface VendorStats {
  vendorName: string;
  totalCabsAllotted: number;
  totalTrips: number;
  totalPax: number;
  vehicleTypes: string[];
  trips: TripItem[];
}

interface CabVendorsTabProps {
  addToast: (msg: Omit<ToastMessage, 'id'>) => void;
}

export default function CabVendorsTab({ addToast }: CabVendorsTabProps) {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [vendors, setVendors] = useState<VendorStats[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'cabs' | 'trips' | 'pax'>('cabs');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/vendors?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setVendors(data.vendors || []);
        setSummary(data.summary || null);
      } else {
        addToast({ type: 'error', message: 'Failed to load cab vendor analytics' });
      }
    } catch {
      addToast({ type: 'error', message: 'Error connecting to cab vendor analytics service' });
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, addToast]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // Step month
  const stepMonth = (offset: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + offset, 1);
    const nextKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(nextKey);
  };

  const monthLabel = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  const filteredVendors = vendors
    .filter((v) =>
      v.vendorName.toLowerCase().includes(search.toLowerCase()) ||
      v.vehicleTypes.some((vt) => vt.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      let diff = 0;
      if (sortBy === 'cabs') diff = b.totalCabsAllotted - a.totalCabsAllotted;
      else if (sortBy === 'trips') diff = b.totalTrips - a.totalTrips;
      else if (sortBy === 'pax') diff = b.totalPax - a.totalPax;
      return sortAsc ? -diff : diff;
    });

  const exportExcel = () => {
    if (vendors.length === 0) {
      addToast({ type: 'warning', message: 'No vendor data to export for this month' });
      return;
    }

    const exportRows = vendors.map((v, i) => ({
      '#': i + 1,
      'Vendor / Transporter': v.vendorName,
      'Total Cabs Allotted': v.totalCabsAllotted,
      'Total Trips / Dispatches': v.totalTrips,
      'Total Passengers (Pax)': v.totalPax,
      'Vehicle Models': v.vehicleTypes.join(', ') || 'Various',
      'Reporting Month': monthLabel(),
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cab Vendors');
    XLSX.writeFile(wb, `Cab_Vendor_Allotments_${selectedMonth}.xlsx`);
    addToast({ type: 'success', message: 'Cab vendor monthly allotments exported to Excel' });
  };

  const toggleSort = (field: 'cabs' | 'trips' | 'pax') => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-sm">
              <Truck size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold font-heading text-gray-900 tracking-tight">
                Cab Vendors: Monthly Allotment & Trip Tracking
              </h1>
              <p className="text-xs text-gray-500">
                Track vehicle deployments, vendor workload, and total cabs allotted per month
              </p>
            </div>
          </div>

          {/* Month Navigator & Export */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-1.5 py-1 text-xs">
              <button
                onClick={() => stepMonth(-1)}
                className="p-1 hover:bg-white rounded-lg text-gray-600 transition-colors"
                title="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="font-semibold text-gray-800 px-3 min-w-[130px] text-center">
                {monthLabel()}
              </span>
              <button
                onClick={() => stepMonth(1)}
                className="p-1 hover:bg-white rounded-lg text-gray-600 transition-colors"
                title="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              onClick={exportExcel}
              className="px-3.5 py-2 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center gap-1.5 transition-colors"
              title="Export Report to Excel"
            >
              <Download size={13} />
              Export Excel
            </button>

            <button
              onClick={fetchVendors}
              className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
              title="Refresh Analytics"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cab vendors, transport companies, or vehicle models..."
            className="w-full pl-10 pr-4 py-2.5 text-xs border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50/50"
          />
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cabs Allotted */}
        <div className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-white p-5 rounded-3xl border border-blue-200/60 shadow-xs">
          <div className="flex items-center justify-between text-xs text-blue-800 font-semibold mb-1">
            <span>Total Cabs Allotted</span>
            <Truck size={16} className="text-blue-600" />
          </div>
          <div className="text-3xl font-bold font-heading text-blue-950">
            {summary?.totalCabsAllotted ?? 0}
          </div>
          <div className="text-[11px] text-blue-700/80 mt-1">
            Total vehicle allotments in {monthLabel()}
          </div>
        </div>

        {/* Active Cab Vendors */}
        <div className="bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-white p-5 rounded-3xl border border-indigo-200/60 shadow-xs">
          <div className="flex items-center justify-between text-xs text-indigo-800 font-semibold mb-1">
            <span>Active Cab Vendors</span>
            <Users size={16} className="text-indigo-600" />
          </div>
          <div className="text-3xl font-bold font-heading text-indigo-950">
            {summary?.totalVendors ?? 0}
          </div>
          <div className="text-[11px] text-indigo-700/80 mt-1">
            Vendors with active duty assignments
          </div>
        </div>

        {/* Total Trips Dispatched */}
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white p-5 rounded-3xl border border-amber-200/60 shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-800 font-semibold mb-1">
            <span>Total Dispatches / Trips</span>
            <MapPin size={16} className="text-amber-600" />
          </div>
          <div className="text-3xl font-bold font-heading text-amber-950">
            {summary?.totalTrips ?? 0}
          </div>
          <div className="text-[11px] text-amber-700/80 mt-1">
            Duty runs executed in {monthLabel()}
          </div>
        </div>

        {/* Total Passengers Moved */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white p-5 rounded-3xl border border-emerald-200/60 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold mb-1">
            <span>Passengers Transported</span>
            <Users size={16} className="text-emerald-600" />
          </div>
          <div className="text-3xl font-bold font-heading text-emerald-950">
            {summary?.totalPaxMoved ?? 0}
          </div>
          <div className="text-[11px] text-emerald-700/80 mt-1">
            Total guest passenger seats
          </div>
        </div>
      </div>

      {/* Main Vendor Table Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold font-heading text-gray-800">
            Cab Vendors Performance ({filteredVendors.length} Transporters)
          </h2>
          <div className="text-xs text-gray-400">
            Click on any vendor to view scheduled vehicle duties and driver slips
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#0B192C' }}>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  #
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Cab Vendor / Transporter
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  <button
                    onClick={() => toggleSort('cabs')}
                    className="flex items-center gap-1 hover:text-white"
                  >
                    Total Cabs Allotted <ArrowUpDown size={12} className="text-blue-400" />
                  </button>
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  <button
                    onClick={() => toggleSort('trips')}
                    className="flex items-center gap-1 hover:text-white"
                  >
                    Trips / Duties <ArrowUpDown size={12} className="text-amber-400" />
                  </button>
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Vehicle Fleet Types
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  <button
                    onClick={() => toggleSort('pax')}
                    className="flex items-center gap-1 hover:text-white"
                  >
                    Total Pax <ArrowUpDown size={12} className="text-emerald-400" />
                  </button>
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Duty Trips
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <Truck size={32} className="opacity-30" />
                      <span>No cab vendor allotments recorded for {monthLabel()}.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor, idx) => {
                  const isExpanded = expandedVendor === vendor.vendorName;

                  return (
                    <React.Fragment key={idx}>
                      <tr
                        onClick={() => setExpandedVendor(isExpanded ? null : vendor.vendorName)}
                        className={`transition-colors cursor-pointer ${
                          isExpanded ? 'bg-blue-50/40' : 'hover:bg-gray-50/70'
                        }`}
                      >
                        <td className="px-5 py-4 text-gray-400 text-xs font-mono">{idx + 1}</td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-gray-900 text-sm">
                            {vendor.vendorName}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
                            <Truck size={12} className="text-blue-700" />
                            {vendor.totalCabsAllotted} Cab{vendor.totalCabsAllotted > 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg text-xs">
                            {vendor.totalTrips} Duty Run{vendor.totalTrips > 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1 flex-wrap">
                            {vendor.vehicleTypes.length > 0 ? (
                              vendor.vehicleTypes.map((vt, i) => (
                                <span
                                  key={i}
                                  className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                                >
                                  {vt}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-gray-700 text-xs font-medium">
                          {vendor.totalPax} Pax
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Trips List */}
                      {isExpanded && (
                        <tr className="bg-blue-50/20">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="bg-white rounded-2xl p-4 border border-blue-200/80 shadow-xs space-y-3">
                              <div className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center justify-between">
                                <span>Duty Trips Dispatched to {vendor.vendorName} ({vendor.trips.length})</span>
                                <span className="text-[11px] font-normal text-gray-400">
                                  {monthLabel()}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {vendor.trips.map((t, tIdx) => (
                                  <div
                                    key={tIdx}
                                    className="p-3 bg-gray-50/80 hover:bg-gray-100/80 rounded-xl border border-gray-200/70 transition-colors text-xs space-y-1.5"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                                        {t.packageId || 'Ad-hoc'}
                                      </span>
                                      <span className="font-bold text-gray-900 bg-white border border-gray-200 px-2 py-0.5 rounded-md">
                                        {t.cabs} Cab{t.cabs > 1 ? 's' : ''}
                                      </span>
                                    </div>
                                    <div className="font-semibold text-gray-900">
                                      {t.guestName} ({t.pax} Pax)
                                    </div>
                                    <div className="text-gray-600 font-medium">
                                      {t.dutyRoute || 'Movement'}
                                    </div>
                                    <div className="text-gray-500 text-[11px] flex items-center justify-between pt-1 border-t border-gray-200/60">
                                      <span>{t.date}</span>
                                      <span className="font-mono uppercase font-bold text-gray-700">
                                        {t.vehicleNumber || t.vehicleType}
                                      </span>
                                    </div>
                                    {t.driverName && (
                                      <div className="text-gray-500 text-[11px] flex items-center gap-1">
                                        <span>Driver: <strong>{t.driverName}</strong></span>
                                        {t.driverPhone && <span>({t.driverPhone})</span>}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

