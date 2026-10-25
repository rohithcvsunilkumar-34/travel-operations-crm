'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Download, ArrowUpDown, ArrowUp, ArrowDown,
  Edit, Trash2, Truck, Users, Calendar, Filter, ChevronUp, ChevronDown, Phone
} from 'lucide-react';
import { ToastMessage } from './Toast';
import VehicleModal from './VehicleModal';
import * as XLSX from 'xlsx';

interface VehicleLog {
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

interface FleetTabProps {
  addToast: (msg: Omit<ToastMessage, 'id'>) => void;
  defaultDate?: string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function FleetTab({ addToast, defaultDate }: FleetTabProps) {
  const [vehicles, setVehicles] = useState<VehicleLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [singleDate, setSingleDate] = useState(defaultDate || '');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showModal, setShowModal] = useState(false);
  const [editLog, setEditLog] = useState<VehicleLog | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (singleDate) {
        params.set('date', singleDate);
      } else {
        if (fromDate) params.set('fromDate', fromDate);
        if (toDate) params.set('toDate', toDate);
      }
      params.set('sort', sortDir);

      const res = await fetch(`/api/vehicles?${params}`);
      if (res.ok) {
        setVehicles(await res.json());
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to load vehicle logs' });
    } finally {
      setLoading(false);
    }
  }, [search, singleDate, fromDate, toDate, sortDir, addToast]);

  useEffect(() => {
    const timer = setTimeout(fetchVehicles, 300);
    return () => clearTimeout(timer);
  }, [fetchVehicles]);

  const handleDelete = async (log: VehicleLog) => {
    if (
      !confirm(
        `Delete vehicle log for ${log.guestName} (${log.vehicleType} - ${formatDate(log.operationDate)})?`
      )
    )
      return;
    try {
      const res = await fetch(`/api/vehicles/${log._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      addToast({ type: 'success', message: 'Vehicle log deleted' });
      fetchVehicles();
    } catch {
      addToast({ type: 'error', message: 'Failed to delete vehicle log' });
    }
  };

  const downloadExcel = () => {
    if (vehicles.length === 0) {
      addToast({ type: 'warning', message: 'No vehicle logs to export' });
      return;
    }

    const sheetData = vehicles.map((v) => ({
      'Operation Date': formatDate(v.operationDate),
      'Booking ID': v.packageId || '—',
      'Guest Name': v.guestName,
      'Pax in Vehicle': v.paxInVehicle,
      'Vehicle Type': v.vehicleType,
      'Vehicle Number': v.vehicleNumber || '—',
      'Vendor / Owner': v.vendorName || '—',
      'Driver Name': v.driverName || '—',
      'Driver Phone': v.driverPhone || '—',
      'Duty Route': v.dutyRoute,
      'Remarks': v.remarks || '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sheetData);
    ws['!cols'] = [
      { wch: 15 },
      { wch: 14 },
      { wch: 22 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 20 },
      { wch: 18 },
      { wch: 16 },
      { wch: 32 },
      { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Fleet Logs');

    const dateStr = new Date().toLocaleDateString('en-IN').replace(/\//g, '-');
    XLSX.writeFile(wb, `TravelCRM_FleetLogs_${dateStr}.xlsx`);
    addToast({ type: 'success', message: 'Fleet Excel report downloaded!' });
  };

  const clearFilters = () => {
    setSearch('');
    setSingleDate('');
    setFromDate('');
    setToDate('');
    setSortDir('desc');
  };

  // Quick stats
  const totalPaxInTransit = vehicles.reduce((sum, v) => sum + (v.paxInVehicle || 0), 0);
  const totalVehiclesCount = vehicles.length;

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-heading font-bold text-2xl text-gray-900">Daily Fleet Tracker</h2>
          <p className="text-sm text-gray-500">
            Log, track, and monitor daily vehicle deployment and driver duties
          </p>
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
            Export Fleet (.xlsx)
          </button>
          <button
            onClick={() => {
              setEditLog(undefined);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-xl transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#FF9F1C' }}
          >
            <Plus size={16} />
            Add Vehicle Log
          </button>
        </div>
      </div>

      {/* Mini Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50 text-blue-700">
            <Truck size={20} />
          </div>
          <div>
            <div className="text-xs text-gray-400 font-medium">Vehicles Logged</div>
            <div className="text-xl font-bold font-heading text-gray-900">
              {totalVehiclesCount}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600">
            <Users size={20} />
          </div>
          <div>
            <div className="text-xs text-gray-400 font-medium">Pax in Transit</div>
            <div className="text-xl font-bold font-heading text-gray-900">
              {totalPaxInTransit}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <div className="text-xs text-gray-400 font-medium">Active Date View</div>
            <div className="text-sm font-semibold text-gray-800">
              {singleDate ? formatDate(singleDate) : fromDate && toDate ? `${formatDate(fromDate)} → ${formatDate(toDate)}` : 'All Dates'}
            </div>
          </div>
          {singleDate !== getTodayISO() && (
            <button
              onClick={() => {
                setSingleDate(getTodayISO());
                setFromDate('');
                setToDate('');
              }}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg text-white"
              style={{ backgroundColor: '#FF9F1C' }}
            >
              Filter Today
            </button>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Search</label>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Guest, Vendor, Driver, Route..."
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Single Date
              </label>
              <input
                type="date"
                value={singleDate}
                onChange={(e) => {
                  setSingleDate(e.target.value);
                  setFromDate('');
                  setToDate('');
                }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setSingleDate('');
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
                  setSingleDate('');
                }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Sort Order</label>
              <button
                onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                Date {sortDir === 'asc' ? 'Ascending' : 'Descending'}
              </button>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  setSingleDate(getTodayISO());
                  setFromDate('');
                  setToDate('');
                }}
                className="px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
              >
                Today Only
              </button>
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 underline transition-colors"
              >
                Clear all filters
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  <button
                    className="flex items-center gap-1"
                    onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                  >
                    Operation Date <ArrowUpDown size={12} className="text-white/50" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Booking ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Guest Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Pax
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Vehicle Details
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Driver & Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Duty Route
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 10 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <Truck size={36} className="opacity-30" />
                      <span className="font-medium text-gray-600">No vehicle logs found</span>
                      <span className="text-xs text-gray-400">
                        Log a vehicle running today or adjust your date filter
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                vehicles.map((v, idx) => (
                  <tr key={v._id} className="table-row-hover transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 text-xs">
                        {formatDate(v.operationDate)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {v.packageId ? (
                        <span className="font-mono font-semibold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          {v.packageId}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 text-xs">{v.guestName}</div>
                      {v.remarks && (
                        <div className="text-xs text-gray-400 line-clamp-1 italic">
                          {v.remarks}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-semibold text-xs">
                        {v.paxInVehicle} Pax
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800 text-xs">{v.vehicleType}</div>
                      {v.vehicleNumber && (
                        <span className="text-xs font-mono text-gray-500 uppercase bg-gray-50 px-1.5 py-0.5 rounded">
                          {v.vehicleNumber}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{v.vendorName || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="text-gray-800 text-xs font-medium">
                        {v.driverName || '—'}
                      </div>
                      {v.driverPhone && (
                        <a
                          href={`tel:${v.driverPhone}`}
                          className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium mt-0.5"
                        >
                          <Phone size={10} />
                          {v.driverPhone}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-700 font-medium line-clamp-2 max-w-[200px]">
                        {v.dutyRoute}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          title="Edit vehicle log"
                          onClick={() => {
                            setEditLog(v);
                            setShowModal(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors text-blue-600"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          title="Delete vehicle log"
                          onClick={() => handleDelete(v)}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-red-500"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <VehicleModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditLog(undefined);
        }}
        onSave={fetchVehicles}
        editData={editLog}
        defaultDate={singleDate || getTodayISO()}
        addToast={addToast}
      />
    </div>
  );
}

