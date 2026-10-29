'use client';
import { useState, useEffect } from 'react';
import {
  X, Loader2, Save, Truck, FileText, Copy, Plus, Trash2,
  Calendar, CheckCircle2, ChevronRight, ChevronLeft, Phone
} from 'lucide-react';
import { ToastMessage } from './Toast';

export interface DailyFleetLogItem {
  _id?: string;
  dayNumber: number;
  operationDate: string;
  dutyRoute: string;
  vehicleType: string;
  vehicleNumber: string;
  vendorName: string;
  numberOfCabs?: number;
  vendorCost?: number;
  driverName: string;
  driverPhone: string;
  paxInVehicle: number;
  remarks: string;
}

export interface HotelAllocationItem {
  hotelName: string;
  location?: string;
  roomType?: string;
  numberOfRooms: number;
  extraBeds: number;
  cost?: number;
}

interface PackageFormData {
  guestName: string;
  contactNumber: string;
  agencyName: string;
  totalPax: number;
  checkInDate: string;
  checkOutDate: string;
  totalDays: string;
  hotelDetails: string;
  hotelName?: string;
  numberOfRooms?: number;
  extraBeds?: number;
  hotelAllocations?: HotelAllocationItem[];
  packageAmount: number;
  advancePaid: number;
  balancePending: number;
  hotelCost?: number;
  cabVendorCost?: number;
  otherExpenses?: number;
  totalExpense?: number;
  netProfit?: number;
  status: string;
}

interface PackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editData?: PackageFormData & { _id?: string; bookingId?: string };
  addToast: (msg: Omit<ToastMessage, 'id'>) => void;
}

const VEHICLE_TYPES = [
  'Innova Crysta',
  'Innova',
  'Ertiga',
  'Swift Dzire',
  'Etios',
  'Tempo Traveller',
  'Force Urbania',
  'Mini Bus',
  'Scorpio',
  'Bolero',
  'Other',
];

const defaultForm: PackageFormData = {
  guestName: '',
  contactNumber: '',
  agencyName: 'Direct',
  totalPax: 1,
  checkInDate: '',
  checkOutDate: '',
  totalDays: '',
  hotelDetails: '',
  hotelName: '',
  numberOfRooms: 1,
  extraBeds: 0,
  hotelAllocations: [],
  packageAmount: 0,
  advancePaid: 0,
  balancePending: 0,
  hotelCost: 0,
  cabVendorCost: 0,
  otherExpenses: 0,
  totalExpense: 0,
  netProfit: 0,
  status: 'Upcoming',
};

