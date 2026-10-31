'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  UtensilsCrossed, Search, Plus, Filter, Download, RefreshCw,
  Calendar, Store, IndianRupee, Users, Edit, Trash2, ChevronDown,
  Building2, CheckCircle2, Clock
} from 'lucide-react';
import { formatDisplayCurrency } from '@/lib/formatters';
import { ToastMessage } from './Toast';
import FoodModal, { FoodLogItem } from './FoodModal';
import * as XLSX from 'xlsx';

interface FoodTabProps {
  addToast: (msg: Omit<ToastMessage, 'id'>) => void;
  onViewPackage?: (packageId: string) => void;
}

export default function FoodTab({ addToast, onViewPackage }: FoodTabProps) {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [mealTypeFilter, setMealTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [foodLogs, setFoodLogs] = useState<FoodLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLogForEdit, setSelectedLogForEdit] = useState<FoodLogItem | null>(null);

  const fetchFoodLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedMonth && selectedMonth !== 'all') {
        params.set('month', selectedMonth);
      }
      if (mealTypeFilter !== 'all') {
        params.set('mealType', mealTypeFilter);
      }
      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim());
      }

      const res = await fetch(`/api/food?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFoodLogs(Array.isArray(data) ? data : []);
      } else {
        addToast({ type: 'error', message: 'Failed to fetch food dining records' });
      }
    } catch {
      addToast({ type: 'error', message: 'Network error fetching food records' });
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, mealTypeFilter, searchTerm, addToast]);

  useEffect(() => {
    fetchFoodLogs();
  }, [fetchFoodLogs]);

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this dining expense record?')) return;

    try {
      const res = await fetch(`/api/food/${id}`, { method: 'DELETE' });
      if (res.ok) {
        addToast({ type: 'success', message: 'Dining log deleted' });
        fetchFoodLogs();
      } else {
        addToast({ type: 'error', message: 'Failed to delete dining record' });
      }
    } catch {
      addToast({ type: 'error', message: 'Network error deleting dining record' });
    }
  };

  // Group by Restaurant for Food Vendor Summary
  const restaurantSummary = useMemo(() => {
    const map = new Map<string, {
      name: string;
      totalMeals: number;
      totalPax: number;
      totalCost: number;
      pendingCost: number;
      mealTypes: Set<string>;
    }>();

    for (const log of foodLogs) {
      const name = log.restaurantName || 'Unknown Venue';
      const key = name.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: name.trim(),
          totalMeals: 0,
          totalPax: 0,
          totalCost: 0,
          pendingCost: 0,
          mealTypes: new Set(),
        });
      }
      const entry = map.get(key)!;
      entry.totalMeals += 1;
      entry.totalPax += Number(log.paxCount) || 1;
      entry.totalCost += Number(log.foodCost) || 0;
      if (log.paymentStatus === 'Pending') {
        entry.pendingCost += Number(log.foodCost) || 0;
      }
      if (log.mealType) {
        entry.mealTypes.add(log.mealType);
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost);
  }, [foodLogs]);

  // Overall KPI metrics
  const totalFoodExpense = useMemo(() => {
    return foodLogs.reduce((sum, item) => sum + (Number(item.foodCost) || 0), 0);
  }, [foodLogs]);

  const totalMealsCount = foodLogs.length;

  const totalPaxServed = useMemo(() => {
    return foodLogs.reduce((sum, item) => sum + (Number(item.paxCount) || 1), 0);
  }, [foodLogs]);

  const avgCostPerMeal = totalMealsCount > 0 ? Math.round(totalFoodExpense / totalMealsCount) : 0;

  // Export to Excel
  const handleExportExcel = () => {
    if (foodLogs.length === 0) {
      addToast({ type: 'warning', message: 'No dining records to export' });
      return;
    }

    const data = foodLogs.map((log) => ({
      'Date': log.mealDate ? new Date(log.mealDate).toLocaleDateString('en-IN') : '—',
      'Booking ID': log.packageId || '—',
      'Guest Name': log.guestName,
      'Meal Type': log.mealType,
      'Restaurant / Hotel': log.restaurantName,
      'Pax Count': log.paxCount || 1,
      'Food Bill Amount (₹)': log.foodCost,
      'Payment Status': log.paymentStatus || 'Pending',
      'Remarks': log.remarks || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Food & Dining Bills');
    XLSX.writeFile(wb, `Food_Dining_Bills_${selectedMonth}.xlsx`);
    addToast({ type: 'success', message: 'Dining report downloaded' });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md">
            <UtensilsCrossed size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold font-heading text-gray-900 tracking-tight">
              Food & Dining Management
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Track dining bills per package, guest meal allocations, and restaurant vendor payables
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
          {/* Month selector */}
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
            onClick={() => {
              setSelectedLogForEdit(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:opacity-90"
            style={{ backgroundColor: '#FF9F1C' }}
          >
            <Plus size={15} />
            <span>Record Dining Bill</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 text-xs font-semibold transition-colors"
            title="Download Excel Report"
          >
            <Download size={16} />
          </button>

          <button
            onClick={fetchFoodLogs}
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
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs font-semibold text-gray-400 flex items-center gap-1.5 mb-1">
            <IndianRupee size={14} className="text-amber-500" />
            Total Dining Bills
          </div>
          <div className="text-2xl font-bold font-heading text-gray-900">
            {formatDisplayCurrency(totalFoodExpense)}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Across all logged meals</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs font-semibold text-gray-400 flex items-center gap-1.5 mb-1">
            <UtensilsCrossed size={14} className="text-orange-500" />
            Total Meals Logged
          </div>
          <div className="text-2xl font-bold font-heading text-gray-900">
            {totalMealsCount}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">{totalPaxServed} total pax dining</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs font-semibold text-gray-400 flex items-center gap-1.5 mb-1">
            <Store size={14} className="text-blue-500" />
            Dining Partners / Venues
          </div>
          <div className="text-2xl font-bold font-heading text-gray-900">
            {restaurantSummary.length}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Active restaurants & hotels</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs font-semibold text-gray-400 flex items-center gap-1.5 mb-1">
            <IndianRupee size={14} className="text-emerald-500" />
            Average Cost / Meal
          </div>
          <div className="text-2xl font-bold font-heading text-emerald-600">
            {formatDisplayCurrency(avgCostPerMeal)}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Per dining instance</p>
        </div>
      </div>

      {/* Food Vendor Summary Section */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold font-heading text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Store size={16} className="text-amber-500" />
              Restaurant & Food Vendor Summary
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Aggregated bills and payable amounts grouped by dining venue for {selectedMonth}
            </p>
          </div>
          <span className="text-xs bg-amber-50 text-amber-800 font-bold px-3 py-1 rounded-full border border-amber-200">
            {restaurantSummary.length} Venues
          </span>
        </div>

        {restaurantSummary.length === 0 ? (
          <div className="text-center py-8 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            <UtensilsCrossed size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-xs font-semibold text-gray-600">No dining bills recorded for this month</p>
            <p className="text-[11px] text-gray-400 mt-1">
              Click &quot;Record Dining Bill&quot; to log guest meals and track restaurant expenses.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-y border-gray-200 text-gray-600 uppercase font-bold text-[11px]">
                  <th className="py-3 px-4">Restaurant / Hotel Name</th>
                  <th className="py-3 px-4 text-center">Total Meals</th>
                  <th className="py-3 px-4 text-center">Total Pax</th>
                  <th className="py-3 px-4">Meal Types Served</th>
                  <th className="py-3 px-4 text-right">Pending Payable (₹)</th>
                  <th className="py-3 px-4 text-right">Total Bill Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {restaurantSummary.map((item, idx) => (
                  <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-gray-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                        {item.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{item.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-gray-700">
                      {item.totalMeals}
                    </td>
                    <td className="py-3.5 px-4 text-center text-gray-600">
                      {item.totalPax} Guests
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 flex-wrap">
                        {Array.from(item.mealTypes).map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-700"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-amber-700">
                      {item.pendingCost > 0 ? formatDisplayCurrency(item.pendingCost) : '₹0'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900 text-sm">
                      {formatDisplayCurrency(item.totalCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Individual Meal Records List with Filters */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold font-heading text-gray-900 uppercase tracking-wider">
              Detailed Dining & Meal Entries
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Individual bill records linked to packages
            </p>
          </div>

          {/* Search & Meal Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search guest, venue, package..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <select
              value={mealTypeFilter}
              onChange={(e) => setMealTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-medium"
            >
              <option value="all">All Meal Types</option>
              <option value="Breakfast">Breakfast</option>
              <option value="Lunch">Lunch</option>
              <option value="Dinner">Dinner</option>
              <option value="Snacks">Snacks</option>
            </select>
          </div>
        </div>

        {/* Logs Table */}
        {foodLogs.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-200 rounded-2xl bg-gray-50">
            <UtensilsCrossed size={36} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-semibold text-gray-600">No dining entries found</p>
            <p className="text-xs text-gray-400 mt-1">
              Try adjusting your search filters or click &quot;Record Dining Bill&quot; to add a new record.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-y border-gray-200 text-gray-600 uppercase font-bold text-[11px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Booking / Guest</th>
                  <th className="py-3 px-4">Meal Type</th>
                  <th className="py-3 px-4">Restaurant / Venue</th>
                  <th className="py-3 px-4 text-center">Pax</th>
                  <th className="py-3 px-4 text-right">Cost (₹)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {foodLogs.map((log) => {
                  const dateStr = log.mealDate
                    ? new Date(log.mealDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—';

                  return (
                    <tr key={log._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-gray-700 whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900">{log.guestName}</div>
                        {log.packageId && (
                          <button
                            type="button"
                            onClick={() => onViewPackage && onViewPackage(log.packageId!)}
                            className="text-[11px] font-mono text-blue-600 hover:underline flex items-center gap-1"
                          >
                            {log.packageId}
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            log.mealType === 'Breakfast'
                              ? 'bg-amber-100 text-amber-800'
                              : log.mealType === 'Lunch'
                              ? 'bg-orange-100 text-orange-800'
                              : log.mealType === 'Dinner'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {log.mealType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-800">
                        {log.restaurantName}
                        {log.remarks && (
                          <div className="text-[10px] text-gray-400 italic">{log.remarks}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-gray-600">
                        {log.paxCount || 1}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                        {formatDisplayCurrency(log.foodCost)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            log.paymentStatus === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {log.paymentStatus === 'Paid' ? (
                            <>
                              <CheckCircle2 size={10} /> Paid
                            </>
                          ) : (
                            <>
                              <Clock size={10} /> Payable
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedLogForEdit(log);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(log._id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <FoodModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedLogForEdit(null);
        }}
        onSave={fetchFoodLogs}
        editData={selectedLogForEdit}
        addToast={addToast}
      />
    </div>
  );
}

