'use client';

import React from 'react';
import { ProductWithDetails } from '../types';
import ProductCard from './ProductCard';

interface ProductSectionProps {
  title: string;
  subtitle?: string;
  products: ProductWithDetails[];
}

export default function ProductSection({ title, products }: ProductSectionProps) {
  if (products.length === 0) {
    return (
      <div className="py-12 px-4 text-center bg-white rounded-2xl border border-[#E8E0D4] flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 text-[#9A8C85] rounded-full bg-[#F5F0E8] flex items-center justify-center text-xl">
          🔍
        </div>
        <h4 className="text-base font-bold text-[#3E3230]">
          Nenhum achadinho encontrado
        </h4>
        <p className="text-xs text-[#9A8C85] max-w-xs leading-relaxed">
          Tente alterar o termo da busca ou selecione outra categoria para ver outros produtos.
        </p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      {/* Section Header - matching reference with emoji and "Ver todos" */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-bold text-[#3E3230]">
          {title}
        </h2>
        <button className="text-xs text-[#9A8C85] hover:text-[#8B6F5E] font-medium flex items-center gap-1 transition-colors shrink-0">
          Ver todos
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Grid of Cards - responsive: 1→2→3→4→6 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
        {products.map((product) => (
          <div key={product.id} className="w-full">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
