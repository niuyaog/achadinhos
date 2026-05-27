'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn, isSimulationMode, getSessionUser } from '../../../lib/supabase/authHelper';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const simulationActive = isSimulationMode();

  // Check initial configurations and active sessions
  useEffect(() => {
    let isMounted = true;
    const checkActiveSession = async () => {
      const user = await getSessionUser();
      if (isMounted && user) {
        router.push('/admin');
      }
    };
    checkActiveSession();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await signIn(email, password);
      
      if (error) {
        setErrorMsg(error.message);
      } else if (data.user) {
        router.push('/admin');
      }
    } catch {
      setErrorMsg('Ocorreu um erro inesperado durante o login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center gap-2">
        <Link href="/" className="text-3xl font-extrabold tracking-tight text-[#4A3D3C] font-serif">
          Achadinhos
        </Link>
        <h2 className="text-center text-sm font-extrabold text-[#8A7A78] uppercase tracking-wider">
          Acesso Painel Curation Admin
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#FCFAF6] py-8 px-6 border border-[#E8E2D5] shadow-lg rounded-[2rem] flex flex-col gap-6">
          
          {/* Simulation mode info box */}
          {simulationActive && (
            <div className="bg-[#FFF2D6] border border-[#FFE2A4] rounded-2xl p-4 text-xs text-[#A66C02] leading-relaxed flex flex-col gap-1.5 shadow-sm">
              <span className="font-extrabold flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                ✨ Modo de Simulação Ativo
              </span>
              <p>
                A integração do Supabase está estruturada, mas aguardando suas credenciais reais no <code>.env.local</code>.
              </p>
              <p className="font-bold bg-white/50 px-2.5 py-1 rounded-md mt-1 border border-[#FFE2A4]/50">
                🔑 Acesse com:<br/>
                Email: <span className="underline select-all">admin@admin.com</span><br/>
                Senha: <span className="underline select-all">admin</span>
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="bg-[#F2E5E2] border border-[#E8D4D0] rounded-2xl p-3.5 text-xs text-[#9A4C3A] font-medium leading-relaxed">
              ⚠️ {errorMsg}
            </div>
          )}

          <form className="flex flex-col gap-5" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-[10px] uppercase tracking-wider font-extrabold text-[#8A7A78]">
                Endereço de E-mail
              </label>
              <div className="mt-1.5">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@achadinhos.com"
                  className="block w-full px-4 py-2.5 border border-[#DFD7C7] rounded-xl bg-[#FCFAF6] text-[#4A3D3C] text-sm focus:outline-none focus:ring-2 focus:ring-[#8C6D62] focus:border-transparent transition-all shadow-inner"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-[10px] uppercase tracking-wider font-extrabold text-[#8A7A78]">
                Senha de Acesso
              </label>
              <div className="mt-1.5">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full px-4 py-2.5 border border-[#DFD7C7] rounded-xl bg-[#FCFAF6] text-[#4A3D3C] text-sm focus:outline-none focus:ring-2 focus:ring-[#8C6D62] focus:border-transparent transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 border border-[#5C4033] rounded-2xl shadow-sm text-xs font-bold uppercase tracking-widest text-[#FCFAF6] bg-[#5C4033] hover:bg-[#4A3227] focus:outline-none transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Entrando...' : 'Entrar no Painel'}
              </button>
            </div>
          </form>

          <div className="border-t border-[#E8E2D5]/60 pt-4 text-center">
            <Link
              href="/"
              className="text-xs font-bold text-[#8C6D62] hover:text-[#4A3D3C] transition-colors"
            >
              ← Voltar para a Vitrine Pública
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
