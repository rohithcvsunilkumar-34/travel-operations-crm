/**
 * Centralized formatting utilities for names, status badges, dates, and currency.
 */

export function formatName(name?: string): string {
  if (!name || !name.trim()) return '—';
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function getInitials(name?: string): string {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface StatusConfig {
  label: 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled' | string;
  className: string;
  darkClassName: string;
  dot: string;
  pulse: boolean;
  description: string;
}

export function getStatusConfig(statusRaw?: string): StatusConfig {
  const s = (statusRaw || '').trim().toLowerCase();

  if (s === 'ongoing') {
    return {
      label: 'Ongoing',
      className: 'bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-xs font-semibold',
      darkClassName: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-semibold',
      dot: 'bg-emerald-500',
      pulse: true,
      description: 'Currently traveling on ground / in transit',
    };
  }

  if (s === 'upcoming') {
    return {
      label: 'Upcoming',
      className: 'bg-blue-50 text-blue-800 border border-blue-200/90 shadow-xs font-semibold',
      darkClassName: 'bg-sky-500/20 text-sky-300 border border-sky-400/40 font-semibold',
      dot: 'bg-blue-500',
      pulse: false,
      description: 'Tour scheduled and confirmed',
    };
  }

  if (s === 'completed') {
    return {
      label: 'Completed',
      className: 'bg-slate-100 text-slate-800 border border-slate-200/90 shadow-xs font-semibold',
      darkClassName: 'bg-purple-500/20 text-purple-300 border border-purple-400/40 font-semibold',
      dot: 'bg-slate-500',
      pulse: false,
      description: 'Tour concluded successfully',
    };
  }

  if (s === 'cancelled') {
    return {
      label: 'Cancelled',
      className: 'bg-rose-50 text-rose-800 border border-rose-200/90 shadow-xs font-semibold',
      darkClassName: 'bg-rose-500/20 text-rose-300 border border-rose-400/40 font-semibold',
      dot: 'bg-rose-500',
      pulse: false,
      description: 'Booking cancelled or inactive',
    };
  }

  return {
    label: statusRaw ? formatName(statusRaw) : 'Pending',
    className: 'bg-gray-100 text-gray-800 border border-gray-200 shadow-xs font-semibold',
    darkClassName: 'bg-white/10 text-white/80 border border-white/20 font-semibold',
    dot: 'bg-gray-400',
    pulse: false,
    description: 'Status not specified',
  };
}

export function formatDisplayCurrency(amount?: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export interface CrossMonthInfo {
  isCrossMonth: boolean;
  label: string;
  fromMonth: string;
  toMonth: string;
  shortLabel: string;
}

const SHORT_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Checks whether a booking spans across different calendar months (or years).
 * Returns cross-month metadata and visual badge labels.
 */
export function getCrossMonthInfo(
  checkIn?: string | Date | null,
  checkOut?: string | Date | null
): CrossMonthInfo {
  if (!checkIn || !checkOut) {
    return { isCrossMonth: false, label: '', fromMonth: '', toMonth: '', shortLabel: '' };
  }
  const inD = new Date(checkIn);
  const outD = new Date(checkOut);
  if (isNaN(inD.getTime()) || isNaN(outD.getTime())) {
    return { isCrossMonth: false, label: '', fromMonth: '', toMonth: '', shortLabel: '' };
  }

  const inM = inD.getMonth();
  const outM = outD.getMonth();
  const inY = inD.getFullYear();
  const outY = outD.getFullYear();

  if (inY !== outY || inM !== outM) {
    const fromMonth = SHORT_MONTH_NAMES[inM];
    const toMonth = SHORT_MONTH_NAMES[outM];
    return {
      isCrossMonth: true,
      label: `Spans ${fromMonth} - ${toMonth}`,
      fromMonth,
      toMonth,
      shortLabel: `${fromMonth} ➔ ${toMonth}`,
    };
  }

  return { isCrossMonth: false, label: '', fromMonth: '', toMonth: '', shortLabel: '' };
}