function calcTotalDays(checkIn: string, checkOut: string): string {
  if (!checkIn || !checkOut) return '';
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) return '';
  const diff = Math.round((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return '';
  const nights = diff;
  const days = diff + 1;
  return `${days} Days / ${nights} Nights`;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDate(isoDate?: string): string {
  if (!isoDate) return '—';
  try {
    return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

export default function PackageModal({
  isOpen,
  onClose,
  onSave,
  editData,
  addToast,
}: PackageModalProps) {
  const [activeTab, setActiveTab] = useState<'package' | 'fleet'>('package');
  const [form, setForm] = useState<PackageFormData>(defaultForm);
  const [fleetLogs, setFleetLogs] = useState<DailyFleetLogItem[]>([]);
  const [deletedFleetIds, setDeletedFleetIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingFleet, setFetchingFleet] = useState(false);

  // Initialize or reset form and load existing fleet logs when modal opens
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('package');
      setDeletedFleetIds([]);
      return;
    }

    if (editData) {
      setForm({
        guestName: editData.guestName || '',
        contactNumber: editData.contactNumber || '',
        agencyName: editData.agencyName || 'Direct',
        totalPax: editData.totalPax || 1,
        checkInDate: editData.checkInDate ? editData.checkInDate.slice(0, 10) : '',
        checkOutDate: editData.checkOutDate ? editData.checkOutDate.slice(0, 10) : '',
        totalDays: editData.totalDays || '',
        hotelDetails: editData.hotelDetails || '',
        hotelName: editData.hotelName || '',
        numberOfRooms: editData.numberOfRooms !== undefined ? editData.numberOfRooms : 1,
        extraBeds: editData.extraBeds !== undefined ? editData.extraBeds : 0,
        hotelAllocations: editData.hotelAllocations || [],
        packageAmount: editData.packageAmount || 0,
        advancePaid: editData.advancePaid || 0,
        balancePending: editData.balancePending || 0,
        hotelCost: editData.hotelCost || 0,
        cabVendorCost: editData.cabVendorCost || 0,
        otherExpenses: editData.otherExpenses || 0,
        totalExpense: editData.totalExpense || 0,
        netProfit: editData.netProfit || 0,
        status: editData.status || 'Upcoming',
      });

      // Load associated fleet logs for this package
      if (editData._id) {
        setFetchingFleet(true);
        fetch(`/api/packages/${editData._id}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data && Array.isArray(data.fleetLogs)) {
              const loadedLogs: DailyFleetLogItem[] = data.fleetLogs.map((l: any, i: number) => ({
                _id: l._id,
                dayNumber: i + 1,
                operationDate: l.operationDate ? l.operationDate.slice(0, 10) : '',
                dutyRoute: l.dutyRoute || '',
                vehicleType: l.vehicleType || '',
                vehicleNumber: l.vehicleNumber || '',
                vendorName: l.vendorName || '',
                numberOfCabs: Number(l.numberOfCabs) || 1,
                vendorCost: Number(l.vendorCost) || 0,
                driverName: l.driverName || '',
                driverPhone: l.driverPhone || '',
                paxInVehicle: l.paxInVehicle || data.totalPax || 1,
                remarks: l.remarks || '',
              }));

              // If dates are available, ensure every day has a row
              const cin = editData.checkInDate ? editData.checkInDate.slice(0, 10) : '';
              const cout = editData.checkOutDate ? editData.checkOutDate.slice(0, 10) : '';
              if (cin && cout) {
                const inD = new Date(cin + 'T00:00:00');
                const outD = new Date(cout + 'T00:00:00');
                const diffDays = Math.max(1, Math.round((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24)) + 1);

                const merged: DailyFleetLogItem[] = [];
                for (let d = 0; d < diffDays; d++) {
                  const dayDate = addDays(cin, d);
                  const existingForDate = loadedLogs.find((l) => l.operationDate === dayDate);
                  if (existingForDate) {
                    merged.push({ ...existingForDate, dayNumber: d + 1 });
                  } else {
                    merged.push({
                      dayNumber: d + 1,
                      operationDate: dayDate,
                      dutyRoute: '',
                      vehicleType: '',
                      vehicleNumber: '',
                      vendorName: '',
                      numberOfCabs: 1,
                      vendorCost: 0,
                      driverName: '',
                      driverPhone: '',
                      paxInVehicle: editData.totalPax || 1,
                      remarks: '',
                    });
                  }
                }
                setFleetLogs(merged);
              } else {
                setFleetLogs(loadedLogs);
              }
            }
          })
          .catch(() => {})
          .finally(() => setFetchingFleet(false));
      }
    } else {
      setForm(defaultForm);
      setFleetLogs([]);
    }
  }, [editData, isOpen]);

  // Synchronize fleet log days whenever Check-in or Check-out date changes
  const syncFleetDaysWithDates = (newCheckIn: string, newCheckOut: string) => {
    if (!newCheckIn || !newCheckOut) return;
    const inD = new Date(newCheckIn + 'T00:00:00');
    const outD = new Date(newCheckOut + 'T00:00:00');
    if (isNaN(inD.getTime()) || isNaN(outD.getTime())) return;
    const diffDays = Math.max(1, Math.round((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    setFleetLogs((prev) => {
      const updated: DailyFleetLogItem[] = [];

      for (let i = 0; i < diffDays; i++) {
        const dayDate = addDays(newCheckIn, i);
        const existing = prev[i] || prev.find((l) => l.operationDate === dayDate);

        if (existing) {
          updated.push({
            ...existing,
            dayNumber: i + 1,
            operationDate: dayDate,
          });
        } else {
          updated.push({
            dayNumber: i + 1,
            operationDate: dayDate,
            dutyRoute: '',
            vehicleType: '',
            vehicleNumber: '',
            vendorName: '',
            driverName: '',
            driverPhone: '',
            paxInVehicle: form.totalPax || 1,
            remarks: '',
          });
        }
      }
      return updated;
    });
  };

  const handleChange = (field: keyof PackageFormData, value: string | number) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };

      if (field === 'checkInDate' || field === 'checkOutDate') {
        const cin = field === 'checkInDate' ? String(value) : prev.checkInDate;
        const cout = field === 'checkOutDate' ? String(value) : prev.checkOutDate;
        updated.totalDays = calcTotalDays(cin, cout);
        if (cin && cout) {
          syncFleetDaysWithDates(cin, cout);
        }
      }

      if (
        field === 'packageAmount' ||
        field === 'advancePaid' ||
        field === 'hotelCost' ||
        field === 'cabVendorCost' ||
        field === 'otherExpenses' ||
        field === 'totalExpense'
      ) {
        const amt = field === 'packageAmount' ? Number(value) : Number(prev.packageAmount || 0);
        const adv = field === 'advancePaid' ? Number(value) : Number(prev.advancePaid || 0);
        const hCost = field === 'hotelCost' ? Number(value) : Number(prev.hotelCost || 0);
        const cCost = field === 'cabVendorCost' ? Number(value) : Number(prev.cabVendorCost || 0);
        const oCost = field === 'otherExpenses' ? Number(value) : Number(prev.otherExpenses || 0);
        const exp = field === 'totalExpense' ? Number(value) : (hCost + cCost + oCost);
        updated.balancePending = Math.max(0, amt - adv);
        updated.totalExpense = exp;
        updated.netProfit = amt - exp;
      }
      return updated;
    });
  };

  // Fleet field update handler
  const updateFleetField = (index: number, field: keyof DailyFleetLogItem, val: string | number) => {
    setFleetLogs((prev) =>
      prev.map((log, i) => (i === index ? { ...log, [field]: val } : log))
    );
  };

  // Quick action: Apply Day 1's Vehicle, Number, Vendor, Driver Name and Phone to ALL subsequent days
  const copyDay1ToAllDays = () => {
    if (fleetLogs.length <= 1) {
      addToast({ type: 'info', message: 'Add more days to copy Day 1 vehicle details' });
      return;
    }
    const day1 = fleetLogs[0];
    setFleetLogs((prev) =>
      prev.map((log, i) =>
        i === 0
          ? log
          : {
              ...log,
              vehicleType: day1.vehicleType,
              vehicleNumber: day1.vehicleNumber,
              vendorName: day1.vendorName,
              numberOfCabs: day1.numberOfCabs || 1,
              vendorCost: day1.vendorCost || 0,
              driverName: day1.driverName,
              driverPhone: day1.driverPhone,
              paxInVehicle: day1.paxInVehicle,
            }
      )
    );
    addToast({
      type: 'success',
      message: `Copied ${day1.vehicleType || 'vehicle'} (${day1.vehicleNumber || 'cab'}) and driver to all ${fleetLogs.length} days!`,
    });
  };

  // Add an extra fleet day
  const addExtraFleetDay = () => {
    const lastLog = fleetLogs[fleetLogs.length - 1];
    const nextDate = lastLog ? addDays(lastLog.operationDate, 1) : form.checkInDate || new Date().toISOString().slice(0, 10);
    const newDayNumber = fleetLogs.length + 1;

    setFleetLogs((prev) => [
      ...prev,
      {
        dayNumber: newDayNumber,
        operationDate: nextDate,
        dutyRoute: '',
        vehicleType: '',
        vehicleNumber: '',
        vendorName: '',
        numberOfCabs: 1,
        vendorCost: 0,
        driverName: '',
        driverPhone: '',
        paxInVehicle: form.totalPax || 1,
        remarks: '',
      },
    ]);
  };

  // Remove a fleet day
  const removeFleetDay = (index: number) => {
    const target = fleetLogs[index];
    if (target._id) {
      setDeletedFleetIds((prev) => [...prev, target._id!]);
    }
    setFleetLogs((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((log, idx) => ({ ...log, dayNumber: idx + 1 }))
    );
  };

  // Unified Save: Saves both package and daily fleet logs
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.guestName.trim()) {
      addToast({ type: 'error', message: 'Guest name is required' });
      setActiveTab('package');
      return;
    }
    if (!form.checkInDate || !form.checkOutDate) {
      addToast({ type: 'error', message: 'Check-in and Check-out dates are required' });
      setActiveTab('package');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        fleetLogs: fleetLogs.map((l) => ({
          ...l,
          guestName: form.guestName.trim(),
          paxInVehicle: Number(l.paxInVehicle) || form.totalPax || 1,
        })),
        deletedFleetIds,
      };

      const url = editData?._id ? `/api/packages/${editData._id}` : '/api/packages';
      const method = editData?._id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save package and fleet details');
      }

      addToast({
        type: 'success',
        message: editData?._id
          ? `Package and ${fleetLogs.length} daily fleet records updated!`
          : `Package created with ${fleetLogs.length} daily fleet records!`,
      });
      onSave();
      onClose();
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save package',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col modal-content overflow-hidden border border-gray-100"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-900 via-[#0B192C] to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center">
              {activeTab === 'package' ? <FileText size={18} /> : <Truck size={18} />}
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg text-white leading-tight">
                {editData?._id ? 'Update Package & Daily Fleet' : 'Create Package with Fleet'}
              </h2>
              <p className="text-xs text-white/60">
                {form.guestName ? form.guestName : 'New Guest Booking'} •{' '}
                {form.totalDays ? form.totalDays : 'Configure stay & transport'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation Switcher */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 bg-slate-50 border-b border-gray-200/80">
          <button
            type="button"
            onClick={() => setActiveTab('package')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'package'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <FileText size={14} className={activeTab === 'package' ? 'text-amber-500' : ''} />
            1. Package & Stay Info
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fleet')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'fleet'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Truck size={14} className={activeTab === 'fleet' ? 'text-blue-600' : ''} />
            2. Daily Fleet & Cabs
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                fleetLogs.length > 0
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {fleetLogs.length} Days
            </span>
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: Package & Stay Information */}
          {activeTab === 'package' && (
            <div className="space-y-4">
              {/* Guest Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Guest Name *
                  </label>
                  <input
                    type="text"
                    value={form.guestName}
                    onChange={(e) => handleChange('guestName', e.target.value)}
                    placeholder="Full name of lead guest"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Contact Phone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={form.contactNumber}
                    onChange={(e) => handleChange('contactNumber', e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                  />
                </div>
              </div>

              {/* Agency & Pax */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Booking Agency Name
                  </label>
                  <input
                    type="text"
                    value={form.agencyName}
                    onChange={(e) => handleChange('agencyName', e.target.value)}
                    placeholder="Agency Name or Direct Booking"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Total Pax (Guests)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.totalPax}
                    onChange={(e) => handleChange('totalPax', Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                  />
                </div>
              </div>

              {/* Dates & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-amber-50/40 p-4 rounded-2xl border border-amber-200/60">
                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1 flex items-center gap-1">
                    <Calendar size={13} className="text-amber-600" /> Check-in Date *
                  </label>
                  <input
                    type="date"
                    value={form.checkInDate}
                    onChange={(e) => handleChange('checkInDate', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1 flex items-center gap-1">
                    <Calendar size={13} className="text-amber-600" /> Check-out Date *
                  </label>
                  <input
                    type="date"
                    value={form.checkOutDate}
                    onChange={(e) => handleChange('checkOutDate', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1">
                    Duration (Auto-calculated)
                  </label>
                  <input
                    type="text"
                    value={form.totalDays}
                    onChange={(e) => handleChange('totalDays', e.target.value)}
                    placeholder="e.g. 4 Days / 3 Nights"
                    className="w-full px-3 py-2 text-sm border border-amber-200 rounded-xl bg-white font-semibold text-amber-900"
                  />
                </div>
              </div>

              {/* Hotel & Room Allocation Section */}
              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider">
                      🏨 Hotel Room & Extra Bed Allocation
                    </label>
                    <p className="text-[11px] text-amber-800/80 mt-0.5">
                      Specify the primary assigned hotel, rooms booked, and extra beds for this package.
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-200">
                    {form.numberOfRooms ?? 1} Room(s) • {form.extraBeds ?? 0} Extra Bed(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Assigned Hotel / Resort Name *
                    </label>
                    <input
                      type="text"
                      value={form.hotelName || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          hotelName: val,
                          hotelDetails: prev.hotelDetails ? prev.hotelDetails : val,
                        }));
                      }}
                      placeholder="e.g. Grand Hyatt Kochi"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Number of Rooms (Default: 1) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.numberOfRooms ?? 1}
                      onChange={(e) =>
                        handleChange('numberOfRooms', Math.max(1, parseInt(e.target.value, 10) || 1))
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white font-bold text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Extra Beds Taken (Default: 0) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.extraBeds ?? 0}
                      onChange={(e) =>
                        handleChange('extraBeds', Math.max(0, parseInt(e.target.value, 10) || 0))
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white font-bold text-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Itinerary Stay Description / Multi-Hotel Breakdown
                  </label>
                  <textarea
                    value={form.hotelDetails}
                    onChange={(e) => handleChange('hotelDetails', e.target.value)}
                    placeholder="e.g. Day 1-2: Grand Plaza Munnar (2 Rooms), Day 3: Premium Houseboat Alleppey (1 Extra Bed)"
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none bg-white"
                  />
                </div>
              </div>

              {/* Financials & Operational Cost Overview */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Package Revenue & Operational Costs
                  </h4>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      (Number(form.netProfit) ||
                        Number(form.packageAmount || 0) -
                          ((Number(form.hotelCost) || 0) +
                            (Number(form.cabVendorCost) || 0) +
                            (Number(form.otherExpenses) || 0))) >= 0
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                    }`}
                  >
                    Est. Profit: ₹
                    {(
                      Number(form.packageAmount || 0) -
                      ((Number(form.hotelCost) || 0) +
                        (Number(form.cabVendorCost) || 0) +
                        (Number(form.otherExpenses) || 0))
                    ).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Package Revenue (₹) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.packageAmount}
                      onChange={(e) => handleChange('packageAmount', Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white font-bold text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Advance Paid (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.advancePaid}
                      onChange={(e) => handleChange('advancePaid', Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white text-green-700 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Balance Pending (₹)
                    </label>
                    <input
                      type="number"
                      value={form.balancePending}
                      readOnly
                      className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-xl font-bold ${
                        form.balancePending > 0
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-green-50 text-green-700 border-green-200'
                      }`}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <div className="text-[11px] font-semibold text-gray-500 mb-2">
                    Operational Costs / Vendor Expenses (₹):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">
                        Hotel Cost (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={form.hotelCost ?? 0}
                        onChange={(e) => handleChange('hotelCost', Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">
                        Cab Vendor Cost (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={form.cabVendorCost ?? 0}
                        onChange={(e) => handleChange('cabVendorCost', Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">
                        Other / Misc Expenses (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={form.otherExpenses ?? 0}
                        onChange={(e) => handleChange('otherExpenses', Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Tour Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                >
                  <option value="Upcoming">Upcoming — Scheduled & Confirmed</option>
                  <option value="Ongoing">Ongoing — Currently on Tour</option>
                  <option value="Completed">Completed — Tour Concluded</option>
                  <option value="Cancelled">Cancelled — Booking Inactive</option>
                </select>
              </div>

              {/* Prompt to configure Fleet */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab('fleet')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors"
                >
                  Configure Daily Fleet Details ({fleetLogs.length} Days)
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Daily Fleet & Transport Details */}
          {activeTab === 'fleet' && (
            <div className="space-y-4">
              {/* Header Action Bar for Fleet */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-blue-50/60 rounded-2xl border border-blue-200/70">
                <div>
                  <h3 className="font-heading font-bold text-sm text-blue-950 flex items-center gap-2">
                    <Truck size={16} className="text-blue-600" />
                    Daily Fleet & Cab Schedule ({fleetLogs.length} Tour Days)
                  </h3>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Assign cabs, drivers, routes, and vehicle numbers for each day of this tour.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {fleetLogs.length > 1 && (
                    <button
                      type="button"
                      onClick={copyDay1ToAllDays}
                      className="px-3 py-1.5 text-xs font-bold bg-white text-blue-700 hover:bg-blue-50 rounded-xl border border-blue-200 shadow-xs flex items-center gap-1.5 transition-colors"
                      title="Copy Day 1 Vehicle & Driver to all other days"
                    >
                      <Copy size={13} />
                      Same Cab for All Days
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={addExtraFleetDay}
                    className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Plus size={13} />
                    Add Extra Day
                  </button>
                </div>
              </div>

              {/* If no check-in/out date set yet */}
              {!form.checkInDate || !form.checkOutDate ? (
                <div className="text-center py-8 bg-gray-50 border border-dashed border-gray-200 rounded-2xl">
                  <Calendar size={28} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm font-semibold text-gray-700">Dates not set yet</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                    Please set Check-in and Check-out dates in the <strong>Package Info</strong> tab to auto-generate the daily fleet schedule.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('package')}
                    className="mt-3 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Go to Package Info
                  </button>
                </div>
              ) : fetchingFleet ? (
                <div className="text-center py-8">
                  <Loader2 size={24} className="animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Loading daily fleet records...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fleetLogs.map((log, index) => (
                    <div
                      key={log._id || `fleet-day-${index}`}
                      className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-3 hover:border-blue-300 transition-colors"
                    >
                      {/* Day Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="font-heading font-bold text-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2.5 py-0.5 rounded-lg shadow-xs">
                            Day {log.dayNumber}
                          </span>
                          <span className="text-xs font-semibold text-gray-700">
                            {formatDate(log.operationDate)}
                          </span>
                          <span className="text-[11px] text-gray-400 font-mono">
                            ({log.operationDate})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={log.operationDate}
                            onChange={(e) => updateFleetField(index, 'operationDate', e.target.value)}
                            className="px-2 py-0.5 text-xs border border-gray-200 rounded-md bg-gray-50 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                            title="Change date for this day"
                          />
                          {fleetLogs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeFleetDay(index)}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete this day's vehicle log"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Row 1: Duty Route & Vehicle Specs */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">
                            Duty Route / Movement *
                          </label>
                          <input
                            type="text"
                            value={log.dutyRoute}
                            onChange={(e) => updateFleetField(index, 'dutyRoute', e.target.value)}
                            placeholder="Enter duty route..."
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">
                            Vehicle Type
                          </label>
                          <select
                            value={log.vehicleType}
                            onChange={(e) => updateFleetField(index, 'vehicleType', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                          >
                            <option value="">-- Select Vehicle Type --</option>
                            {VEHICLE_TYPES.map((vt) => (
                              <option key={vt} value={vt}>
                                {vt}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">
                            Vehicle Plate Number
                          </label>
                          <input
                            type="text"
                            value={log.vehicleNumber}
                            onChange={(e) => updateFleetField(index, 'vehicleNumber', e.target.value.toUpperCase())}
                            placeholder="e.g. KL-07-CD-1234"
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono uppercase"
                          />
                        </div>
                      </div>

                      {/* Row 2: Driver, Vendor, Cabs & Phone */}
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">
                            Driver Name
                          </label>
                          <input
                            type="text"
                            value={log.driverName}
                            onChange={(e) => updateFleetField(index, 'driverName', e.target.value)}
                            placeholder="Driver name"
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">
                            Driver Phone
                          </label>
                          <input
                            type="tel"
                            value={log.driverPhone}
                            onChange={(e) => updateFleetField(index, 'driverPhone', e.target.value)}
                            placeholder="Driver phone"
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">
                            Vendor / Operator *
                          </label>
                          <input
                            type="text"
                            value={log.vendorName}
                            onChange={(e) => updateFleetField(index, 'vendorName', e.target.value)}
                            placeholder="e.g. Kerala Travels / Own"
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">
                            Cabs Allotted (Qty)
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={log.numberOfCabs ?? 1}
                            onChange={(e) => updateFleetField(index, 'numberOfCabs', Math.max(1, Number(e.target.value) || 1))}
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 font-bold text-gray-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">
                            Pax in Cab
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={log.paxInVehicle}
                            onChange={(e) => updateFleetField(index, 'paxInVehicle', Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </div>
                      </div>

                      {/* Row 3: Special Remarks */}
                      <div>
                        <input
                          type="text"
                          value={log.remarks}
                          onChange={(e) => updateFleetField(index, 'remarks', e.target.value)}
                          placeholder="Optional instructions or notes..."
                          className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50/50"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>

        {/* Modal Bottom Footer */}
        <div className="flex items-center justify-between p-4 px-6 border-t border-gray-100 bg-white">
          <div>
            {activeTab === 'fleet' ? (
              <button
                type="button"
                onClick={() => setActiveTab('package')}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft size={14} /> Back to Package Info
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('fleet')}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                Go to Fleet Schedule ({fleetLogs.length} Days) <ChevronRight size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-2 disabled:opacity-60 transition-opacity hover:opacity-90 shadow-sm"
              style={{ backgroundColor: '#FF9F1C' }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {editData?._id ? 'Update Package & Fleet' : 'Create Package & Fleet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
