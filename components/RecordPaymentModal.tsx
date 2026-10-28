'use client';

import React, { useState } from 'react';
import { X, IndianRupee, CreditCard, Calendar, FileText, Check, Loader2 } from 'lucide-react';
import { ToastMessage } from './Toast';
import { exportPaymentReceiptPDF } from '@/lib/pdfExport';
import { formatName } from '@/lib/formatters';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  pkg: any | null;
  onPaymentRecorded?: () => void;
  addToast: (msg: Omit<ToastMessage, 'id'>) => void;
}

export default function RecordPaymentModal({
  isOpen,
  onClose,
  pkg,
  onPaymentRecorded,
  addToast,
}: RecordPaymentModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState<string>('UPI');
  const [transactionId, setTransactionId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen || !pkg) return null;

  const currentAdvance = Number(pkg.advancePaid) || 0;
  const packageAmount = Number(pkg.packageAmount) || 0;
  const currentBalance = Number(pkg.balancePending) || Math.max(0, packageAmount - currentAdvance);

  const numAmount = Number(amount) || 0;
  const projectedBalance = Math.max(0, currentBalance - numAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numAmount || numAmount <= 0) {
      addToast({ type: 'error', message: 'Please enter a valid payment amount greater than ₹0' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/packages/${pkg._id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount,
          paymentDate,
          paymentMode,
          transactionId,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record payment');
      }

      addToast({
        type: 'success',
        message: `Payment of ₹${numAmount.toLocaleString('en-IN')} recorded! Downloading receipt...`,
      });

      // Automatically generate & open official receipt PDF
      if (data.receipt) {
        exportPaymentReceiptPDF(data.receipt);
      }

      if (onPaymentRecorded) {
        onPaymentRecorded();
      }

      onClose();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Payment submission failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-950 via-[#0B192C] to-slate-900 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <IndianRupee size={20} />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-white">Record Payment</h3>
              <p className="text-xs text-white/70">
                {formatName(pkg.guestName)} &bull; <span className="font-mono text-amber-300">{pkg.bookingId}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Financial Overview Card */}
        <div className="p-5 bg-slate-50 border-b border-gray-100 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-white p-2.5 rounded-xl border border-gray-200">
            <div className="text-gray-400 font-medium">Package Total</div>
            <div className="font-bold text-gray-900 text-sm mt-0.5">₹{packageAmount.toLocaleString('en-IN')}</div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-gray-200">
            <div className="text-gray-400 font-medium">Paid So Far</div>
            <div className="font-bold text-emerald-700 text-sm mt-0.5">₹{currentAdvance.toLocaleString('en-IN')}</div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-gray-200">
            <div className="text-gray-400 font-medium">Balance Due</div>
            <div className={`font-bold text-sm mt-0.5 ${currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ₹{currentBalance.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Payment Amount */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Amount Received (₹) *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 font-bold">
                ₹
              </span>
              <input
                type="number"
                required
                min="1"
                max={currentBalance > 0 ? currentBalance : undefined}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Enter amount (e.g. ${currentBalance > 0 ? currentBalance : 5000})`}
                autoFocus
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>
            {currentBalance > 0 && (
              <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                <button
                  type="button"
                  onClick={() => setAmount(String(currentBalance))}
                  className="text-emerald-700 hover:underline font-semibold"
                >
                  Pay Full Balance (₹{currentBalance.toLocaleString('en-IN')})
                </button>
                {numAmount > 0 && (
                  <span>
                    New Balance: <strong className="text-gray-800">₹{projectedBalance.toLocaleString('en-IN')}</strong>
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Payment Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Payment Mode *
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="UPI">Google Pay / PhonePe / UPI</option>
                <option value="Bank Transfer">Bank Transfer / NEFT / IMPS</option>
                <option value="Cash">Cash at Office / Desk</option>
                <option value="Credit / Debit Card">Credit / Debit Card (POS)</option>
                <option value="Cheque">Cheque</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Reference / Transaction ID */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Transaction / Reference ID (Optional)
            </label>
            <input
              type="text"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="e.g. UPI Ref 328901238910 or Cheque #102931"
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Payment Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Internal Remarks / Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 50% advance for Munnar hotel booking"
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <FileText size={14} />
                  <span>Record & Generate Receipt PDF</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

