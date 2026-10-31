'use client';
import { useState, useEffect } from 'react';
import { X, Save, Loader2, Link as LinkIcon, Eye, AlertTriangle } from 'lucide-react';
import { ToastMessage } from './Toast';
import PackageDetailsModal from './PackageDetailsModal';

interface VehicleFormData {
  operationDate: string;
  packageId: string;
  guestName: string;
  paxInVehicle: number;
  vehicleType: string;
  vehicleNumber: string;
  vendorName: string;
  numberOfCabs?: number;
  daily_cab_cost?: number;
  vendorCost?: number;
  driverName: string;
  driverPhone: string;
  dutyRoute: string;
  remarks: string;
}

interface PackageOption {
  _id: string;
  bookingId: string;
  guestName: string;
  totalPax: number;
  status: string;
}

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editData?: VehicleFormData & { _id?: string };
  defaultDate?: string;
  addToast: (msg: Omit<ToastMessage, 'id'>) => void;
}

const vehicleTypes = [
  'Innova',
  'Innova Crysta',
  'Etios',
  'Swift Dzire',
  'Ertiga',
  'Tempo Traveller',
  'Force Urbania',
  'Mini Bus',
  'Scorpio',
  'Bolero',
  'Other',
];

const defaultForm: VehicleFormData = {
  operationDate: new Date().toISOString().slice(0, 10),
  packageId: '',
  guestName: '',
  paxInVehicle: 1,
  vehicleType: 'Innova Crysta',
  vehicleNumber: '',
  vendorName: '',
  numberOfCabs: 1,
  daily_cab_cost: 0,
  vendorCost: 0,
  driverName: '',
  driverPhone: '',
  dutyRoute: '',
  remarks: '',
};

