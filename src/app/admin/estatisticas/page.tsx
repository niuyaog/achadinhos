'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  getTotalClicksCount,
  getClicksByProduct,
  getClicksByStore,
  getClicksByCategory,
  getRecentClicks,
} from '../../../lib/supabase/dataManager';
import { CategoryClickStat, ProductClickStat, RecentClickLog, StoreClickStat } from '../../../types';

export default function AdminStatsPage() {
  const [totalClicks, setTotalClicks] = useState(0);
  const [productStats, setProductStats] = useState<ProductClickStat[]>([]);
  const [storeStats, setStoreStats] = useState<StoreClickStat[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryClickStat[]>([]);
  const [recentLogs, setRecentLogs] = useState<RecentClickLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAllStats = async () => {
    try {
      const [total, prods, stores, categories, logs] = await Promise.all([
        getTotalClicksCount(),
        getClicksByProduct(),
        getClicksByStore(),
        getClicksByCategory(),
        getRecentClicks(10),
      ]);

      setTotalClicks(total);
      setProductStats(prods);
      setStoreStats(stores);
      setCategoryStats(categories);
      setRecentLogs(logs);
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const runLoad = async () => {
      if (!isMounted) return;
      await loadAllStats();
    };

    runLoad();
    return () => {
      isMounted = false;
    };
  }, []);

  // Top metrics helpers
  const topStore = useMemo(() => {
    if (storeStats.length === 0) return { name: 'Nenhuma', count: 0 };
    return storeStats[0];
  }, [storeStats]);

  const topCategory = useMemo(() => {
    if (categoryStats.length === 0) return { name: 'Nenhuma', count: 0 };
    return categoryStats[0];
  }, [categoryStats]);

  // Max totals for progress bars
  const maxProductClicks = useMemo(() => {
    if (productStats.length === 0) return 1;
    return Math.max(...productStats.map((p) => p.count), 1);
  }, [productStats]);

  const maxStoreClicks = useMemo(() => {
    if (storeStats.length === 0) return 1;
    return Math.max(...storeStats.map((s) => s.count), 1);
  }, [storeStats]);

  const maxCategoryClicks = useMemo(() => {
    if (categoryStats.length === 0) return 1;
    return Math.max(...categoryStats.map((c) => c.count), 1);
  }, [categoryStats]);

  // Helper to format date cleanly
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) + ' ' + d.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-3 text-center">
        <div className="w-8 h-8 border-4 border-[#8C6D62]/20 border-t-[#8C6D62] rounded-full animate-spin"></div>
        <p className="text-xs uppercase font-extrabold text-[#8A7A78] tracking-widest">Carregando estatísticas...</p>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6 max-w-6xl mx-auto w-full">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#E8E2D5]/60 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#4A3D3C] font-serif">
            Estatísticas de Redirecionamento
          </h1>
          <p className="text-xs text-[#8A7A78] mt-0.5">
            Monitore o engajamento geral, cliques em afiliados, desempenho de redes e origem de tráfego.
          </p>
        </div>

        <button
          onClick={loadAllStats}
          className="self-start sm:self-center px-4 py-2 border border-[#DFD7C7] hover:bg-[#F5F1E7] bg-[#FCFAF6] text-[#5C4D4C] text-xs font-bold rounded-xl transition-all shadow-sm active:scale-98 flex items-center gap-1.5 cursor-pointer"
        >
          <span>🔄</span> Atualizar Dados
        </button>
      </div>

      {/* KPI Cards Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Card 1: Total Clicks */}
        <div className="bg-gradient-to-br from-[#F5F2EB] to-[#FCFAF6] border border-[#E8E2D5] rounded-3xl p-5 shadow-sm relative overflow-hidden flex flex-col gap-2">
          <div className="absolute top-4 right-4 text-2xl">📈</div>
          <span className="text-[10px] tracking-widest font-extrabold text-[#8C6D62] uppercase">
            Total de Cliques
          </span>
          <h2 className="text-3xl font-black text-[#4A3D3C] mt-1 font-serif">
            {totalClicks.toLocaleString('pt-BR')}
          </h2>
          <p className="text-[10px] text-[#8A7A78] leading-tight mt-1">
            Cliques em ofertas de afiliados direcionados às lojas.
          </p>
        </div>

        {/* Card 2: Top Store */}
        <div className="bg-gradient-to-br from-[#F5F2EB] to-[#FCFAF6] border border-[#E8E2D5] rounded-3xl p-5 shadow-sm relative overflow-hidden flex flex-col gap-2">
          <div className="absolute top-4 right-4 text-2xl">🏪</div>
          <span className="text-[10px] tracking-widest font-extrabold text-[#8C6D62] uppercase">
            Loja Líder
          </span>
          <h2 className="text-3xl font-black text-[#4A3D3C] mt-1 font-serif truncate pr-6">
            {topStore.name}
          </h2>
          <p className="text-[10px] text-[#8A7A78] leading-tight mt-1">
            Rede com mais redirecionamentos: <span className="font-extrabold text-[#5C4D4C]">{topStore.count} cliques</span>.
          </p>
        </div>

        {/* Card 3: Top Category */}
        <div className="bg-gradient-to-br from-[#F5F2EB] to-[#FCFAF6] border border-[#E8E2D5] rounded-3xl p-5 shadow-sm relative overflow-hidden flex flex-col gap-2">
          <div className="absolute top-4 right-4 text-2xl">🏷️</div>
          <span className="text-[10px] tracking-widest font-extrabold text-[#8C6D62] uppercase">
            Categoria Mais Popular
          </span>
          <h2 className="text-3xl font-black text-[#4A3D3C] mt-1 font-serif truncate pr-6">
            {topCategory.name}
          </h2>
          <p className="text-[10px] text-[#8A7A78] leading-tight mt-1">
            Estilo preferido do público: <span className="font-extrabold text-[#5C4D4C]">{topCategory.count} cliques</span>.
          </p>
        </div>
      </div>

      {/* Main Aggregated Listings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left/Middle: Popularity of Products */}
        <div className="lg:col-span-2 bg-[#FCFAF6] border border-[#E8E2D5] rounded-[2rem] p-5 shadow-sm flex flex-col gap-4">
          <h3 className="font-extrabold text-[#4A3D3C] text-xs uppercase tracking-wider border-b border-[#E8E2D5]/60 pb-3 flex items-center gap-2">
            <span>🔥</span> Cliques por Curadoria Individual
          </h3>

          <div className="flex flex-col gap-4">
            {productStats.length === 0 ? (
              <p className="text-xs text-[#8A7A78] italic text-center py-6">Nenhum clique registrado.</p>
            ) : (
              productStats.slice(0, 7).map((p) => {
                const pct = Math.round((p.count / maxProductClicks) * 100);
                return (
                  <div key={p.product_id} className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-bold text-[#5C4D4C]">
                      <span className="truncate pr-4 font-extrabold text-[#4A3D3C]">{p.title}</span>
                      <span className="shrink-0 text-[#8C6D62] font-extrabold">{p.count} cliques</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-[#EAE4D8]/30 border border-[#E8E2D5]/50 h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#8C6D62] to-[#5C4033] h-full rounded-full transition-all duration-500 shadow-sm"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right side: Stores & Categories */}
        <div className="flex flex-col gap-6">
          {/* Section A: Stores clicks */}
          <div className="bg-[#FCFAF6] border border-[#E8E2D5] rounded-[2rem] p-5 shadow-sm flex flex-col gap-4">
            <h3 className="font-extrabold text-[#4A3D3C] text-xs uppercase tracking-wider border-b border-[#E8E2D5]/60 pb-3 flex items-center gap-2">
              <span>🏪</span> Popularidade por Rede
            </h3>

            <div className="flex flex-col gap-3.5">
              {storeStats.length === 0 ? (
                <p className="text-xs text-[#8A7A78] italic text-center py-4">Nenhum clique registrado.</p>
              ) : (
                storeStats.map((s) => {
                  const pct = Math.round((s.count / maxStoreClicks) * 100);
                  // Setup clean colors matching store styles
                  const barColor =
                    s.name.toLowerCase() === 'shopee'
                      ? 'bg-[#EE4D2D]'
                      : s.name.toLowerCase() === 'amazon'
                      ? 'bg-[#146B93]'
                      : 'bg-[#000000]';
                  return (
                    <div key={s.store_id} className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs font-bold text-[#5C4D4C]">
                        <span className="font-extrabold text-[#4A3D3C]">{s.name}</span>
                        <span className="text-[#8C6D62] font-extrabold">{s.count} cliques</span>
                      </div>
                      <div className="w-full bg-[#EAE4D8]/30 border border-[#E8E2D5]/50 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`${barColor} h-full rounded-full transition-all duration-500 shadow-sm`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Section B: Categories clicks */}
          <div className="bg-[#FCFAF6] border border-[#E8E2D5] rounded-[2rem] p-5 shadow-sm flex flex-col gap-4">
            <h3 className="font-extrabold text-[#4A3D3C] text-xs uppercase tracking-wider border-b border-[#E8E2D5]/60 pb-3 flex items-center gap-2">
              <span>🏷️</span> Cliques por Categoria
            </h3>

            <div className="flex flex-col gap-3.5">
              {categoryStats.length === 0 ? (
                <p className="text-xs text-[#8A7A78] italic text-center py-4">Nenhum clique registrado.</p>
              ) : (
                categoryStats.slice(0, 5).map((c) => {
                  const pct = Math.round((c.count / maxCategoryClicks) * 100);
                  return (
                    <div key={c.category_id} className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs font-bold text-[#5C4D4C]">
                        <span className="font-extrabold text-[#4A3D3C]">{c.name}</span>
                        <span className="text-[#8C6D62] font-extrabold">{c.count} cliques</span>
                      </div>
                      <div className="w-full bg-[#EAE4D8]/30 border border-[#E8E2D5]/50 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#4A3D3C] h-full rounded-full transition-all duration-500 shadow-sm"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Activity logs Table */}
      <div className="bg-[#FCFAF6] border border-[#E8E2D5] rounded-[2rem] p-5 shadow-sm flex flex-col gap-4 overflow-hidden">
        <h3 className="font-extrabold text-[#4A3D3C] text-xs uppercase tracking-wider border-b border-[#E8E2D5]/60 pb-3 flex items-center gap-2">
          <span>📋</span> Registro de Cliques Recentes
        </h3>

        <div className="overflow-x-auto rounded-2xl border border-[#E8E2D5]/60">
          <table className="w-full text-left border-collapse bg-[#FCFAF6] text-xs">
            <thead>
              <tr className="bg-[#F5F2EB] text-[#5C4D4C] font-extrabold border-b border-[#E8E2D5] tracking-wider uppercase text-[9px]">
                <th className="px-4 py-3.5">Data/Hora</th>
                <th className="px-4 py-3.5">Produto</th>
                <th className="px-4 py-3.5">Loja</th>
                <th className="px-4 py-3.5">Categoria</th>
                <th className="px-4 py-3.5">Origem (UTM)</th>
                <th className="px-4 py-3.5">Origem (Ref)</th>
                <th className="px-4 py-3.5">Dispositivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E2D5]/40 text-[#4A3D3C] font-medium">
              {recentLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#8A7A78] italic">
                    Nenhum clique registrado recentemente.
                  </td>
                </tr>
              ) : (
                recentLogs.map((log) => {
                  // Badges matching our beige palette
                  const sourceStyle =
                    log.source === 'link_bio'
                      ? 'bg-[#E3EFE5] text-[#2E6B38] border-[#CDDFC1]'
                      : log.source === 'stories'
                      ? 'bg-[#FFF2D6] text-[#A66C02] border-[#FFE2A4]'
                      : 'bg-[#F2E5E2] text-[#9A4C3A] border-[#E8D4D0]';

                  return (
                    <tr key={log.id} className="hover:bg-[#FDFBF7]/40 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-[#8A7A78] font-bold text-[11px]">
                        {formatDate(log.clicked_at || '')}
                      </td>
                      <td className="px-4 py-3 font-extrabold max-w-[200px] truncate" title={log.product_title}>
                        {log.product_title}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase border ${
                          log.store_slug === 'shopee'
                            ? 'bg-[#EE4D2D]/10 text-[#EE4D2D] border-[#EE4D2D]/20'
                            : log.store_slug === 'amazon'
                            ? 'bg-[#146B93]/10 text-[#146B93] border-[#146B93]/20'
                            : 'bg-black/5 text-black border-black/10'
                        }`}>
                          {log.store_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#5C4D4C] text-[11px] font-bold">
                        {log.category_name}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${sourceStyle}`}>
                          {log.source || 'link_bio'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[#8A7A78] text-[11px]">
                        {log.referrer || 'Direto'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[#8A7A78] font-bold text-[11px]">
                        {log.device || 'Desconhecido'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
