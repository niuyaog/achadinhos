'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getProducts, deleteProduct, getCategories } from '../../../lib/supabase/dataManager';
import { ProductWithDetails, Category } from '../../../types';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchProductsList = async () => {
    try {
      const prods = await getProducts();
      setProducts(prods);
      const cats = await getCategories();
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load products list', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(fetchProductsList);
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Tem certeza que deseja excluir o produto "${title}"? Esta ação não pode ser desfeita.`)) {
      setLoading(true);
      try {
        const success = await deleteProduct(id);
        if (success) {
          await fetchProductsList();
        } else {
          alert('Falha ao excluir o produto.');
        }
      } catch {
        alert('Ocorreu um erro ao excluir.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Filter products locally for search/tabs
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading && products.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-3 text-center">
        <div className="w-8 h-8 border-4 border-[#8C6D62]/20 border-t-[#8C6D62] rounded-full animate-spin"></div>
        <p className="text-xs uppercase font-extrabold text-[#8A7A78] tracking-widest">Carregando catálogo...</p>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E2D5]/60 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#4A3D3C] font-serif">
            Catálogo de Achadinhos
          </h1>
          <p className="text-xs text-[#8A7A78] mt-0.5">
            Gerencie itens ativos, galerias e ofertas individuais de afiliados.
          </p>
        </div>

        <Link
          href="/admin/produtos/novo"
          className="bg-[#5C4033] hover:bg-[#4A3227] text-[#FCFAF6] text-xs font-bold px-4 py-3.5 rounded-xl shadow-sm uppercase tracking-wider text-center shrink-0"
        >
          ➕ Adicionar Novo Produto
        </Link>
      </div>

      {/* Search & Filtering panel */}
      <div className="bg-[#FCFAF6] border border-[#E8E2D5] rounded-[1.5rem] p-4 flex flex-col sm:flex-row gap-4 items-center shadow-sm">
        {/* Search */}
        <div className="relative w-full sm:flex-grow">
          <input
            type="text"
            placeholder="Filtrar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full px-4 py-2 border border-[#DFD7C7] rounded-xl bg-white text-[#4A3D3C] text-xs focus:outline-none focus:ring-1 focus:ring-[#8C6D62]"
          />
        </div>

        {/* Category selector */}
        <div className="w-full sm:w-48 shrink-0">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="block w-full px-4 py-2 border border-[#DFD7C7] rounded-xl bg-white text-[#4A3D3C] text-xs focus:outline-none focus:ring-1 focus:ring-[#8C6D62] cursor-pointer"
          >
            <option value="all">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid listing */}
      <div className="bg-[#FCFAF6] border border-[#E8E2D5] rounded-[2rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-[#E8E2D5]/60 text-[#8A7A78] bg-[#FDFBF7]/50 font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Imagem</th>
                <th className="py-4 px-4">Nome do Produto</th>
                <th className="py-4 px-4">Categoria</th>
                <th className="py-4 px-4 text-center">Lojas</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-4 text-center">Destaque</th>
                <th className="py-4 px-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E2D5]/30">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-[#8A7A78]">
                    Nenhum produto cadastrado corresponde aos critérios selecionados.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const mainImg = p.images.find((img) => img.is_main) || p.images[0];
                  return (
                    <tr key={p.id} className="hover:bg-[#FDFBF7]/30 transition-colors text-[#5C4D4C]">
                      {/* Image */}
                      <td className="py-3.5 px-6">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#F5F2EB] border border-[#E8E2D5]/60 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={mainImg ? mainImg.image_url : '/images/placeholder.jpg'}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </td>
                      
                      {/* Title */}
                      <td className="py-3.5 px-4 font-extrabold text-[#4A3D3C] max-w-[200px] truncate">
                        {p.title}
                        {p.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {p.tags.map((tag) => (
                              <span key={tag.id} className="text-[8px] font-bold bg-[#EAE4D8]/50 text-[#8A7A78] px-1.5 py-0.2 rounded border border-[#DFD7C7]/55">
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 text-[#8A7A78]">{p.category?.name || 'Sem cat'}</td>

                      {/* Store list */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {p.offers.map((offer) => (
                            <span
                              key={offer.id}
                              title={offer.store.name}
                              className="w-5 h-5 rounded-full bg-[#EAE4D8] border border-[#DFD7C7] flex items-center justify-center text-[9px] font-extrabold text-[#5C4D4C] uppercase"
                            >
                              {offer.store.name[0]}
                            </span>
                          ))}
                          {p.offers.length === 0 && <span className="text-[#A0908E]">Nenhuma</span>}
                        </div>
                      </td>

                      {/* Active Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                          p.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {p.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>

                      {/* Featured */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-sm">{p.is_featured ? '✨ Destaque' : '✖️'}</span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-6 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <Link
                            href={`/admin/produtos/${p.id}`}
                            className="bg-[#EAE4D8] hover:bg-[#DFD7C7] text-[#4A3D3C] text-[10px] font-bold px-3 py-1.5 rounded-lg border border-[#DFD7C7] shadow-sm transition-all"
                          >
                            ✏️ Editar
                          </Link>
                          
                          <button
                            onClick={() => handleDelete(p.id, p.title)}
                            className="bg-[#F2E5E2] hover:bg-[#E8D4D0] text-[#9A4C3A] text-[10px] font-bold px-3 py-1.5 rounded-lg border border-[#E8D4D0] shadow-sm transition-all cursor-pointer"
                          >
                            🗑️ Excluir
                          </button>
                        </div>
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
