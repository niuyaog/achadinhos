'use client';

import React from 'react';
import { Category } from '../types';

interface CategoryTabsProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (slug: string) => void;
}

// Map category slugs to matching emoji icons like the reference image
const categoryIcons: Record<string, string> = {
  'novidades': '✨',
  'mais-clicados': '🔥',
  'blusas': '👚',
  'calcas': '👖',
  'vestidos': '👗',
  'tenis': '👟',
  'acessorios': '👜',
  'beleza': '💄',
  'perfumes': '🌸',
};

export default function CategoryTabs({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryTabsProps) {
  const allTabs = [
    { name: 'Novidades', slug: 'novidades' },
    { name: 'Mais clicados', slug: 'mais-clicados' },
    ...categories.map((c) => ({ name: c.name, slug: c.slug })),
  ];

  return (
    <div className="w-full bg-[#FBF8F3] py-2 border-b border-[#E8E0D4]/60">
      <div className="flex overflow-x-auto gap-2 px-4 md:px-8 pb-2 scrollbar-none snap-x snap-mandatory md:justify-center">
        {allTabs.map((tab) => {
          const isActive = selectedCategory === tab.slug;
          const icon = categoryIcons[tab.slug] || '📦';
          return (
            <button
              key={tab.slug}
              onClick={() => onSelectCategory(tab.slug)}
              className={`snap-start shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full transition-all duration-200 border whitespace-nowrap ${
                isActive
                  ? 'bg-[#3E3230] text-white border-[#3E3230] shadow-sm'
                  : 'bg-white text-[#5C4D4C] border-[#E0D6C8] hover:bg-[#F5F0E8] hover:border-[#C8BBA8]'
              }`}
            >
              <span className="text-sm">{icon}</span>
              {tab.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
