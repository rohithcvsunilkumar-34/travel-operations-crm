'use client';
import { useState, useEffect } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import { ToastMessage } from './Toast';

interface PackageFormData {
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
}

interface PackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editData?: PackageFormData & { _id?: string };
  addToast: (msg: Omit<ToastMessage, 'id'>) => void;
}

const defaultForm: PackageFormData = {
  guestName: '',
  contactNumber: '',
  agencyName: 'Direct',
  totalPax: 1,
  checkInDate: '',
  checkOutDate: '',
  totalDays: '',
  hotelDetails: '',
  packageAmount: 0,
  advancePaid: 0,
  balancePending: 0,
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

export default function PackageModal({ isOpen, onClose, onSave, editData, addToast }: PackageModalProps) {
  const [form, setForm] = useState<PackageFormData>(defaultForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
        packageAmount: editData.packageAmount || 0,
        advancePaid: editData.advancePaid || 0,
        balancePending: editData.balancePending || 0,
        status: editData.status || 'Upcoming',
      });
    } else {
      setForm(defaultForm);
    }
  }, [editData, isOpen]);

  const handleChange = (field: keyof PackageFormData, value: string | number) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-calc totalDays
      if (field === 'checkInDate' || field === 'checkOutDate') {
        const cin = field === 'checkInDate' ? String(value) : prev.checkInDate;
        const cout = field === 'checkOutDate' ? String(value) : prev.checkOutDate;
        updated.totalDays = calcTotalDays(cin, cout);
      }
      // Auto-calc balance
      if (field === 'packageAmount' || field === 'advancePaid') {
        const amt = field === 'packageAmount' ? Number(value) : Number(prev.packageAmount);
        const adv = field === 'advancePaid' ? Number(value) : Number(prev.advancePaid);
        updated.balancePending = amt - adv;
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.guestName.trim()) {
      addToast({ type: 'error', message: 'Guest name is required' });
      return;
    }
    if (!form.checkInDate || !form.checkOutDate) {
      addToast({ type: 'error', message: 'Check-in and Check-out dates are required' });
      return;
    }
    setLoading(true);
    try {
      const url = editData?._id ? `/api/packages/${editData._id}` : '/api/packages';
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
      addToast({ type: 'success', message: editData?._id ? 'Package updated!' : 'Package created!' });
      onSave();
      onClose();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save package' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col modal-content">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#f1f5f9' }}>
          <h2 className="font-heading font-bold text-xl text-gray-900">
            {editData?._id ? 'Edit Package' : 'Add New Package'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Guest Info Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Guest Name *</label>
              <input
                type="text"
                value={form.guestName}
                onChange={(e) => handleChange('guestName', e.target.value)}
                placeholder="Full name of lead guest"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Number</label>
              <input
                type="tel"
                value={form.contactNumber}
                onChange={(e) => handleChange('contactNumber', e.target.value)}
                placeholder="Phone / WhatsApp"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Agency Name</label>
              <input
                type="text"
                value={form.agencyName}
                onChange={(e) => handleChange('agencyName', e.target.value)}
                placeholder="Agency or Direct"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Total Pax</label>
              <input
                type="number"
                min={1}
                value={form.totalPax}
                onChange={(e) => handleChange('totalPax', Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Check-in Date *</label>
              <input
                type="date"
                value={form.checkInDate}
                onChange={(e) => handleChange('checkInDate', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Check-out Date *</label>
              <input
                type="date"
                value={form.checkOutDate}
                onChange={(e) => handleChange('checkOutDate', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Total Days (Auto)</label>
              <input
                type="text"
                value={form.totalDays}
                onChange={(e) => handleChange('totalDays', e.target.value)}
                placeholder="Auto-calculated"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Hotel Details / Houseboats</label>
            <textarea
              value={form.hotelDetails}
              onChange={(e) => handleChange('hotelDetails', e.target.value)}
              placeholder="Hotel names, houseboats, resorts..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Package Amount (₹)</label>
              <input
                type="number"
                min={0}
                value={form.packageAmount}
                onChange={(e) => handleChange('packageAmount', Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Advance Paid (₹)</label>
              <input
                type="number"
                min={0}
                value={form.advancePaid}
                onChange={(e) => handleChange('advancePaid', Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Balance Pending (₹)</label>
              <input
                type="number"
                value={form.balancePending}
                readOnly
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-red-50 text-red-700 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="Upcoming">Upcoming</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t" style={{ borderColor: '#f1f5f9' }}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 disabled:opacity-60 transition-opacity"
            style={{ backgroundColor: '#FF9F1C' }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {editData?._id ? 'Update Package' : 'Create Package'}
          </button>
        </div>
      </div>
    </div>
  );
}
