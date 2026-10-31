'use client';
import { useState, useEffect } from 'react';
import { X, Save, Loader2, UtensilsCrossed, Calendar, IndianRupee, Store, Users, FileText } from 'lucide-react';
import { ToastMessage } from './Toast';

export interface FoodLogItem {
  _id?: string;
  packageId?: string;
  guestName: string;
  mealDate: string;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';
  restaurantName: string;
  foodCost: number;
  paxCount?: number;
  paymentStatus?: 'Pending' | 'Paid';
  remarks?: string;
}

interface FoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editData?: FoodLogItem | null;
  defaultPackageId?: string;
  defaultGuestName?: string;
  addToast: (msg: Omit<ToastMessage, 'id'>) => void;
}

const MEAL_TYPES: Array<'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks'> = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snacks',
];

export default function FoodModal({
  isOpen,
  onClose,
  onSave,
  editData,
  defaultPackageId = '',
  defaultGuestName = '',
  addToast,
}: FoodModalProps) {
  const [packageId, setPackageId] = useState(defaultPackageId);
  const [guestName, setGuestName] = useState(defaultGuestName);
  const [mealDate, setMealDate] = useState(new Date().toISOString().slice(0, 10));
  const [mealType, setMealType] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks'>('Lunch');
  const [restaurantName, setRestaurantName] = useState('');
  const [foodCost, setFoodCost] = useState<number | ''>(0);
  const [paxCount, setPaxCount] = useState<number | ''>(2);
  const [paymentStatus, setPaymentStatus] = useState<'Pending' | 'Paid'>('Pending');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  const [packagesList, setPackagesList] = useState<Array<{ bookingId: string; guestName: string; totalPax: number }>>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoadingPackages(true);
      fetch('/api/packages?limit=100')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.packages)) {
            setPackagesList(
              data.packages.map((p: any) => ({
                bookingId: p.bookingId,
                guestName: p.guestName,
                totalPax: p.totalPax || 2,
              }))
            );
          }
        })
        .catch(() => {})
        .finally(() => setLoadingPackages(false));
    }
  }, [isOpen]);

  useEffect(() => {
    if (editData) {
      setPackageId(editData.packageId || '');
      setGuestName(editData.guestName || '');
      setMealDate(
        editData.mealDate
          ? new Date(editData.mealDate).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10)
      );
      setMealType(editData.mealType || 'Lunch');
      setRestaurantName(editData.restaurantName || '');
      setFoodCost(editData.foodCost ?? 0);
      setPaxCount(editData.paxCount ?? 2);
      setPaymentStatus(editData.paymentStatus || 'Pending');
      setRemarks(editData.remarks || '');
    } else {
      setPackageId(defaultPackageId);
      setGuestName(defaultGuestName);
      setMealDate(new Date().toISOString().slice(0, 10));
      setMealType('Lunch');
      setRestaurantName('');
      setFoodCost(0);
      setPaxCount(2);
      setPaymentStatus('Pending');
      setRemarks('');
    }
  }, [editData, defaultPackageId, defaultGuestName, isOpen]);

  const handlePackageSelect = (selectedBookingId: string) => {
    setPackageId(selectedBookingId);
    const matched = packagesList.find((p) => p.bookingId === selectedBookingId);
    if (matched) {
      setGuestName(matched.guestName);
      if (matched.totalPax) {
        setPaxCount(matched.totalPax);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantName.trim()) {
      addToast({ type: 'warning', message: 'Please enter the Restaurant or Hotel name' });
      return;
    }
    if (!guestName.trim()) {
      addToast({ type: 'warning', message: 'Please enter or select a Guest name' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        packageId: packageId.trim(),
        guestName: guestName.trim(),
        mealDate,
        mealType,
        restaurantName: restaurantName.trim(),
        foodCost: Number(foodCost) || 0,
        paxCount: Number(paxCount) || 1,
        paymentStatus,
        remarks: remarks.trim(),
      };

      const url = editData?._id ? `/api/food/${editData._id}` : '/api/food';
      const method = editData?._id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save food expense');
      }

      addToast({
        type: 'success',
        message: editData?._id ? 'Food expense updated successfully' : 'Dining bill recorded successfully',
      });
      onSave();
      onClose();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Something went wrong' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-gray-100"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
              <UtensilsCrossed size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold font-heading">
                {editData?._id ? 'Edit Dining Expense' : 'Record Dining / Food Bill'}
              </h2>
              <p className="text-xs text-white/80">Track restaurant bills linked to guest packages</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Linked Package Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <FileText size={13} className="text-amber-600" />
              Link to Package / Booking ID (Optional)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={packageId}
                onChange={(e) => handlePackageSelect(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                disabled={loadingPackages}
              >
                <option value="">-- Choose Existing Package --</option>
                {packagesList.map((p) => (
                  <option key={p.bookingId} value={p.bookingId}>
                    {p.bookingId} - {p.guestName}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={packageId}
                onChange={(e) => setPackageId(e.target.value)}
                placeholder="Or type Booking ID (e.g. TRV-1001)"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>
          </div>

          {/* Guest Name & Pax Count */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Guest / Group Name *
              </label>
              <input
                type="text"
                required
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Users size={12} className="text-amber-600" />
                Pax Count
              </label>
              <input
                type="number"
                min={1}
                value={paxCount}
                onChange={(e) => setPaxCount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Date & Meal Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar size={13} className="text-amber-600" />
                Dining Date *
              </label>
              <input
                type="date"
                required
                value={mealDate}
                onChange={(e) => setMealDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Meal Type *
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {MEAL_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setMealType(type)}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      mealType === type
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Restaurant / Venue & Bill Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Store size={13} className="text-amber-600" />
                Restaurant / Hotel Name *
              </label>
              <input
                type="text"
                required
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="e.g. Saravana Bhavan / Spice Garden"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-gray-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <IndianRupee size={13} className="text-emerald-600" />
                Total Food Cost (₹) *
              </label>
              <input
                type="number"
                min={0}
                required
                value={foodCost}
                onChange={(e) => setFoodCost(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Bill amount in ₹"
                className="w-full px-3 py-2 text-sm border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-800 bg-emerald-50/30"
              />
            </div>
          </div>

          {/* Payment Status */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Vendor Payment Status
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                <input
                  type="radio"
                  name="paymentStatus"
                  value="Pending"
                  checked={paymentStatus === 'Pending'}
                  onChange={() => setPaymentStatus('Pending')}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                  Pending Payable
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                <input
                  type="radio"
                  name="paymentStatus"
                  value="Paid"
                  checked={paymentStatus === 'Paid'}
                  onChange={() => setPaymentStatus('Paid')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  Paid directly by Agent
                </span>
              </label>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Remarks / Menu Items / Bill Ref
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Buffet lunch, Bill #1042, Paid via UPI"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#FF9F1C' }}
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={14} />
                  Save Dining Bill
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

