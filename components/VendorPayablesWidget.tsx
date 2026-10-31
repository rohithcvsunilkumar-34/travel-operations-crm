'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Receipt, Hotel, Truck, UtensilsCrossed, Calendar, Search,
  Download, RefreshCw, ChevronDown, ChevronRight, IndianRupee,
  Building2, Users, FileText, CheckCircle2
} from 'lucide-react';
import { formatDisplayCurrency, getCrossMonthInfo } from '@/lib/formatters';
import { ToastMessage } from './Toast';
import * as XLSX from 'xlsx';

interface VendorPayablesWidgetProps {
  addToast: (msg: Omit<ToastMessage, 'id'>) => void;
  onViewPackage?: (packageId: string) => void;
}

export default function VendorPayablesWidget({ addToast, onViewPackage }: VendorPayablesWidgetProps) {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [activeTab, setActiveTab] = useState<'hotel' | 'cab' | 'food'>('hotel');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const [payablesData, setPayablesData] = useState<{
    summary: {
      totalHotelPayables: number;
      totalCabPayables: number;
      totalFoodPayables: number;
      grandTotalPayables: number;
      activeMonth: string;
    };
    hotelBills: Array<{
      hotelName: string;
      totalBookings: number;
      totalRooms: number;
      totalAmountPayable: number;
      bookings: Array<{
        bookingId: string;
        guestName: string;
        checkIn: string;
        checkOut: string;
        amount: number;
      }>;
    }>;
    cabBills: Array<{
      vendorName: string;
      driverName: string;
      totalTrips: number;
      totalCabs: number;
      totalAmountPayable: number;
      trips: Array<{
        date: string;
        packageId: string;
        route: string;
        vehicle: string;
        amount: number;
      }>;
    }>;
    foodBills: Array<{
      restaurantName: string;
      totalMeals: number;
      totalPax: number;
      totalAmountPayable: number;
      meals: Array<{
        date: string;
        packageId: string;
        guestName: string;
        mealType: string;
        amount: number;
      }>;
    }>;
  }>({
    summary: {
      totalHotelPayables: 0,
      totalCabPayables: 0,
      totalFoodPayables: 0,
      grandTotalPayables: 0,
      activeMonth: currentMonthKey,
    },
    hotelBills: [],
    cabBills: [],
    foodBills: [],
  });

  // Track expanded rows in each tab
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchPayables = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/payables?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setPayablesData(data);
      } else {
        addToast({ type: 'error', message: 'Failed to load vendor payables data' });
      }
    } catch {
      addToast({ type: 'error', message: 'Network error fetching payables' });
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, addToast]);

  useEffect(() => {
    fetchPayables();
  }, [fetchPayables]);

  // Filtered lists
  const filteredHotelBills = useMemo(() => {
    if (!searchTerm.trim()) return payablesData.hotelBills;
    const term = searchTerm.toLowerCase();
    return payablesData.hotelBills.filter((h) => h.hotelName.toLowerCase().includes(term));
  }, [payablesData.hotelBills, searchTerm]);

  const filteredCabBills = useMemo(() => {
    if (!searchTerm.trim()) return payablesData.cabBills;
    const term = searchTerm.toLowerCase();
    return payablesData.cabBills.filter(
      (c) =>
        c.vendorName.toLowerCase().includes(term) ||
        c.driverName.toLowerCase().includes(term)
    );
  }, [payablesData.cabBills, searchTerm]);

  const filteredFoodBills = useMemo(() => {
    if (!searchTerm.trim()) return payablesData.foodBills;
    const term = searchTerm.toLowerCase();
    return payablesData.foodBills.filter((f) =>
      f.restaurantName.toLowerCase().includes(term)
    );
  }, [payablesData.foodBills, searchTerm]);

  // Excel export
  const exportPayablesExcel = () => {
    const wb = XLSX.utils.book_new();

    // 1. Hotel Sheet
    const hotelRows = payablesData.hotelBills.map((h) => ({
      'Hotel Name': h.hotelName,
      'Total Bookings': h.totalBookings,
      'Total Rooms Allotted': h.totalRooms,
      'Total Amount Payable (₹)': h.totalAmountPayable,
    }));
    const wsHotel = XLSX.utils.json_to_sheet(hotelRows);
    XLSX.utils.book_append_sheet(wb, wsHotel, 'Hotel Bills');

    // 2. Cab Sheet
    const cabRows = payablesData.cabBills.map((c) => ({
      'Vendor / Driver Name': c.vendorName,
      'Driver Name': c.driverName || '—',
      'Total Days / Trips': c.totalTrips,
      'Total Cabs Allotted': c.totalCabs,
      'Total Amount Payable (₹)': c.totalAmountPayable,
    }));
    const wsCab = XLSX.utils.json_to_sheet(cabRows);
    XLSX.utils.book_append_sheet(wb, wsCab, 'Cab Vendor Bills');

    // 3. Food Sheet
    const foodRows = payablesData.foodBills.map((f) => ({
      'Restaurant / Venue': f.restaurantName,
      'Total Meals': f.totalMeals,
      'Total Pax': f.totalPax,
      'Total Amount Payable (₹)': f.totalAmountPayable,
    }));
    const wsFood = XLSX.utils.json_to_sheet(foodRows);
    XLSX.utils.book_append_sheet(wb, wsFood, 'Food Bills');

    XLSX.writeFile(wb, `Vendor_Payables_Statement_${selectedMonth}.xlsx`);
    addToast({ type: 'success', message: 'Vendor Payables Statement downloaded' });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-amber-400 flex items-center justify-center shadow-md">
            <Receipt size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold font-heading text-gray-900 tracking-tight">
              Vendor Payables & Billing Dashboard
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Comprehensive statement of operational liabilities across Hotels, Cab Fleets, and Restaurants
            </p>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700">
            <Calendar size={14} className="text-amber-600" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer text-xs font-bold text-gray-800"
            />
          </div>

          <button
            onClick={exportPayablesExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:opacity-90"
            style={{ backgroundColor: '#0B192C' }}
          >
            <Download size={15} className="text-amber-400" />
            <span>Export Statement</span>
          </button>

          <button
            onClick={fetchPayables}
            disabled={loading}
            className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 text-xs font-semibold transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Hotel Payables */}
        <div
          onClick={() => setActiveTab('hotel')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all ${
            activeTab === 'hotel'
              ? 'border-amber-400 ring-2 ring-amber-100 shadow-md'
              : 'border-gray-100 shadow-sm hover:border-gray-200'
          }`}
        >
          <div className="text-xs font-semibold text-gray-400 flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5">
              <Hotel size={14} className="text-amber-500" />
              Hotel Bills Payable
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
              {payablesData.hotelBills.length} Hotels
            </span>
          </div>
          <div className="text-2xl font-bold font-heading text-amber-900">
            {formatDisplayCurrency(payablesData.summary.totalHotelPayables)}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Room charges & stay costs</p>
        </div>

        {/* Cab Payables */}
        <div
          onClick={() => setActiveTab('cab')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all ${
            activeTab === 'cab'
              ? 'border-blue-400 ring-2 ring-blue-100 shadow-md'
              : 'border-gray-100 shadow-sm hover:border-gray-200'
          }`}
        >
          <div className="text-xs font-semibold text-gray-400 flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5">
              <Truck size={14} className="text-blue-500" />
              Cab Vendor Bills
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
              {payablesData.cabBills.length} Vendors
            </span>
          </div>
          <div className="text-2xl font-bold font-heading text-blue-900">
            {formatDisplayCurrency(payablesData.summary.totalCabPayables)}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Daily fleet & driver charges</p>
        </div>

        {/* Food Payables */}
        <div
          onClick={() => setActiveTab('food')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all ${
            activeTab === 'food'
              ? 'border-orange-400 ring-2 ring-orange-100 shadow-md'
              : 'border-gray-100 shadow-sm hover:border-gray-200'
          }`}
        >
          <div className="text-xs font-semibold text-gray-400 flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5">
              <UtensilsCrossed size={14} className="text-orange-500" />
              Food & Restaurant Bills
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-50 text-orange-700">
              {payablesData.foodBills.length} Venues
            </span>
          </div>
          <div className="text-2xl font-bold font-heading text-orange-950">
            {formatDisplayCurrency(payablesData.summary.totalFoodPayables)}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Dining bills & refreshments</p>
        </div>

        {/* Grand Total */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-4 shadow-sm border border-slate-800">
          <div className="text-xs font-semibold text-white/60 flex items-center gap-1.5 mb-1">
            <IndianRupee size={14} className="text-emerald-400" />
            Grand Total Payables
          </div>
          <div className="text-2xl font-bold font-heading text-emerald-400">
            {formatDisplayCurrency(payablesData.summary.grandTotalPayables)}
          </div>
          <p className="text-[11px] text-white/50 mt-1">Total outstanding operational bill</p>
        </div>
      </div>

      {/* 3 Tabs Container */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
        {/* Tab Headers & Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('hotel')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'hotel'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Hotel size={14} />
              <span>1. Hotel Bills ({payablesData.hotelBills.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('cab')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'cab'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Truck size={14} />
              <span>2. Cab Vendor Bills ({payablesData.cabBills.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('food')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'food'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <UtensilsCrossed size={14} />
              <span>3. Food & Restaurant Bills ({payablesData.foodBills.length})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${activeTab === 'hotel' ? 'hotel' : activeTab === 'cab' ? 'vendor/driver' : 'restaurant'}...`}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* TAB 1: Hotel Bills */}
        {activeTab === 'hotel' && (
          <div className="space-y-3">
            {filteredHotelBills.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-gray-200 rounded-2xl bg-gray-50">
                <Hotel size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-xs font-semibold text-gray-600">No hotel bills found for {selectedMonth}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-y border-gray-200 text-gray-600 uppercase font-bold text-[11px]">
                      <th className="py-3 px-4">Hotel Name</th>
                      <th className="py-3 px-4 text-center">Total Bookings</th>
                      <th className="py-3 px-4 text-center">Total Rooms Allotted</th>
                      <th className="py-3 px-4 text-right">Total Amount Payable (₹)</th>
                      <th className="py-3 px-4 text-center w-16">Drilldown</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredHotelBills.map((hotel, idx) => {
                      const rowKey = `hotel-${idx}-${hotel.hotelName}`;
                      const isExpanded = !!expandedRows[rowKey];

                      return (
                        <tr key={rowKey} className="group hover:bg-amber-50/20">
                          <td colSpan={5} className="p-0">
                            <div className="flex items-center justify-between py-3.5 px-4 cursor-pointer" onClick={() => toggleExpand(rowKey)}>
                              <div className="flex items-center gap-2.5 font-bold text-gray-900 text-sm">
                                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                                  {hotel.hotelName.charAt(0).toUpperCase()}
                                </div>
                                <span>{hotel.hotelName}</span>
                              </div>

                              <div className="flex items-center gap-6">
                                <div className="text-center w-28 font-semibold text-gray-700">
                                  {hotel.totalBookings} Booking{hotel.totalBookings !== 1 ? 's' : ''}
                                </div>
                                <div className="text-center w-28 text-gray-600">
                                  {hotel.totalRooms} Rooms
                                </div>
                                <div className="text-right w-40 font-mono font-bold text-gray-900 text-sm">
                                  {formatDisplayCurrency(hotel.totalAmountPayable)}
                                </div>
                                <div className="w-8 flex justify-center text-gray-400 group-hover:text-amber-600">
                                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </div>
                              </div>
                            </div>

                            {/* Drilldown Section */}
                            {isExpanded && hotel.bookings.length > 0 && (
                              <div className="bg-slate-50 p-4 border-t border-gray-100 space-y-2">
                                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                  Bookings breakdown for {hotel.hotelName}:
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {hotel.bookings.map((b, bIdx) => (
                                    <div
                                      key={bIdx}
                                      className="p-2.5 bg-white rounded-xl border border-gray-200 text-xs shadow-2xs flex items-center justify-between"
                                    >
                                      <div>
                                        <div className="font-bold text-gray-900">{b.guestName}</div>
                                        <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5 flex-wrap">
                                          <span>{b.bookingId} &bull; {b.checkIn} to {b.checkOut}</span>
                                          {(() => {
                                            const cm = getCrossMonthInfo(b.checkIn, b.checkOut);
                                            return cm.isCrossMonth ? (
                                              <span
                                                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
                                                title="Cross-month stay"
                                              >
                                                <span className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                                                {cm.label}
                                              </span>
                                            ) : null;
                                          })()}
                                        </div>
                                      </div>
                                      <div className="font-mono font-bold text-amber-700">
                                        {formatDisplayCurrency(b.amount)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Cab Vendor Bills */}
        {activeTab === 'cab' && (
          <div className="space-y-3">
            {filteredCabBills.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-gray-200 rounded-2xl bg-gray-50">
                <Truck size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-xs font-semibold text-gray-600">No cab vendor bills found for {selectedMonth}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-y border-gray-200 text-gray-600 uppercase font-bold text-[11px]">
                      <th className="py-3 px-4">Vendor / Driver Name</th>
                      <th className="py-3 px-4 text-center">Total Days / Trips</th>
                      <th className="py-3 px-4 text-center">Total Cabs Allotted</th>
                      <th className="py-3 px-4 text-right">Total Amount Payable (₹)</th>
                      <th className="py-3 px-4 text-center w-16">Drilldown</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCabBills.map((cab, idx) => {
                      const rowKey = `cab-${idx}-${cab.vendorName}`;
                      const isExpanded = !!expandedRows[rowKey];

                      return (
                        <tr key={rowKey} className="group hover:bg-blue-50/20">
                          <td colSpan={5} className="p-0">
                            <div className="flex items-center justify-between py-3.5 px-4 cursor-pointer" onClick={() => toggleExpand(rowKey)}>
                              <div className="flex items-center gap-2.5 font-bold text-gray-900 text-sm">
                                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                                  {cab.vendorName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div>{cab.vendorName}</div>
                                  {cab.driverName && cab.driverName !== cab.vendorName && (
                                    <div className="text-[11px] font-normal text-gray-500">
                                      Driver: {cab.driverName}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-6">
                                <div className="text-center w-28 font-semibold text-gray-700">
                                  {cab.totalTrips} Trip{cab.totalTrips !== 1 ? 's' : ''}
                                </div>
                                <div className="text-center w-28 text-gray-600">
                                  {cab.totalCabs} Cabs
                                </div>
                                <div className="text-right w-40 font-mono font-bold text-gray-900 text-sm">
                                  {formatDisplayCurrency(cab.totalAmountPayable)}
                                </div>
                                <div className="w-8 flex justify-center text-gray-400 group-hover:text-blue-600">
                                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </div>
                              </div>
                            </div>

                            {/* Drilldown Section */}
                            {isExpanded && cab.trips.length > 0 && (
                              <div className="bg-slate-50 p-4 border-t border-gray-100 space-y-2">
                                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                  Trip logs for {cab.vendorName}:
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {cab.trips.map((t, tIdx) => (
                                    <div
                                      key={tIdx}
                                      className="p-2.5 bg-white rounded-xl border border-gray-200 text-xs shadow-2xs flex items-center justify-between"
                                    >
                                      <div>
                                        <div className="font-semibold text-gray-900">{t.route || 'Local movement'}</div>
                                        <div className="text-[10px] text-gray-500 font-mono">
                                          {t.date} &bull; {t.vehicle} {t.packageId && `&bull; ${t.packageId}`}
                                        </div>
                                      </div>
                                      <div className="font-mono font-bold text-blue-700">
                                        {formatDisplayCurrency(t.amount)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Food / Restaurant Bills */}
        {activeTab === 'food' && (
          <div className="space-y-3">
            {filteredFoodBills.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-gray-200 rounded-2xl bg-gray-50">
                <UtensilsCrossed size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-xs font-semibold text-gray-600">No restaurant bills found for {selectedMonth}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-y border-gray-200 text-gray-600 uppercase font-bold text-[11px]">
                      <th className="py-3 px-4">Restaurant / Hotel Name</th>
                      <th className="py-3 px-4 text-center">Total Meals</th>
                      <th className="py-3 px-4 text-center">Total Pax Served</th>
                      <th className="py-3 px-4 text-right">Total Amount Payable (₹)</th>
                      <th className="py-3 px-4 text-center w-16">Drilldown</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredFoodBills.map((food, idx) => {
                      const rowKey = `food-${idx}-${food.restaurantName}`;
                      const isExpanded = !!expandedRows[rowKey];

                      return (
                        <tr key={rowKey} className="group hover:bg-orange-50/20">
                          <td colSpan={5} className="p-0">
                            <div className="flex items-center justify-between py-3.5 px-4 cursor-pointer" onClick={() => toggleExpand(rowKey)}>
                              <div className="flex items-center gap-2.5 font-bold text-gray-900 text-sm">
                                <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-800 flex items-center justify-center font-bold text-xs">
                                  {food.restaurantName.charAt(0).toUpperCase()}
                                </div>
                                <span>{food.restaurantName}</span>
                              </div>

                              <div className="flex items-center gap-6">
                                <div className="text-center w-28 font-semibold text-gray-700">
                                  {food.totalMeals} Meal{food.totalMeals !== 1 ? 's' : ''}
                                </div>
                                <div className="text-center w-28 text-gray-600">
                                  {food.totalPax} Guests
                                </div>
                                <div className="text-right w-40 font-mono font-bold text-gray-900 text-sm">
                                  {formatDisplayCurrency(food.totalAmountPayable)}
                                </div>
                                <div className="w-8 flex justify-center text-gray-400 group-hover:text-orange-600">
                                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </div>
                              </div>
                            </div>

                            {/* Drilldown Section */}
                            {isExpanded && food.meals.length > 0 && (
                              <div className="bg-slate-50 p-4 border-t border-gray-100 space-y-2">
                                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                  Dining entries at {food.restaurantName}:
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {food.meals.map((m, mIdx) => (
                                    <div
                                      key={mIdx}
                                      className="p-2.5 bg-white rounded-xl border border-gray-200 text-xs shadow-2xs flex items-center justify-between"
                                    >
                                      <div>
                                        <div className="font-bold text-gray-900">
                                          {m.guestName} <span className="text-gray-500 font-normal">({m.mealType})</span>
                                        </div>
                                        <div className="text-[10px] text-gray-500 font-mono">
                                          {m.date} {m.packageId && `&bull; ${m.packageId}`}
                                        </div>
                                      </div>
                                      <div className="font-mono font-bold text-orange-700">
                                        {formatDisplayCurrency(m.amount)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

