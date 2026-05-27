'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getProducts, getClickStats } from '../../lib/supabase/dataManager';
import { isSupabaseConfigured } from '../../lib/supabase/authHelper';
import { ClickLog, ProductWithDetails } from '../../types';

export default function AdminDashboardPage() {
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [clicks, setClicks] = useState<ClickLog[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseActive = isSupabaseConfigured();

  useEffect(() => {
    let isMounted = true;
    const loadDashboardData = async () => {
      try {
        const prods = await getProducts();
        if (!isMounted) return;
        setProducts(prods);
        const stats = await getClickStats();
        if (!isMounted) return;
        setClicks(stats);
      } catch (err) {
        console.error('Failed to load dashboard statistics', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute key KPIs
  const totalProducts = products.length;
  const activeProductsCount = products.filter((p) => p.is_active).length;

  const clickCountsByProduct = useMemo(() => {
    const counts: Record<string, number> = {};
    clicks.forEach((click) => {
      if (click.product_id) {
        counts[click.product_id] = (counts[click.product_id] || 0) + 1;
      }
    });
    return counts;
  }, [clicks]);
  
  const totalClicks = useMemo(() => {
    return clicks.length;
  }, [clicks]);

  // Find the top clicked product
  const topProduct = useMemo(() => {
    if (clicks.length === 0 || products.length === 0) return null;
    const sorted = [...products].sort((a, b) => {
      return (clickCountsByProduct[b.id] || 0) - (clickCountsByProduct[a.id] || 0);
    });
    return sorted[0] || null;
  }, [clickCountsByProduct, clicks.length, products]);

  const topProductClicks = useMemo(() => {
    if (!topProduct) return 0;
    return clickCountsByProduct[topProduct.id] || 0;
  }, [clickCountsByProduct, topProduct]);

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-3 text-center">
        <div className="w-8 h-8 border-4 border-[#8C6D62]/20 border-t-[#8C6D62] rounded-full animate-spin"></div>
        <p className="text-xs uppercase font-extrabold text-[#8A7A78] tracking-widest">Carregando painel...</p>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#4A3D3C] font-serif">
            Visão Geral do Cocurador
          </h1>
          <p className="text-xs text-[#8A7A78] mt-0.5">
            Gerencie o catálogo, acompanhe redirecionamentos e configure novas ofertas.
          </p>
        </div>

        {/* Quick action button */}
        <Link
          href="/admin/produtos/novo"
          className="bg-[#5C4033] hover:bg-[#4A3227] text-[#FCFAF6] text-xs font-bold px-4 py-3 rounded-xl shadow-sm uppercase tracking-wider text-center shrink-0"
        >
          ➕ Adicionar Achadinho
        </Link>
      </div>

      {/* Warning simulation banner inside page */}
      {!supabaseActive && (
        <div className="bg-[#FFF2D6]/80 border border-[#FFE2A4] rounded-2xl p-4 text-xs text-[#A66C02] leading-relaxed shadow-sm">
          💡 <strong>Modo de Curação Simulado:</strong> Seus dados de teste estão sendo armazenados localmente no navegador (<code>localStorage</code>). Qualquer novo produto ou loja inserida neste painel estará imediatamente ativa e visível na vitrine pública do site!
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Total Products */}
        <div className="bg-[#FCFAF6] border border-[#E8E2D5] rounded-[2rem] p-5 shadow-sm flex flex-col gap-2 relative overflow-hidden">
          <span className="text-[10px] uppercase font-extrabold text-[#8A7A78] tracking-wider">📦 Total de Produtos</span>
          <span className="text-3xl font-black text-[#4A3D3C] tracking-tight">{totalProducts}</span>
          <span className="text-[10px] text-[#A0908E] font-medium mt-1">Produtos cadastrados</span>
          <div className="absolute right-4 bottom-4 text-2xl opacity-15">📦</div>
        </div>

        {/* Card 2: Active Products */}
        <div className="bg-[#FCFAF6] border border-[#E8E2D5] rounded-[2rem] p-5 shadow-sm flex flex-col gap-2 relative overflow-hidden">
          <span className="text-[10px] uppercase font-extrabold text-[#8A7A78] tracking-wider">🟢 Produtos Ativos</span>
          <span className="text-3xl font-black text-emerald-700 tracking-tight">{activeProductsCount}</span>
          <span className="text-[10px] text-emerald-600 font-bold mt-1">
            {totalProducts > 0 ? `${Math.round((activeProductsCount / totalProducts) * 100)}% do catálogo` : '0%'}
          </span>
          <div className="absolute right-4 bottom-4 text-2xl opacity-15">🟢</div>
        </div>

        {/* Card 3: Total Clicks */}
        <div className="bg-[#FCFAF6] border border-[#E8E2D5] rounded-[2rem] p-5 shadow-sm flex flex-col gap-2 relative overflow-hidden">
          <span className="text-[10px] uppercase font-extrabold text-[#8A7A78] tracking-wider">🔗 Cliques em Ofertas</span>
          <span className="text-3xl font-black text-[#8C6D62] tracking-tight">{totalClicks}</span>
          <span className="text-[10px] text-[#A0908E] font-medium mt-1">Redirecionamentos afiliados</span>
          <div className="absolute right-4 bottom-4 text-2xl opacity-15">🔗</div>
        </div>

        {/* Card 4: Top Performer */}
        <div className="bg-[#FCFAF6] border border-[#E8E2D5] rounded-[2rem] p-5 shadow-sm flex flex-col gap-2 relative overflow-hidden min-w-0">
          <span className="text-[10px] uppercase font-extrabold text-[#8A7A78] tracking-wider truncate">🏆 Produto Estrela</span>
          <span className="text-base font-extrabold text-[#4A3D3C] truncate leading-tight mt-1">
            {topProduct ? topProduct.title : 'Sem cliques ainda'}
          </span>
          <span className="text-xs text-[#8C6D62] font-black mt-auto">
            {topProduct ? `${topProductClicks} cliques` : '0 cliques'}
          </span>
          <div className="absolute right-4 bottom-4 text-2xl opacity-15">🏆</div>
        </div>

      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Recent uploads */}
        <div className="lg:col-span-2 bg-[#FCFAF6] border border-[#E8E2D5] rounded-[2rem] p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E8E2D5]/60 pb-3">
            <h3 className="font-extrabold text-[#4A3D3C] text-sm uppercase tracking-wider flex items-center gap-2">
              <span>📝</span> Últimos Cadastrados
            </h3>
            <Link href="/admin/produtos" className="text-xs font-bold text-[#8C6D62] hover:underline">
              Ver todos →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8E2D5]/40 text-[#8A7A78]">
                  <th className="py-2.5 font-bold uppercase tracking-wider">Produto</th>
                  <th className="py-2.5 font-bold uppercase tracking-wider">Categoria</th>
                  <th className="py-2.5 font-bold uppercase tracking-wider text-center">Status</th>
                  <th className="py-2.5 font-bold uppercase tracking-wider text-center">Destaque</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E2D5]/30">
                {products.slice(0, 5).map((p) => (
                  <tr key={p.id} className="text-[#5C4D4C]">
                    <td className="py-3 font-extrabold text-[#4A3D3C] max-w-[180px] truncate">
                      {p.title}
                    </td>
                    <td className="py-3 text-[#8A7A78]">{p.category?.name || 'Sem cat'}</td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        p.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {p.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="text-xs">{p.is_featured ? '✨' : '✖️'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Fast stats widgets */}
        <div className="bg-[#FCFAF6] border border-[#E8E2D5] rounded-[2rem] p-5 flex flex-col gap-4 shadow-sm">
          <h3 className="font-extrabold text-[#4A3D3C] text-sm uppercase tracking-wider flex items-center gap-2 border-b border-[#E8E2D5]/60 pb-3">
            <span>🚀</span> Dicas de Sucesso
          </h3>
          <div className="flex flex-col gap-3.5 text-xs text-[#5C4D4C] leading-relaxed">
            <div className="bg-[#FCFAF6] border-l-4 border-[#8C6D62] pl-3 py-1">
              <span className="font-bold text-[#4A3D3C] block mb-0.5">1. Preço Shopee Sincronizado</span>
              Para que um produto da Shopee exiba o preço dinâmico, certifique-se de preencher a oferta com o <strong>preço numérico</strong> e marque o modo de preço como <strong>preco_sincronizado</strong>.
            </div>
            <div className="bg-[#FCFAF6] border-l-4 border-[#8C6D62] pl-3 py-1">
              <span className="font-bold text-[#4A3D3C] block mb-0.5">2. Banners Limpos</span>
              Como indicado no nosso guia de design, não inclua rostos ou pessoas nos banners. Destaque fotos limpas dos produtos com tons bege neutros.
            </div>
            <div className="bg-[#FCFAF6] border-l-4 border-[#8C6D62] pl-3 py-1">
              <span className="font-bold text-[#4A3D3C] block mb-0.5">3. Relação de Lojas</span>
              Uma loja (ex: AliExpress) só aparecerá nos cards da vitrine pública se existir pelo menos uma <strong>oferta ativa</strong> vinculada àquela loja naquele produto.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
