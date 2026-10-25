'use client';
import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

export default function Toast({ toasts, removeToast }: ToastProps) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const config = {
    success: { icon: CheckCircle, bg: 'bg-emerald-600', border: 'border-emerald-700' },
    error: { icon: XCircle, bg: 'bg-rose-600', border: 'border-rose-700' },
    warning: { icon: AlertCircle, bg: 'bg-amber-500', border: 'border-amber-600' },
    info: { icon: Info, bg: 'bg-blue-600', border: 'border-blue-700' },
  }[toast.type];

  const Icon = config.icon;

  return (
    <div className={`pointer-events-auto toast-enter flex items-center gap-3 ${config.bg} text-white px-4 py-3 rounded-xl shadow-2xl border ${config.border} min-w-[280px]`}>
      <Icon size={20} className="flex-shrink-0" />
      <span className="text-sm font-medium flex-1">{toast.message}</span>
      <button onClick={() => onRemove(toast.id)} className="flex-shrink-0 hover:opacity-70 transition-opacity">
        <X size={16} />
      </button>
    </div>
  );
}
