'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser, logOutAdmin, isSupabaseConfigured } from '../../lib/supabase/authHelper';
import { User } from '@supabase/supabase-js';

type AdminUser = Pick<User, 'email'>;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  // Exclude login page from the dashboard shell and auth check
  const isLoginPage = pathname === '/admin/login';
  const [loading, setLoading] = useState(!isLoginPage);
  const [user, setUser] = useState<AdminUser | null>(null);
  const supabaseActive = isSupabaseConfigured();

  useEffect(() => {
    if (isLoginPage) {
      return;
    }

    let isMounted = true;
    const verifySession = async () => {
      const activeUser = await getSessionUser();
      if (!isMounted) return;

      if (!activeUser) {
        router.push('/admin/login');
      } else {
        setUser(activeUser);
        setLoading(false);
      }
    };

    verifySession();
    return () => {
      isMounted = false;
    };
  }, [pathname, isLoginPage, router]);

  const handleSignOut = async () => {
    if (confirm('Tem certeza que deseja sair do painel?')) {
      await logOutAdmin();
      router.push('/admin/login');
    }
  };

  // If loading the auth check session, render a clean spinner
  if (loading && !isLoginPage) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-10 h-10 border-4 border-[#8C6D62]/20 border-t-[#8C6D62] rounded-full animate-spin"></div>
        <p className="text-xs uppercase font-extrabold text-[#8A7A78] tracking-widest">
          Validando credenciais admin...
        </p>
      </div>
    );
  }

  // If login route, bypass shell decoration
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Menu links configuration
  const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: '📊' },
    { name: 'Produtos', path: '/admin/produtos', icon: '🛍️' },
    { name: 'Lojas', path: '/admin/lojas', icon: '🏪' },
    { name: 'Estatísticas', path: '/admin/estatisticas', icon: '📈' },
  ];

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col md:flex-row">
      
      {/* 1. Sidebar Navigation (Desktop only) */}
      <aside className="hidden md:flex md:w-64 bg-[#FCFAF6] border-r border-[#E8E2D5] flex-col gap-6 p-6 shrink-0">
        <div>
          <h2 className="text-2xl font-black text-[#4A3D3C] font-serif tracking-tight">
            Achadinhos
          </h2>
          <span className="text-[9px] uppercase tracking-widest text-[#8A7A78] font-extrabold -mt-1 block">
            Painel Curation Admin
          </span>
        </div>

        {/* Info Banner when in Simulation Mode */}
        {!supabaseActive && (
          <div className="bg-[#FFF2D6]/70 border border-[#FFE2A4] rounded-2xl p-3 text-[10px] text-[#A66C02] leading-normal font-medium">
            💡 Simulação local ativa
          </div>
        )}

        {/* Admin profile widget */}
        {user && (
          <div className="bg-[#EAE4D8]/30 border border-[#E8E2D5]/70 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#8C6D62] text-[#FCFAF6] flex items-center justify-center text-sm font-bold">
              👑
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-extrabold text-[#4A3D3C] truncate leading-tight">
                Curador VIP
              </span>
              <span className="text-[9px] text-[#8A7A78] truncate">
                {user.email}
              </span>
            </div>
          </div>
        )}

        {/* Sidebar Nav Links */}
        <nav className="flex flex-col gap-1">
          {menuItems.map((item) => {
            const isActive =
              item.path === '/admin' ? pathname === '/admin' : pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl border transition-all duration-200 ${
                  isActive
                    ? 'bg-[#4A3D3C] text-[#FCFAF6] border-[#4A3D3C] shadow-sm'
                    : 'bg-transparent text-[#5C4D4C] border-transparent hover:bg-[#F5F1E7] hover:border-[#DFD7C7]/50'
                }`}
              >
                <span className="text-sm">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Logout action */}
        <button
          onClick={handleSignOut}
          className="mt-auto flex items-center gap-3 px-4 py-3.5 text-xs font-extrabold rounded-xl border border-transparent text-[#9A4C3A] hover:bg-[#F2E5E2] hover:border-[#E8D4D0]/50 transition-all text-left cursor-pointer"
        >
          <span>🚪</span>
          Sair do Painel
        </button>
      </aside>

      {/* 2. Top Header & Bottom Navigation (Mobile Curation Shell) */}
      <div className="md:hidden flex flex-col w-full sticky top-0 z-50 bg-[#FDFBF7] border-b border-[#E8E2D5]">
        <div className="px-4 py-3 flex items-center justify-between bg-[#FCFAF6]">
          <div>
            <h2 className="text-lg font-black text-[#4A3D3C] font-serif leading-tight">
              Achadinhos
            </h2>
            <span className="text-[8px] uppercase tracking-widest text-[#8A7A78] font-bold">
              Painel Admin {!supabaseActive && '· Simulação'}
            </span>
          </div>

          <button
            onClick={handleSignOut}
            className="text-xs font-extrabold text-[#9A4C3A] bg-[#F2E5E2]/40 border border-[#E8D4D0]/30 px-2.5 py-1.5 rounded-lg active:scale-95 transition-all"
          >
            Sair
          </button>
        </div>

        {/* Mobile quick link row */}
        <nav className="flex items-center justify-around border-t border-[#E8E2D5]/50 px-1 py-1">
          {menuItems.map((item) => {
            const isActive =
              item.path === '/admin' ? pathname === '/admin' : pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex flex-col items-center gap-1.5 py-2 px-3 text-[9px] font-extrabold rounded-xl transition-all shrink-0 ${
                  isActive ? 'text-[#8C6D62] scale-105' : 'text-[#8A7A78] hover:text-[#4A3D3C]'
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* 3. Primary Dashboard Body Content */}
      <div className="flex-grow flex flex-col min-w-0 max-w-full">
        {children}
      </div>
    </div>
  );
}
