'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Hotel, Search, Calendar, ChevronLeft, ChevronRight, RefreshCw,
  Download, Users, BedDouble, PlusCircle, ArrowUpDown, ChevronDown, ChevronUp, Eye, Building2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ToastMessage } from './Toast';

interface BookingItem {
  packageId: string;
  bookingId: string;
  guestName: string;
  totalPax: number;
  checkInDate: string;
  checkOutDate: string;
  rooms: number;
  extraBeds: number;
  status: string;
}

interface HotelStats {
  hotelName: string;
  location: string;
  totalRoomsBooked: number;
  totalExtraBeds: number;
  totalBookings: number;
  totalGuests: number;
  bookings: BookingItem[];
}

interface HotelsTabProps {
  addToast: (msg: Omit<ToastMessage, 'id'>) => void;
  onViewPackage?: (pkgId: string) => void;
}

export default function HotelsTab({ addToast, onViewPackage }: HotelsTabProps) {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [hotels, setHotels] = useState<HotelStats[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [expandedHotel, setExpandedHotel] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'rooms' | 'beds' | 'bookings'>('rooms');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const fetchHotels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/hotels?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setHotels(data.hotels || []);
        setSummary(data.summary || null);
      } else {
        addToast({ type: 'error', message: 'Failed to load hotel analytics' });
      }
    } catch {
      addToast({ type: 'error', message: 'Error connecting to hotel analytics service' });
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, addToast]);

  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

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

  // Filter & Sort
  const filteredHotels = hotels
    .filter((h) =>
      h.hotelName.toLowerCase().includes(search.toLowerCase()) ||
      h.location.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let diff = 0;
      if (sortBy === 'rooms') diff = b.totalRoomsBooked - a.totalRoomsBooked;
      else if (sortBy === 'beds') diff = b.totalExtraBeds - a.totalExtraBeds;
      else if (sortBy === 'bookings') diff = b.totalBookings - a.totalBookings;
      return sortAsc ? -diff : diff;
    });

  const exportExcel = () => {
    if (hotels.length === 0) {
      addToast({ type: 'warning', message: 'No hotel data to export for this month' });
      return;
    }

    const exportRows = hotels.map((h, i) => ({
      '#': i + 1,
      'Hotel / Property': h.hotelName,
      'Location': h.location || '—',
      'Total Rooms Booked': h.totalRoomsBooked,
      'Total Extra Beds': h.totalExtraBeds,
      'Total Packages / Bookings': h.totalBookings,
      'Total Guests (Pax)': h.totalGuests,
      'Reporting Month': monthLabel(),
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hotels Summary');
    XLSX.writeFile(wb, `Hotel_Room_Analytics_${selectedMonth}.xlsx`);
    addToast({ type: 'success', message: 'Hotel monthly analytics exported to Excel' });
  };

  const toggleSort = (field: 'rooms' | 'beds' | 'bookings') => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-700 text-white rounded-2xl shadow-sm">
              <Hotel size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold font-heading text-gray-900 tracking-tight">
                Hotel Room & Extra Bed Analytics
              </h1>
              <p className="text-xs text-gray-500">
                Monthly room reservations, extra bed allocations, and package stay summaries
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
              onClick={fetchHotels}
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
            placeholder="Search hotels, houseboats, resorts by name or destination..."
            className="w-full pl-10 pr-4 py-2.5 text-xs border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-gray-50/50"
          />
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Rooms Booked */}
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white p-5 rounded-3xl border border-amber-200/60 shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-800 font-semibold mb-1">
            <span>Total Rooms Booked</span>
            <BedDouble size={16} className="text-amber-600" />
          </div>
          <div className="text-3xl font-bold font-heading text-amber-950">
            {summary?.totalRoomsBooked ?? 0}
          </div>
          <div className="text-[11px] text-amber-700/80 mt-1">
            Booked across {summary?.totalBookings ?? 0} confirmed packages
          </div>
        </div>

        {/* Total Extra Beds */}
        <div className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-white p-5 rounded-3xl border border-blue-200/60 shadow-xs">
          <div className="flex items-center justify-between text-xs text-blue-800 font-semibold mb-1">
            <span>Total Extra Beds</span>
            <PlusCircle size={16} className="text-blue-600" />
          </div>
          <div className="text-3xl font-bold font-heading text-blue-950">
            {summary?.totalExtraBeds ?? 0}
          </div>
          <div className="text-[11px] text-blue-700/80 mt-1">
            Additional bed allotments in {monthLabel()}
          </div>
        </div>

        {/* Total Associated Bookings */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white p-5 rounded-3xl border border-emerald-200/60 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold mb-1">
            <span>Total Packages</span>
            <Calendar size={16} className="text-emerald-600" />
          </div>
          <div className="text-3xl font-bold font-heading text-emerald-950">
            {summary?.totalBookings ?? 0}
          </div>
          <div className="text-[11px] text-emerald-700/80 mt-1">
            Active in {monthLabel()}
          </div>
        </div>

        {/* Active Hotels Count */}
        <div className="bg-gradient-to-br from-slate-900/5 to-white p-5 rounded-3xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-700 font-semibold mb-1">
            <span>Active Properties</span>
            <Building2 size={16} className="text-gray-600" />
          </div>
          <div className="text-3xl font-bold font-heading text-gray-900">
            {summary?.totalHotels ?? 0}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            Hotels with guest reservations
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold font-heading text-gray-800">
            Hotel Breakdown for {monthLabel()} ({filteredHotels.length} Properties)
          </h2>
          <div className="text-xs text-gray-400">
            Click on any hotel row to inspect guest bookings
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
                  Hotel / Property
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  <button
                    onClick={() => toggleSort('rooms')}
                    className="flex items-center gap-1 hover:text-white"
                  >
                    Rooms Booked <ArrowUpDown size={12} className="text-amber-400" />
                  </button>
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  <button
                    onClick={() => toggleSort('beds')}
                    className="flex items-center gap-1 hover:text-white"
                  >
                    Extra Beds <ArrowUpDown size={12} className="text-blue-400" />
                  </button>
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  <button
                    onClick={() => toggleSort('bookings')}
                    className="flex items-center gap-1 hover:text-white"
                  >
                    Packages <ArrowUpDown size={12} className="text-emerald-400" />
                  </button>
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Total Guests
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Details
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
              ) : filteredHotels.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <Hotel size={32} className="opacity-30" />
                      <span>No hotel bookings found for {monthLabel()}.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredHotels.map((hotel, idx) => {
                  const isExpanded = expandedHotel === hotel.hotelName;

                  return (
                    <React.Fragment key={idx}>
                      <tr
                        onClick={() => setExpandedHotel(isExpanded ? null : hotel.hotelName)}
                        className={`transition-colors cursor-pointer ${
                          isExpanded ? 'bg-amber-50/40' : 'hover:bg-gray-50/70'
                        }`}
                      >
                        <td className="px-5 py-4 text-gray-400 text-xs font-mono">{idx + 1}</td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-gray-900 text-sm">
                            {hotel.hotelName}
                          </div>
                          {hotel.location && (
                            <div className="text-xs text-gray-400">{hotel.location}</div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            <BedDouble size={12} className="text-amber-700" />
                            {hotel.totalRoomsBooked} Room{hotel.totalRoomsBooked > 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            {hotel.totalExtraBeds} Bed{hotel.totalExtraBeds !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg text-xs">
                            {hotel.totalBookings} Booking{hotel.totalBookings > 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-700 text-xs font-medium">
                          {hotel.totalGuests} Guests
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

                      {/* Expandable Drill-Down Bookings List */}
                      {isExpanded && (
                        <tr className="bg-amber-50/20">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-xs space-y-3">
                              <div className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center justify-between">
                                <span>Guest Reservations at {hotel.hotelName} ({hotel.bookings.length})</span>
                                <span className="text-[11px] font-normal text-gray-400">
                                  {monthLabel()}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {hotel.bookings.map((b, bIdx) => (
                                  <div
                                    key={bIdx}
                                    className="p-3 bg-gray-50/80 hover:bg-gray-100/80 rounded-xl border border-gray-200/70 transition-colors text-xs space-y-1.5"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                                        {b.bookingId}
                                      </span>
                                      <span className="font-semibold text-gray-800">
                                        {b.rooms} Room(s) • {b.extraBeds} Extra Bed(s)
                                      </span>
                                    </div>
                                    <div className="font-bold text-gray-900 text-sm">
                                      {b.guestName}
                                    </div>
                                    <div className="text-gray-500 text-[11px]">
                                      {b.checkInDate} → {b.checkOutDate} ({b.totalPax} Guests)
                                    </div>
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