export default function VehicleModal({
  isOpen,
  onClose,
  onSave,
  editData,
  defaultDate,
  addToast,
}: VehicleModalProps) {
  const [form, setForm] = useState<VehicleFormData>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [packageOptions, setPackageOptions] = useState<any[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [showPkgDetails, setShowPkgDetails] = useState(false);
  const [conflicts, setConflicts] = useState<Array<{ type: string; message: string }>>([]);
  const [checkingConflict, setCheckingConflict] = useState(false);

  useEffect(() => {
    if (!isOpen || !form.operationDate || (!form.vehicleNumber.trim() && !form.driverName.trim())) {
      setConflicts([]);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingConflict(true);
      try {
        const params = new URLSearchParams();
        params.set('date', form.operationDate);
        if (form.vehicleNumber.trim()) params.set('vehicleNumber', form.vehicleNumber.trim());
        if (form.driverName.trim()) params.set('driverName', form.driverName.trim());
        if (editData?._id) params.set('excludeId', editData._id);

        const res = await fetch(`/api/vehicles/check-conflict?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setConflicts(data.conflicts || []);
        }
      } catch {
        // ignore
      } finally {
        setCheckingConflict(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [form.operationDate, form.vehicleNumber, form.driverName, editData, isOpen]);

  useEffect(() => {
    if (isOpen) {
      // Fetch packages to populate link dropdown
      setLoadingPackages(true);
      fetch('/api/packages?sort=desc')
        .then((res) => (res.ok ? res.json() : []))
        .then((data: PackageOption[]) => setPackageOptions(data))
        .catch(() => {})
        .finally(() => setLoadingPackages(false));
    }
  }, [isOpen]);

  useEffect(() => {
    if (editData) {
      setForm({
        operationDate: editData.operationDate ? editData.operationDate.slice(0, 10) : '',
        packageId: editData.packageId || '',
        guestName: editData.guestName || '',
        paxInVehicle: editData.paxInVehicle || 1,
        vehicleType: editData.vehicleType || 'Innova Crysta',
        vehicleNumber: editData.vehicleNumber || '',
        vendorName: editData.vendorName || '',
        numberOfCabs: editData.numberOfCabs ?? 1,
        vendorCost: editData.vendorCost || 0,
        driverName: editData.driverName || '',
        driverPhone: editData.driverPhone || '',
        dutyRoute: editData.dutyRoute || '',
        remarks: editData.remarks || '',
      });
    } else {
      setForm({
        ...defaultForm,
        operationDate: defaultDate || new Date().toISOString().slice(0, 10),
      });
    }
  }, [editData, defaultDate, isOpen]);

  const handleChange = (field: keyof VehicleFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectPackage = (pkgBookingId: string) => {
    if (!pkgBookingId) return;
    const selected = packageOptions.find((p) => p.bookingId === pkgBookingId);
    if (selected) {
      setForm((prev) => ({
        ...prev,
        packageId: selected.bookingId,
        guestName: selected.guestName,
        paxInVehicle: selected.totalPax || prev.paxInVehicle,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.guestName.trim()) {
      addToast({ type: 'error', message: 'Guest name is required' });
      return;
    }
    if (!form.operationDate) {
      addToast({ type: 'error', message: 'Operation date is required' });
      return;
    }
    setLoading(true);
    try {
      const url = editData?._id ? `/api/vehicles/${editData._id}` : '/api/vehicles';
      const method = editData?._id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }
      addToast({
        type: 'success',
        message: editData?._id ? 'Vehicle log updated!' : 'Vehicle log added!',
      });
      onSave();
      onClose();
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col modal-content">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="font-heading font-bold text-xl text-gray-900">
              {editData?._id ? 'Edit Vehicle Log' : 'Add Daily Vehicle Log'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Track vehicle deployment, driver details, and passenger routing
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Quick link to active package */}
          <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 mb-1.5">
              <LinkIcon size={14} className="text-amber-600" />
              <span>Link to Existing Package (Optional)</span>
            </div>
            <select
              value={form.packageId}
              onChange={(e) => handleSelectPackage(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-800"
            >
              <option value="">
                {loadingPackages ? 'Loading packages...' : '-- Select an existing package or type below --'}
              </option>
              {packageOptions.map((pkg) => (
                <option key={pkg._id} value={pkg.bookingId}>
                  {pkg.bookingId} — {pkg.guestName} ({pkg.totalPax} Pax) [{pkg.status}]
                </option>
              ))}
            </select>
            {form.packageId && (
              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowPkgDetails(true)}
                  className="text-xs text-amber-800 hover:text-amber-950 font-semibold inline-flex items-center gap-1.5 bg-amber-100/70 hover:bg-amber-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <Eye size={12} className="text-amber-700" />
                  View "{form.packageId}" Package Details
                </button>
              </div>
            )}
          </div>

          {/* Double-Booking Conflict Warning */}
          {conflicts.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-1.5 animate-in fade-in duration-150 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
                <span>⚠️ Potential Fleet Scheduling Conflict Detected:</span>
              </div>
              <div className="space-y-1 pl-6">
                {conflicts.map((c, i) => (
                  <div key={i} className="text-amber-900 font-medium leading-relaxed">
                    • {c.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Operation Date *
              </label>
              <input
                type="date"
                value={form.operationDate}
                onChange={(e) => handleChange('operationDate', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Guest Name *
              </label>
              <input
                type="text"
                value={form.guestName}
                onChange={(e) => handleChange('guestName', e.target.value)}
                placeholder="Full name of assigned guest"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Booking ID (e.g. TRV-1001)
              </label>
              <input
                type="text"
                value={form.packageId}
                onChange={(e) => handleChange('packageId', e.target.value)}
                placeholder="e.g., TRV-1001"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Pax in Vehicle *
              </label>
              <input
                type="number"
                min={1}
                value={form.paxInVehicle}
                onChange={(e) => handleChange('paxInVehicle', Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Vehicle Type *
              </label>
              <select
                value={form.vehicleType}
                onChange={(e) => handleChange('vehicleType', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {vehicleTypes.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Vehicle Number
              </label>
              <input
                type="text"
                value={form.vehicleNumber}
                onChange={(e) => handleChange('vehicleNumber', e.target.value)}
                placeholder="e.g., JK01A1234 / DL3C1234"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Vendor / Transporter Name
              </label>
              <input
                type="text"
                value={form.vendorName}
                onChange={(e) => handleChange('vendorName', e.target.value)}
                placeholder="Vehicle owner or transport agency"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Total Cabs Allotted (Qty)
              </label>
              <input
                type="number"
                min={1}
                value={form.numberOfCabs ?? 1}
                onChange={(e) => handleChange('numberOfCabs', Math.max(1, Number(e.target.value) || 1))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 font-bold text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Daily Cab Cost (₹) *
              </label>
              <input
                type="number"
                min={0}
                value={form.daily_cab_cost ?? form.vendorCost ?? 0}
                onChange={(e) => {
                  const val = Number(e.target.value) || 0;
                  handleChange('daily_cab_cost', val);
                  handleChange('vendorCost', val);
                }}
                placeholder="Payable cost in ₹"
                className="w-full px-3 py-2 text-sm border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 font-bold text-emerald-800 bg-emerald-50/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Driver Name
              </label>
              <input
                type="text"
                value={form.driverName}
                onChange={(e) => handleChange('driverName', e.target.value)}
                placeholder="Driver full name"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Driver Phone / WhatsApp
              </label>
              <input
                type="tel"
                value={form.driverPhone}
                onChange={(e) => handleChange('driverPhone', e.target.value)}
                placeholder="+91 9876543210"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Duty Route *
              </label>
              <input
                type="text"
                value={form.dutyRoute}
                onChange={(e) => handleChange('dutyRoute', e.target.value)}
                placeholder="e.g., Srinagar Airport → Gulmarg Day Trip → Drop"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Operational Remarks
            </label>
            <textarea
              value={form.remarks}
              onChange={(e) => handleChange('remarks', e.target.value)}
              placeholder="e.g., Driver briefed, flight 6E-204 arriving 11:30 AM, water bottles kept..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 disabled:opacity-60 transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#FF9F1C' }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {editData?._id ? 'Update Log' : 'Save Vehicle Log'}
          </button>
        </div>
      </div>

      <PackageDetailsModal
        isOpen={showPkgDetails}
        onClose={() => setShowPkgDetails(false)}
        pkg={packageOptions.find((p) => p.bookingId === form.packageId) || null}
      />
    </div>
  );
}
