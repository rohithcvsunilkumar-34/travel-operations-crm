'use client';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  subtitle?: string;
  loading?: boolean;
}

export default function KPICard({ title, value, icon: Icon, color, subtitle, loading }: KPICardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon size={24} style={{ color }} />
        </div>
        {loading && (
          <div className="w-16 h-6 bg-gray-200 rounded animate-pulse" />
        )}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="w-12 h-8 bg-gray-200 rounded animate-pulse" />
          <div className="w-24 h-4 bg-gray-100 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <div className="text-3xl font-heading font-bold text-gray-900">{value}</div>
          <div className="text-sm font-medium text-gray-500 mt-1">{title}</div>
          {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
        </>
      )}
    </div>
  );
}
