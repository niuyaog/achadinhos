'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Header from '../components/Header';
import CategoryTabs from '../components/CategoryTabs';
import ProductSection from '../components/ProductSection';
import { getProducts, getCategories, getClickStats } from '../lib/supabase/dataManager';
import { mockProducts, mockCategories } from '../data/mockData';
import { ProductWithDetails, Category, ClickLog } from '../types';
import { isSimulationMode } from '../lib/supabase/config';

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('novidades');
  const [products, setProducts] = useState<ProductWithDetails[]>(() => (isSimulationMode() ? mockProducts : []));
  const [categories, setCategories] = useState<Category[]>(() => (isSimulationMode() ? mockCategories : []));
  const [clicks, setClicks] = useState<ClickLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDynamicData = async () => {
      try {
        const prods = await getProducts();
        setProducts(prods);
        const cats = await getCategories();
        setCategories(cats);
        const clickStats = await getClickStats();
        setClicks(clickStats);
      } catch (err) {
        console.error('Failed to load product data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDynamicData();
  }, []);

  const activeProducts = useMemo(() => {
    return products.filter((p) => p.is_active);
  }, [products]);

  const filteredProducts = useMemo(() => {
      const list = [...activeProducts];

    if (searchTerm.trim() !== '') {
      const query = searchTerm.toLowerCase();
      return list.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query))
      );
    }

    if (selectedCategory !== 'novidades' && selectedCategory !== 'mais-clicados') {
      return list.filter((p) => p.category?.slug === selectedCategory);
    }

    return list;
  }, [activeProducts, searchTerm, selectedCategory]);

  // Novidades — sorted by date
  const newArrivals = useMemo(() => {
    return [...activeProducts].sort(
      (a, b) =>
        new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
    );
  }, [activeProducts]);

  // Mais clicados — sorted by click count
  const mostClicked = useMemo(() => {
    const counts: Record<string, number> = {};
    clicks.forEach((c) => {
      if (c.product_id) {
        counts[c.product_id] = (counts[c.product_id] || 0) + 1;
      }
    });

    return [...activeProducts].sort((a, b) => {
      const clicksA = counts[a.id] || 0;
      const clicksB = counts[b.id] || 0;
      return clicksB - clicksA;
    });
  }, [activeProducts, clicks]);

  // Destaques
  const featuredProducts = useMemo(() => {
    return activeProducts.filter((p) => p.is_featured);
  }, [activeProducts]);

  const isDefaultHomeView = searchTerm.trim() === '' && selectedCategory === 'novidades';

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <Header searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

      {/* Category Tabs */}
      <CategoryTabs
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={(slug) => {
          setSelectedCategory(slug);
          setSearchTerm('');
        }}
      />

      {/* Main Content */}
      <main className="flex-grow px-4 md:px-8 py-6 flex flex-col gap-10">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-8 h-8 border-3 border-[#D4A574]/30 border-t-[#D4A574] rounded-full animate-spin"></div>
            <p className="text-[11px] font-bold uppercase text-[#9A8C85] tracking-widest">Carregando achadinhos...</p>
          </div>
        ) : isDefaultHomeView ? (
          <div className="flex flex-col gap-10">
            {/* 1. Novidades */}
            <ProductSection
              title="✨ Novidades"
              products={newArrivals.slice(0, 6)}
            />

            {/* 2. Mais clicados */}
            <ProductSection
              title="🔥 Mais clicados"
              products={mostClicked.slice(0, 6)}
            />

            {/* 3. Produtos em destaque */}
            {featuredProducts.length > 0 && (
              <ProductSection
                title="⭐ Produtos em destaque"
                products={featuredProducts}
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <ProductSection
              title={
                searchTerm.trim() !== ''
                  ? `Busca: "${searchTerm}"`
                  : selectedCategory === 'mais-clicados'
                  ? '🔥 Todos os Mais Clicados'
                  : `${categories.find((c) => c.slug === selectedCategory)?.name || 'Coleção'}`
              }
              products={
                selectedCategory === 'mais-clicados' && searchTerm.trim() === ''
                  ? mostClicked
                  : filteredProducts
              }
            />
          </div>
        )}
      </main>

      {/* Footer — clean and minimal */}
      <footer className="py-5 border-t border-[#E8E0D4]/50 text-center text-[11px] text-[#9A8C85] mt-auto flex flex-col gap-0.5">
        <p>© 2026 Achadinhos. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
