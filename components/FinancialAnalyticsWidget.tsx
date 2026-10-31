'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, IndianRupee, PieChart, BarChart3,
  Calendar, RefreshCw, ChevronLeft, ChevronRight, ArrowUpRight, DollarSign
} from 'lucide-react';
import { formatDisplayCurrency } from '@/lib/formatters';

interface DonutSlice {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

interface MonthlyData {
  month: string;
  monthKey: string;
  income: number;
  expense: number;
  profit: number;
  bookingsCount: number;
}

interface FinancialData {
  singleMonth: {
    month: string;
    totalIncome: number;
    advanceCollected: number;
    balancePending: number;
    hotelExpense: number;
    cabExpense: number;
    foodExpense?: number;
    otherExpense: number;
    totalExpense: number;
    netProfit: number;
    profitMargin: string;
    bookingsCount: number;
    breakdown: DonutSlice[];
  };
  yearly: {
    year: number;
    totalIncome: number;
    totalExpense: number;
    netProfit: number;
    profitMargin: string;
    timeline: MonthlyData[];
  };
}

export default function FinancialAnalyticsWidget() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthKey = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [viewMode, setViewMode] = useState<'single' | 'yearly'>('single');
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);
  const [hoveredBarMonth, setHoveredBarMonth] = useState<MonthlyData | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/financials?month=${selectedMonth}&year=${selectedYear}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to load financial analytics:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle month step navigation
  const stepMonth = (offset: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + offset, 1);
    const nextKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(nextKey);
    setSelectedYear(d.getFullYear());
  };

  const monthLabel = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  // SVG Donut Path calculations
  const renderDonutSlices = (breakdown: DonutSlice[]) => {
    const total = breakdown.reduce((acc, s) => acc + s.amount, 0);
    if (total <= 0) {
      return (
        <circle
          cx="100"
          cy="100"
          r="70"
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="24"
        />
      );
    }

    let cumulativeAngle = -90; // Start at top
    const radius = 70;
    const cx = 100;
    const cy = 100;

    return breakdown.map((slice, idx) => {
      const sliceAngle = (slice.amount / total) * 360;
      if (sliceAngle <= 0) return null;

      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + sliceAngle;
      cumulativeAngle = endAngle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = cx + radius * Math.cos(startRad);
      const y1 = cy + radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad);
      const y2 = cy + radius * Math.sin(endRad);

      const largeArcFlag = sliceAngle > 180 ? 1 : 0;
      const pathData = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      ].join(' ');

      const isHovered = hoveredSlice === idx;

      return (
        <path
          key={idx}
          d={pathData}
          fill="none"
          stroke={slice.color}
          strokeWidth={isHovered ? 28 : 22}
          strokeLinecap="round"
          className="transition-all duration-300 cursor-pointer"
          onMouseEnter={() => setHoveredSlice(idx)}
          onMouseLeave={() => setHoveredSlice(null)}
          style={{ opacity: hoveredSlice === null || isHovered ? 1 : 0.6 }}
        />
      );
    });
  };

  // Grouped Bar Chart calculations for 12 months
  const maxYearlyValue = data?.yearly.timeline
    ? Math.max(10000, ...data.yearly.timeline.map((m) => Math.max(m.income, m.expense, Math.abs(m.profit))))
    : 100000;

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
      {/* Header with Title & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-xl shadow-xs">
              <TrendingUp size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold font-heading text-gray-900 tracking-tight">
                Financial Performance & Profit Analytics
              </h2>
              <p className="text-xs text-gray-400">
                Live breakdown of Revenue, Vendor Operating Expenses, and Net Margin
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Mode Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Switcher */}
          <div className="bg-gray-100 p-1 rounded-xl flex items-center text-xs font-semibold">
            <button
              onClick={() => setViewMode('single')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === 'single'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <PieChart size={13} />
              Single Month
            </button>
            <button
              onClick={() => setViewMode('yearly')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === 'yearly'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <BarChart3 size={13} />
              12-Month Trend
            </button>
          </div>

          {/* Month / Year Step Navigator */}
          {viewMode === 'single' ? (
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-1 py-0.5 text-xs">
              <button
                onClick={() => stepMonth(-1)}
                className="p-1 hover:bg-white rounded-lg text-gray-600 transition-colors"
                title="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="font-semibold text-gray-800 px-2 min-w-[110px] text-center">
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
          ) : (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1.5 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={fetchData}
            className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 hover:text-gray-800 transition-colors"
            title="Refresh Financial Data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue */}
          <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/40 p-4 rounded-2xl border border-blue-100 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-blue-700 font-semibold mb-1">
              <span>Total Revenue (Income)</span>
              <IndianRupee size={14} className="text-blue-500" />
            </div>
            <div className="text-2xl font-bold font-heading text-blue-950">
              {formatDisplayCurrency(
                viewMode === 'single' ? data.singleMonth.totalIncome : data.yearly.totalIncome
              )}
            </div>
            <div className="text-[11px] text-blue-600/80 mt-1">
              {viewMode === 'single'
                ? `${data.singleMonth.bookingsCount} Package(s) Scheduled`
                : `Across 12 Months in ${selectedYear}`}
            </div>
          </div>

          {/* Operational Expenses */}
          <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/40 p-4 rounded-2xl border border-amber-100 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-amber-800 font-semibold mb-1">
              <span>Total Expenses (Costs)</span>
              <DollarSign size={14} className="text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-heading text-amber-950">
              {formatDisplayCurrency(
                viewMode === 'single' ? data.singleMonth.totalExpense : data.yearly.totalExpense
              )}
            </div>
            <div className="text-[11px] text-amber-700/80 mt-1">
              {viewMode === 'single'
                ? `Hotels: ₹${data.singleMonth.hotelExpense.toLocaleString('en-IN')} • Cabs: ₹${data.singleMonth.cabExpense.toLocaleString('en-IN')}${data.singleMonth.foodExpense ? ` • Food: ₹${data.singleMonth.foodExpense.toLocaleString('en-IN')}` : ''}`
                : `Total Vendor & Operating Outflows`}
            </div>
          </div>

          {/* Net Profit */}
          <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/40 p-4 rounded-2xl border border-emerald-100 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold mb-1">
              <span>Net Profit</span>
              <TrendingUp size={14} className="text-emerald-600" />
            </div>
            <div
              className={`text-2xl font-bold font-heading ${
                (viewMode === 'single' ? data.singleMonth.netProfit : data.yearly.netProfit) >= 0
                  ? 'text-emerald-900'
                  : 'text-red-600'
              }`}
            >
              {formatDisplayCurrency(
                viewMode === 'single' ? data.singleMonth.netProfit : data.yearly.netProfit
              )}
            </div>
            <div className="text-[11px] text-emerald-700/80 mt-1 flex items-center gap-1">
              <span className="font-bold">
                {viewMode === 'single' ? data.singleMonth.profitMargin : data.yearly.profitMargin}%
              </span>
              <span>Net Profit Margin</span>
            </div>
          </div>

          {/* Collections / Balance */}
          <div className="bg-gradient-to-br from-slate-50 to-gray-50 p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-gray-600 font-semibold mb-1">
              <span>Collection Status</span>
              <ArrowUpRight size={14} className="text-gray-400" />
            </div>
            <div className="text-2xl font-bold font-heading text-gray-900">
              {viewMode === 'single'
                ? formatDisplayCurrency(data.singleMonth.advanceCollected)
                : `${data.yearly.timeline.reduce((acc, m) => acc + m.bookingsCount, 0)} Tours`}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              {viewMode === 'single'
                ? `Pending: ₹${data.singleMonth.balancePending.toLocaleString('en-IN')}`
                : `Completed Operations Year ${selectedYear}`}
            </div>
          </div>
        </div>
      )}

      {/* Main Chart Area */}
      {viewMode === 'single' && data && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-2">
          {/* Donut Chart Visualization (Left 5 Cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-4">
            <div className="relative w-56 h-56">
              <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                {renderDonutSlices(data.singleMonth.breakdown)}
              </svg>

              {/* Center Metrics Pill */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[11px] text-gray-400 font-medium">Net Profit Margin</span>
                <span className="text-2xl font-bold font-heading text-gray-900">
                  {data.singleMonth.profitMargin}%
                </span>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full mt-0.5">
                  ₹{data.singleMonth.netProfit.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 text-center mt-2">
              Hover over slices to inspect revenue distribution
            </p>
          </div>

          {/* Breakdown Cards & Details (Right 7 Cols) */}
          <div className="lg:col-span-7 space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Expense vs. Net Profit Breakdown ({monthLabel()})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.singleMonth.breakdown.map((item, idx) => (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredSlice(idx)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    hoveredSlice === idx
                      ? 'border-gray-400 shadow-md bg-gray-50/80 scale-[1.02]'
                      : 'border-gray-100 hover:border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs font-semibold text-gray-800">{item.name}</span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                      {item.percentage}%
                    </span>
                  </div>
                  <div className="text-lg font-bold font-heading text-gray-900 pl-5">
                    {formatDisplayCurrency(item.amount)}
                  </div>
                </div>
              ))}
            </div>

            {/* Total Balance vs Advance Banner */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between mt-3 shadow-sm">
              <div>
                <span className="text-xs text-white/60">Collected vs Pending Ratio</span>
                <div className="text-sm font-bold text-white mt-0.5">
                  ₹{data.singleMonth.advanceCollected.toLocaleString('en-IN')} collected • ₹{data.singleMonth.balancePending.toLocaleString('en-IN')} pending
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-amber-400 bg-white/10 px-2.5 py-1 rounded-lg">
                  {data.singleMonth.totalIncome > 0
                    ? `${Math.round((data.singleMonth.advanceCollected / data.singleMonth.totalIncome) * 100)}% Collected`
                    : '0%'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 12-Month Grouped Bar Chart Area */}
      {viewMode === 'yearly' && data && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Monthly Revenue, Expense & Profit Comparison ({selectedYear})
            </h3>
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-blue-600" />
                <span className="text-gray-700">Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-amber-500" />
                <span className="text-gray-700">Expenses</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                <span className="text-gray-700">Net Profit</span>
              </div>
            </div>
          </div>

          {/* SVG Grouped Bar Chart */}
          <div className="relative bg-slate-50/80 rounded-2xl p-4 border border-gray-100 overflow-x-auto">
            <div className="min-w-[680px] h-64 flex flex-col justify-end">
              {/* Bars container */}
              <div className="flex items-end justify-between h-48 gap-2 px-2 border-b border-gray-200">
                {data.yearly.timeline.map((m, idx) => {
                  const incomeH = (m.income / maxYearlyValue) * 100;
                  const expenseH = (m.expense / maxYearlyValue) * 100;
                  const profitH = (Math.max(0, m.profit) / maxYearlyValue) * 100;

                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredBarMonth(m)}
                      onMouseLeave={() => setHoveredBarMonth(null)}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                    >
                      {/* Bar Group */}
                      <div className="flex items-end gap-1 w-full justify-center">
                        {/* Revenue Bar */}
                        <div
                          style={{ height: `${Math.max(4, incomeH)}%` }}
                          className="w-2.5 bg-blue-600 rounded-t-sm transition-all duration-300 group-hover:brightness-110"
                          title={`Revenue: ₹${m.income.toLocaleString('en-IN')}`}
                        />
                        {/* Expense Bar */}
                        <div
                          style={{ height: `${Math.max(4, expenseH)}%` }}
                          className="w-2.5 bg-amber-500 rounded-t-sm transition-all duration-300 group-hover:brightness-110"
                          title={`Expense: ₹${m.expense.toLocaleString('en-IN')}`}
                        />
                        {/* Profit Bar */}
                        <div
                          style={{ height: `${Math.max(4, profitH)}%` }}
                          className="w-2.5 bg-emerald-500 rounded-t-sm transition-all duration-300 group-hover:brightness-110"
                          title={`Profit: ₹${m.profit.toLocaleString('en-IN')}`}
                        />
                      </div>

                      {/* Month label */}
                      <span className="text-[11px] font-semibold text-gray-600 mt-2">
                        {m.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hover Tooltip Overlay */}
            {hoveredBarMonth && (
              <div className="absolute top-4 right-4 bg-[#0B192C] text-white p-3 rounded-xl shadow-xl text-xs space-y-1 z-10 animate-in fade-in duration-150">
                <div className="font-bold border-b border-white/20 pb-1 text-amber-300">
                  {hoveredBarMonth.month} {selectedYear} ({hoveredBarMonth.bookingsCount} Tours)
                </div>
                <div className="text-blue-300">Revenue: ₹{hoveredBarMonth.income.toLocaleString('en-IN')}</div>
                <div className="text-amber-300">Expenses: ₹{hoveredBarMonth.expense.toLocaleString('en-IN')}</div>
                <div className="text-emerald-300 font-bold">
                  Net Profit: ₹{hoveredBarMonth.profit.toLocaleString('en-IN')}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
