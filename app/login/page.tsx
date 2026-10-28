'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  ClipboardList,
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('from') || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Full page redirect so all cookies and Next.js middleware sync fresh
        window.location.href = redirectTo;
      } else {
        setError(data.error || 'Invalid username or password. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      setError('Failed to connect to authentication server. Please check your network.');
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-md">
      {/* Main Card */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
        {/* Card Header */}
        <div className="p-8 pb-6 text-center bg-gradient-to-b from-slate-900 to-[#0B192C] text-white">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-xl mb-4 ring-4 ring-white/10">
            <ClipboardList size={30} className="text-white" />
          </div>

          <h1 className="text-2xl font-bold font-heading text-white tracking-tight">
            TravelOps CRM
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Operations & Fleet Management Portal
          </p>

          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-white/10 text-xs text-amber-300 font-medium">
            <ShieldCheck size={13} />
            <span>Protected Operations Dashboard</span>
          </div>
        </div>

        {/* Form Section */}
        <div className="p-8 pt-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF9F1C] focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF9F1C] focus:bg-white transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#0B192C',
              }}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing In...</span>
                </div>
              ) : (
                <>
                  <span>Sign In to CRM</span>
                  <ArrowRight size={16} className="text-amber-400" />
                </>
              )}
            </button>
          </form>

          {/* Default Credentials Note / Instructions */}
          <div className="pt-4 border-t border-gray-100 text-center">
            <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-3 text-left">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                <ShieldCheck size={14} className="text-amber-600" />
                <span>Default Login Credentials</span>
              </div>
              <div className="mt-1.5 text-xs text-amber-800 space-y-0.5 font-mono">
                <div>Username: <span className="font-bold text-gray-900">admin</span></div>
                <div>Password: <span className="font-bold text-gray-900">admin123</span></div>
              </div>
              <p className="mt-2 text-[10px] text-amber-700/80 font-sans leading-relaxed">
                You can change username and password anytime in your <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono">.env.local</code> file via <code className="font-mono">CRM_ADMIN_USERNAME</code> and <code className="font-mono">CRM_ADMIN_PASSWORD</code>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Credit */}
      <p className="text-center text-xs text-white/40 mt-6">
        Travel Operations CRM &copy; {new Date().getFullYear()} &bull; Secure Offline Session
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-[#0B192C] to-slate-900"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Background Decorative Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <Suspense fallback={
        <div className="text-white text-sm flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span>Loading secure portal...</span>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}

