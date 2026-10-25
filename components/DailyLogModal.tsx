'use client';
import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Loader2, MapPin } from 'lucide-react';
import { ToastMessage } from './Toast';

interface DailyLog {
  dayNumber: number;
  date: string;
  placesVisited: string;
  hotelStayed: string;
  dailyRemarks: string;
}

interface DailyLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageId: string;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  totalDays: string;
  existingLogs: DailyLog[];
  addToast: (msg: Omit<ToastMessage, 'id'>) => void;
  onSave: () => void;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function DailyLogModal({
  isOpen,
  onClose,
  packageId,
  guestName,
  checkInDate,
  checkOutDate,
  totalDays,
  existingLogs,
  addToast,
  onSave,
}: DailyLogModalProps) {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (existingLogs && existingLogs.length > 0) {
      setLogs(
        existingLogs.map((l) => ({
          ...l,
          date: l.date ? l.date.slice(0, 10) : '',
        }))
      );
    } else if (checkInDate && checkOutDate) {
      const inDate = new Date(checkInDate);
      const outDate = new Date(checkOutDate);
      const diff = Math.round((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24));
      const numDays = diff + 1;
      const generatedLogs: DailyLog[] = Array.from({ length: numDays }, (_, i) => ({
        dayNumber: i + 1,
        date: addDays(checkInDate, i),
        placesVisited: '',
        hotelStayed: '',
        dailyRemarks: '',
      }));
      setLogs(generatedLogs);
    }
  }, [isOpen, existingLogs, checkInDate, checkOutDate]);

  const addLog = () => {
    const lastDay = logs.length > 0 ? logs[logs.length - 1].dayNumber : 0;
    const lastDate = logs.length > 0 ? logs[logs.length - 1].date : checkInDate;
    setLogs((prev) => [
      ...prev,
      {
        dayNumber: lastDay + 1,
        date: lastDate ? addDays(lastDate, 1) : '',
        placesVisited: '',
        hotelStayed: '',
        dailyRemarks: '',
      },
    ]);
  };

  const removeLog = (index: number) => {
    setLogs((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLog = (index: number, field: keyof DailyLog, value: string | number) => {
    setLogs((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/packages/${packageId}/logs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyLogs: logs }),
      });
      if (!res.ok) throw new Error('Failed to save');
      addToast({ type: 'success', message: 'Daily itinerary saved!' });
      onSave();
      onClose();
    } catch {
      addToast({ type: 'error', message: 'Failed to save daily logs' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col modal-content">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <MapPin size={20} style={{ color: '#FF9F1C' }} />
              <h2 className="font-heading font-bold text-xl text-gray-900">Daily Itinerary Log</h2>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {guestName} &nbsp;|&nbsp; {totalDays || 'Custom Duration'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Logs list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {logs.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              <MapPin size={40} className="mx-auto mb-3 opacity-30" />
              <p>No itinerary days yet. Click &apos;Add Day&apos; to start.</p>
            </div>
          )}
          {logs.map((log, index) => (
            <div key={index} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: '#0B192C' }}
                  >
                    {log.dayNumber}
                  </span>
                  <div>
                    <span className="font-semibold text-gray-800 text-sm">Day {log.dayNumber}</span>
                    <input
                      type="date"
                      value={log.date}
                      onChange={(e) => updateLog(index, 'date', e.target.value)}
                      className="ml-3 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>
                <button onClick={() => removeLog(index)} className="text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Places Visited</label>
                  <input
                    type="text"
                    value={log.placesVisited}
                    onChange={(e) => updateLog(index, 'placesVisited', e.target.value)}
                    placeholder="e.g., Dal Lake, Gulmarg, Mughal Gardens"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Hotel / Houseboat Stayed</label>
                  <input
                    type="text"
                    value={log.hotelStayed}
                    onChange={(e) => updateLog(index, 'hotelStayed', e.target.value)}
                    placeholder="Hotel name or Houseboat"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Daily Remarks / Notes</label>
                  <textarea
                    value={log.dailyRemarks}
                    onChange={(e) => updateLog(index, 'dailyRemarks', e.target.value)}
                    placeholder="Operational notes, special requests, issues..."
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-100">
          <button
            onClick={addLog}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border-2 rounded-lg transition-colors hover:bg-gray-50"
            style={{ borderColor: '#0B192C', color: '#0B192C' }}
          >
            <Plus size={16} />
            Add Day
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 disabled:opacity-60"
              style={{ backgroundColor: '#FF9F1C' }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Itinerary
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
