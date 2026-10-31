'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  X, Calendar, Users, Phone, Building2, IndianRupee,
  MapPin, Hotel, Clock, Edit, Check, Copy, ExternalLink, UserCheck, Truck, Download, FileText, MessageCircle, CreditCard,
  UtensilsCrossed, Receipt, Plus, Trash2
} from 'lucide-react';
import { formatName, getInitials, getStatusConfig, formatDisplayCurrency, getCrossMonthInfo } from '@/lib/formatters';
import { exportSinglePackagePDF } from '@/lib/pdfExport';
import { getGuestWhatsAppLink, getDriverDutyWhatsAppLink } from '@/lib/whatsapp';
import FoodModal, { FoodLogItem } from './FoodModal';

interface DailyLog {
  dayNumber: number;
  date: string;
  placesVisited: string;
  hotelStayed: string;
  dailyRemarks: string;
}

export interface PackageDetailData {
  _id: string;
  bookingId: string;
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
  packageAmount: number;
  advancePaid: number;
  balancePending: number;
  total_hotel_cost?: number;
  total_cab_cost?: number;
  total_food_cost?: number;
  hotelCost?: number;
  cabVendorCost?: number;
  otherExpenses?: number;
  totalExpense?: number;
  netProfit?: number;
  status: 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled' | string;
  dailyLogs?: DailyLog[];
  createdAt?: string;
  updatedAt?: string;
}

