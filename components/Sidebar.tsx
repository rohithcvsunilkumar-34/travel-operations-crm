'use client';
import { useState, useEffect } from 'react';
import { LayoutDashboard, Package, Truck, ClipboardList, Trash2, X, LogOut, User, Shield, Hotel, Car } from 'lucide-react';

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
  { id: 'hotels', label: 'Hotels & Rooms', icon: Hotel },
  { id: 'vendors', label: 'Cab Vendors', icon: Car },
  { id: 'cleanup', label: 'Data Cleanup', icon: Trash2 },
];

export default function Sidebar({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen }: SidebarProps) {
  const [username, setUsername] = useState('admin');
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.username) {
          setUsername(data.username);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to log out of TravelOps CRM?')) return;
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      window.location.href = '/login';
    }
  };

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

        {/* User Profile & Sign Out Footer */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                {username.slice(0, 2).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-white truncate capitalize">
                  {username}
                </div>
                <div className="text-[10px] text-white/50 flex items-center gap-1">
                  <Shield size={10} className="text-amber-400" />
                  <span>Authenticated</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="p-1.5 rounded-lg text-white/60 hover:text-red-400 hover:bg-white/10 transition-colors"
              title="Sign Out / Lock CRM"
            >
              <LogOut size={16} />
            </button>
          </div>

          <div className="text-[11px] text-white/30 text-center">
            Travel CRM &bull; Protected Session
          </div>
        </div>
      </aside>
    </>
  );
}
