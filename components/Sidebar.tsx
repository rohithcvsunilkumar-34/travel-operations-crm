'use client';
import { LayoutDashboard, Package, Truck, ClipboardList, Trash2, Menu, X } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
  { id: 'packages', label: 'Packages & Guests', icon: Package },
  { id: 'fleet', label: 'Fleet Tracker', icon: Truck },
  { id: 'cleanup', label: 'Data Cleanup', icon: Trash2 },
];

export default function Sidebar({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 flex flex-col transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:flex`}
        style={{ backgroundColor: '#0B192C', width: '260px', minWidth: '260px' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FF9F1C' }}>
                <ClipboardList size={18} className="text-white" />
              </div>
              <span className="font-heading font-bold text-white text-lg leading-tight">TravelOps</span>
            </div>
            <p className="text-white/40 text-xs mt-1 ml-10">CRM Dashboard</p>
          </div>
          <button
            className="lg:hidden text-white/60 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive
                    ? 'text-white shadow-lg'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                style={isActive ? { backgroundColor: '#FF9F1C' } : {}}
              >
                <Icon size={20} />
                <span className="font-body">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <p className="text-white/30 text-xs text-center">Travel CRM v1.0</p>
          <p className="text-white/20 text-xs text-center mt-1">Local MongoDB Edition</p>
        </div>
      </aside>
    </>
  );
}