interface PackageDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pkg: PackageDetailData | null;
  onEdit?: (pkg: PackageDetailData) => void;
  onOpenItinerary?: (pkg: PackageDetailData) => void;
  onRecordPayment?: (pkg: PackageDetailData) => void;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function PackageDetailsModal({
  isOpen,
  onClose,
  pkg,
  onEdit,
  onOpenItinerary,
  onRecordPayment,
}: PackageDetailsModalProps) {
  const [copied, setCopied] = useState(false);
  const [currentPkg, setCurrentPkg] = useState<PackageDetailData | null>(pkg);
  const [fleetLogs, setFleetLogs] = useState<any[]>([]);
  const [packageFoodLogs, setPackageFoodLogs] = useState<any[]>([]);
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [editingFoodItem, setEditingFoodItem] = useState<any | null>(null);

  const reloadData = useCallback(async () => {
    if (!pkg?._id) return;
    try {
      const res = await fetch(`/api/packages/${pkg._id}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentPkg(data);
        if (Array.isArray(data.fleetLogs)) {
          setFleetLogs(data.fleetLogs);
        }
      }

      const foodRes = await fetch(`/api/food?packageId=${pkg.bookingId}`);
      if (foodRes.ok) {
        const fData = await foodRes.json();
        setPackageFoodLogs(Array.isArray(fData) ? fData : []);
      }
    } catch {
      // ignore
    }
  }, [pkg]);

  useEffect(() => {
    if (isOpen && pkg) {
      setCurrentPkg(pkg);
      reloadData();
    } else {
      setFleetLogs([]);
      setPackageFoodLogs([]);
    }
  }, [isOpen, pkg, reloadData]);

  if (!isOpen || !currentPkg) return null;

  const displayPkg = currentPkg;

  const handleDownloadPDF = () => {
    exportSinglePackagePDF(displayPkg, fleetLogs);
  };

  const copyBookingId = () => {
    navigator.clipboard.writeText(displayPkg.bookingId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteFood = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dining expense?')) return;
    try {
      const res = await fetch(`/api/food/${id}`, { method: 'DELETE' });
      if (res.ok) {
        reloadData();
      }
    } catch {
      // ignore
    }
  };

  const statusConfig = getStatusConfig(displayPkg.status);
  const formattedGuestName = formatName(displayPkg.guestName);
  const initials = getInitials(displayPkg.guestName);

  // Auto-calculated costs & profit breakdown
  const hotelCost = Number(displayPkg.total_hotel_cost) || Number(displayPkg.hotelCost) || 0;
  const cabCost =
    Number(displayPkg.total_cab_cost) ||
    Number(displayPkg.cabVendorCost) ||
    fleetLogs.reduce((s, f) => s + (Number(f.daily_cab_cost) || Number(f.vendorCost) || 0), 0);
  const foodCost =
    Number(displayPkg.total_food_cost) ||
    packageFoodLogs.reduce((s, f) => s + (Number(f.foodCost) || 0), 0);
  const grandTotalOperationalCost = hotelCost + cabCost + foodCost;
  const packageRevenue = Number(displayPkg.packageAmount) || 0;
  const netProfit = packageRevenue - grandTotalOperationalCost;
  const profitMargin = packageRevenue > 0 ? ((netProfit / packageRevenue) * 100).toFixed(1) : '0.0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {/* Executive Header */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-gradient-to-r from-slate-950 via-[#0B192C] to-slate-900 text-white">
          <div className="flex items-start gap-4">
            {/* Guest Initial Avatar */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-white font-heading font-bold text-xl flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-white/20">
              {initials}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Booking ID Pill */}
                <span className="font-mono font-bold text-xs bg-white/15 hover:bg-white/20 px-2.5 py-1 rounded-lg tracking-wider text-amber-300 flex items-center gap-1.5 transition-colors">
                  {displayPkg.bookingId}
                  <button
                    onClick={copyBookingId}
                    className="hover:text-white transition-colors"
                    title="Copy Booking ID"
                  >
                    {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  </button>
                </span>

                {/* Status Badge */}
                <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${statusConfig.darkClassName}`}>
                  <span className={`w-2 h-2 rounded-full ${statusConfig.dot} ${statusConfig.pulse ? 'animate-pulse' : ''}`} />
                  {statusConfig.label}
                </span>

                {displayPkg.totalDays && (
                  <span className="text-xs bg-white/10 px-2.5 py-1 rounded-full text-white/80 font-medium">
                    {displayPkg.totalDays}
                  </span>
                )}
              </div>

              {/* Guest Name */}
              <h2 className="text-2xl font-bold font-heading text-white tracking-tight">
                {formattedGuestName}
              </h2>

              <p className="text-xs text-white/70">
                Booked via <span className="text-white font-medium">{displayPkg.agencyName || 'Direct'}</span> • <span className="text-amber-300 font-medium">{displayPkg.totalPax} Guests</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {displayPkg.contactNumber && (
              <a
                href={getGuestWhatsAppLink(displayPkg, fleetLogs)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all border border-emerald-500"
                title="Send Confirmed Itinerary to Guest on WhatsApp"
              >
                <MessageCircle size={14} />
                <span className="hidden sm:inline">WhatsApp Itinerary</span>
              </a>
            )}
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm transition-all border border-white/10 shadow-sm"
              title="Download Full Package Voucher PDF"
            >
              <FileText size={14} className="text-amber-300" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {/* Status & Guest Highlight Banner */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
                <UserCheck size={20} />
              </div>
              <div>
                <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                  Lead Guest & Booking Status
                </div>
                <div className="font-bold text-gray-900 text-base">
                  {formattedGuestName}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs ${statusConfig.className}`}>
                <span className={`w-2 h-2 rounded-full ${statusConfig.dot} ${statusConfig.pulse ? 'animate-pulse' : ''}`} />
                <span>
                  <strong>{statusConfig.label}</strong> — {statusConfig.description}
                </span>
              </span>
            </div>
          </div>

          {/* Financial Summary Cards */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Financial Overview
              </h3>
              {onRecordPayment && (
                <button
                  onClick={() => onRecordPayment(displayPkg)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-200"
                >
                  <CreditCard size={13} />
                  Record Payment
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="text-xs text-gray-400 font-medium flex items-center gap-1.5 mb-1">
                  <IndianRupee size={13} className="text-blue-500" />
                  Package Amount
                </div>
                <div className="text-xl font-bold font-heading text-gray-900">
                  {formatDisplayCurrency(displayPkg.packageAmount)}
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="text-xs text-gray-400 font-medium flex items-center gap-1.5 mb-1">
                  <IndianRupee size={13} className="text-green-500" />
                  Advance Paid
                </div>
                <div className="text-xl font-bold font-heading text-green-600">
                  {formatDisplayCurrency(displayPkg.advancePaid)}
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="text-xs text-gray-400 font-medium flex items-center gap-1.5 mb-1">
                  <IndianRupee size={13} className={displayPkg.balancePending > 0 ? 'text-red-500' : 'text-gray-400'} />
                  Balance Pending
                </div>
                <div className={`text-xl font-bold font-heading ${displayPkg.balancePending > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatDisplayCurrency(displayPkg.balancePending)}
                </div>
              </div>
            </div>
          </div>

          {/* Master Package Cost & Profit Breakdown Card (Auto-Calculation) */}
          <div className="bg-gradient-to-br from-slate-900 via-[#0B192C] to-slate-950 text-white rounded-3xl p-5 border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center">
                  <Receipt size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Master Package Cost & Profit Breakdown
                  </h4>
                  <p className="text-[11px] text-white/60">
                    Real-time operational expenses auto-aggregated against revenue
                  </p>
                </div>
              </div>

              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  netProfit >= 0
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}
              >
                {netProfit >= 0 ? 'Net Profit' : 'Net Loss'}: {formatDisplayCurrency(netProfit)}{' '}
                {packageRevenue > 0 && `(${profitMargin}%)`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/10">
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                <div className="text-[11px] text-white/60 mb-0.5 flex items-center gap-1">
                  <Hotel size={12} className="text-amber-400" /> Hotel & Room Cost
                </div>
                <div className="text-base font-bold font-mono text-amber-300">
                  {formatDisplayCurrency(hotelCost)}
                </div>
                <div className="text-[10px] text-white/40 mt-0.5">
                  {displayPkg.numberOfRooms ?? 1} Rooms &bull; {displayPkg.extraBeds ?? 0} Beds
                </div>
              </div>

              <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                <div className="text-[11px] text-white/60 mb-0.5 flex items-center gap-1">
                  <Truck size={12} className="text-blue-400" /> Cab Fleet Cost
                </div>
                <div className="text-base font-bold font-mono text-blue-300">
                  {formatDisplayCurrency(cabCost)}
                </div>
                <div className="text-[10px] text-white/40 mt-0.5">
                  {fleetLogs.length} Assigned Days
                </div>
              </div>

              <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                <div className="text-[11px] text-white/60 mb-0.5 flex items-center gap-1">
                  <UtensilsCrossed size={12} className="text-orange-400" /> Food & Dining Cost
                </div>
                <div className="text-base font-bold font-mono text-orange-300">
                  {formatDisplayCurrency(foodCost)}
                </div>
                <div className="text-[10px] text-white/40 mt-0.5">
                  {packageFoodLogs.length} Meals Logged
                </div>
              </div>

              <div className="bg-white/10 p-3 rounded-2xl border border-white/20">
                <div className="text-[11px] text-white/70 mb-0.5 flex items-center gap-1 font-semibold">
                  <IndianRupee size={12} className="text-white" /> Grand Total Cost
                </div>
                <div className="text-base font-bold font-mono text-white">
                  {formatDisplayCurrency(grandTotalOperationalCost)}
                </div>
                <div className="text-[10px] text-white/50 mt-0.5">
                  Hotel + Cab + Food
                </div>
              </div>
            </div>
          </div>

          {/* Guest & Trip Key Details */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Guest & Schedule Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="text-xs text-gray-400 flex items-center gap-1">
                  <Phone size={12} />
                  Contact Phone
                </div>
                {displayPkg.contactNumber ? (
                  <a
                    href={`tel:${displayPkg.contactNumber}`}
                    className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1 font-mono"
                  >
                    {displayPkg.contactNumber}
                  </a>
                ) : (
                  <span className="text-sm text-gray-400">—</span>
                )}
              </div>

              <div className="space-y-1">
                <div className="text-xs text-gray-400 flex items-center gap-1">
                  <Building2 size={12} />
                  Booking Agency
                </div>
                <div className="text-sm font-semibold text-gray-800">
                  {displayPkg.agencyName || 'Direct'}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-gray-400 flex items-center gap-1">
                  <Users size={12} />
                  Total Guests
                </div>
                <div className="text-sm font-semibold text-gray-800">
                  {displayPkg.totalPax} Pax
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock size={12} />
                  Duration
                </div>
                <div className="text-sm font-semibold text-gray-800">
                  {displayPkg.totalDays || '—'}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100/70">
                <div className="text-xs text-amber-700 font-medium flex items-center gap-1 mb-0.5">
                  <Calendar size={13} />
                  Check-in Date
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {formatDate(displayPkg.checkInDate)}
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <div className="text-xs text-slate-600 font-medium flex items-center justify-between mb-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar size={13} />
                    Check-out Date
                  </span>
                  {(() => {
                    const cm = getCrossMonthInfo(displayPkg.checkInDate, displayPkg.checkOutDate);
                    return cm.isCrossMonth ? (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-2xs"
                        title={`Cross-month tour: from ${formatDate(displayPkg.checkInDate)} to ${formatDate(displayPkg.checkOutDate)}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                        {cm.label}
                      </span>
                    ) : null;
                  })()}
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {formatDate(displayPkg.checkOutDate)}
                </div>
              </div>
            </div>
          </div>

          {/* Hotel & Stay Information */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Hotel size={14} className="text-amber-500" />
                Hotel & Room Allocation
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg">
                  🛏️ {displayPkg.numberOfRooms ?? 1} Room{(displayPkg.numberOfRooms ?? 1) > 1 ? 's' : ''}
                </span>
                <span className="text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200 px-2.5 py-1 rounded-lg">
                  ➕ {displayPkg.extraBeds ?? 0} Extra Bed{(displayPkg.extraBeds ?? 0) !== 1 ? 's' : ''}
                </span>
                <span className="text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-200 px-2.5 py-1 rounded-lg font-mono">
                  🏨 Hotel Cost: {formatDisplayCurrency(hotelCost)}
                </span>
              </div>
            </div>

            {displayPkg.hotelName && (
              <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="text-amber-600 font-semibold text-xs uppercase tracking-wide">Assigned Hotel:</span>
                <span>{displayPkg.hotelName}</span>
              </div>
            )}

            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed bg-gray-50 p-3.5 rounded-xl border border-gray-100">
              {displayPkg.hotelDetails || 'No additional hotel notes specified for this package.'}
            </p>
          </div>

          {/* Day-by-Day Daily Logs / Itinerary */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={14} className="text-amber-500" />
                Daily Itinerary Plan ({displayPkg.dailyLogs?.length || 0} Days)
              </h3>
              {onOpenItinerary && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenItinerary(displayPkg);
                  }}
                  className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1"
                >
                  Edit Itinerary <ExternalLink size={12} />
                </button>
              )}
            </div>

            {displayPkg.dailyLogs && displayPkg.dailyLogs.length > 0 ? (
              <div className="space-y-2.5">
                {displayPkg.dailyLogs.map((log) => (
                  <div
                    key={log.dayNumber}
                    className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/70 hover:bg-white hover:border-amber-200 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                          Day {log.dayNumber}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                          {formatDate(log.date)}
                        </span>
                      </div>
                      {log.hotelStayed && (
                        <span className="text-xs text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Hotel size={11} className="text-gray-400" />
                          {log.hotelStayed}
                        </span>
                      )}
                    </div>

                    <div className="text-sm font-semibold text-gray-800 mb-0.5">
                      {log.placesVisited || 'Places visited not specified'}
                    </div>

                    {log.dailyRemarks && (
                      <p className="text-xs text-gray-500 italic mt-1">
                        Note: {log.dailyRemarks}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl bg-gray-50">
                <p className="text-xs text-gray-400">
                  No day-by-day itinerary logs created yet.
                </p>
                {onOpenItinerary && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenItinerary(displayPkg);
                    }}
                    className="mt-2 text-xs font-semibold text-amber-600 hover:text-amber-700"
                  >
                    + Add Day-by-Day Itinerary
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Assigned Daily Fleet & Cab Schedule */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Truck size={14} className="text-blue-600" />
                Assigned Daily Fleet & Cabs ({fleetLogs.length} Days)
              </h3>
              {onEdit && (
                <button
                  onClick={() => {
                    onClose();
                    onEdit(displayPkg);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                >
                  Manage Fleet <Edit size={12} />
                </button>
              )}
            </div>

            {fleetLogs.length > 0 ? (
              <div className="space-y-2.5">
                {fleetLogs.map((log: any, idx: number) => {
                  const logCabCost = Number(log.daily_cab_cost) || Number(log.vendorCost) || 0;
                  return (
                    <div
                      key={log._id || `view-fleet-${idx}`}
                      className="p-3.5 rounded-xl border border-gray-100 bg-slate-50/70 hover:bg-white hover:border-blue-200 transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-heading font-bold text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                            Day {idx + 1}
                          </span>
                          <span className="text-xs text-gray-700 font-semibold">
                            {formatDate(log.operationDate)}
                          </span>
                          {log.paxInVehicle && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              {log.paxInVehicle} Pax
                            </span>
                          )}
                          <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded">
                            {log.numberOfCabs ?? 1} Cab{(log.numberOfCabs ?? 1) > 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-gray-900 bg-white border border-gray-200 px-2 py-0.5 rounded-md">
                            {log.vehicleType || 'Vehicle'}
                          </span>
                          {log.vehicleNumber && (
                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md uppercase">
                              {log.vehicleNumber}
                            </span>
                          )}
                          <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            Cost: {formatDisplayCurrency(logCabCost)}
                          </span>
                        </div>
                      </div>

                      <div className="text-sm font-semibold text-gray-900">
                        🛣️ {log.dutyRoute || 'Duty route not specified'}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap pt-1 border-t border-gray-200/50">
                        {log.driverName && (
                          <div>
                            Driver: <strong className="text-gray-800">{log.driverName}</strong>
                          </div>
                        )}
                        {log.driverPhone && (
                          <div className="flex items-center gap-2">
                            <a
                              href={`tel:${log.driverPhone}`}
                              className="text-blue-600 hover:underline flex items-center gap-1 font-mono"
                            >
                              <Phone size={10} /> {log.driverPhone}
                            </a>
                            <a
                              href={getDriverDutyWhatsAppLink(log, displayPkg)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold flex items-center gap-1 text-[11px] border border-emerald-200 transition-colors"
                              title="Dispatch Duty Slip to Driver on WhatsApp"
                            >
                              <MessageCircle size={10} />
                              <span>WhatsApp Duty</span>
                            </a>
                          </div>
                        )}
                        {log.vendorName && (
                          <div className="text-gray-500">
                            Vendor: <span className="font-medium text-gray-700">{log.vendorName}</span>
                          </div>
                        )}
                      </div>

                      {log.remarks && (
                        <p className="text-xs text-gray-500 italic">
                          Note: {log.remarks}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl bg-gray-50">
                <Truck size={24} className="mx-auto text-gray-400 mb-1" />
                <p className="text-xs text-gray-400">
                  No fleet vehicles assigned to this package yet.
                </p>
                {onEdit && (
                  <button
                    onClick={() => {
                      onClose();
                      onEdit(displayPkg);
                    }}
                    className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    + Assign Cabs & Drivers
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Food & Dining Section */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <UtensilsCrossed size={14} className="text-orange-500" />
                Food & Dining Expenses ({packageFoodLogs.length} Records)
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-lg">
                  Total Food: {formatDisplayCurrency(foodCost)}
                </span>
                <button
                  onClick={() => {
                    setEditingFoodItem(null);
                    setShowFoodModal(true);
                  }}
                  className="text-xs font-semibold text-white px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#FF9F1C' }}
                >
                  <Plus size={12} /> Add Dining Bill
                </button>
              </div>
            </div>

            {packageFoodLogs.length > 0 ? (
              <div className="space-y-2">
                {packageFoodLogs.map((food: any) => (
                  <div
                    key={food._id}
                    className="p-3 rounded-xl border border-gray-100 bg-orange-50/20 hover:bg-white hover:border-orange-200 transition-colors flex items-center justify-between flex-wrap gap-2"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">{food.restaurantName}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                          {food.mealType}
                        </span>
                        <span className="text-[11px] text-gray-500 font-medium">
                          {formatDate(food.mealDate)}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {food.paxCount ? `${food.paxCount} Pax` : ''}{' '}
                        {food.remarks && `• Note: ${food.remarks}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="font-mono font-bold text-sm text-gray-900">
                        {formatDisplayCurrency(food.foodCost)}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingFoodItem(food);
                            setShowFoodModal(true);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Bill"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteFood(food._id)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Bill"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl bg-gray-50">
                <UtensilsCrossed size={24} className="mx-auto text-gray-400 mb-1" />
                <p className="text-xs text-gray-400">No dining bills recorded for this package.</p>
                <button
                  onClick={() => {
                    setEditingFoodItem(null);
                    setShowFoodModal(true);
                  }}
                  className="mt-2 text-xs font-semibold text-orange-600 hover:text-orange-700"
                >
                  + Record Guest Dining Expense
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-white flex items-center justify-between gap-3">
          <div className="text-xs text-gray-400">
            Booking ID: <span className="font-mono text-gray-600">{displayPkg.bookingId}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm hover:opacity-90 transition-all"
              style={{ backgroundColor: '#0B192C' }}
              title="Download Full Package Voucher PDF"
            >
              <Download size={14} className="text-amber-400" />
              Download Voucher PDF
            </button>
            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(displayPkg);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                <Edit size={14} />
                Edit Package
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Food Modal */}
      <FoodModal
        isOpen={showFoodModal}
        onClose={() => {
          setShowFoodModal(false);
          setEditingFoodItem(null);
        }}
        onSave={reloadData}
        editData={editingFoodItem}
        defaultPackageId={displayPkg.bookingId}
        defaultGuestName={displayPkg.guestName}
        addToast={() => {}}
      />
    </div>
  );
}
