'use client';

import React from 'react';

interface HeaderProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export default function Header({ searchTerm, setSearchTerm }: HeaderProps) {
  return (
    <header className="w-full bg-[#FBF8F3] pt-6 pb-4 px-4 md:px-8 flex flex-col items-center gap-4">
      {/* Brand Logo - Centered like reference */}
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#3E3230] font-serif">
          Achadinhos<span className="text-[#D4A574]">✦</span>
        </h1>
        <p className="text-[11px] md:text-xs text-[#9A8C85] tracking-wide">
          Moda, beleza, acessórios e perfumes em um só lugar
        </p>
      </div>

      {/* Search Input Box - Wide and centered like reference */}
      <div className="relative w-full max-w-2xl">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg
            className="h-4 w-4 text-[#9A8C85]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nome"
          className="block w-full pl-11 pr-4 py-3 border border-[#E0D6C8] rounded-full bg-white text-[#3E3230] placeholder-[#B5A99E] text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A574]/40 focus:border-[#D4A574] transition-all"
        />
      </div>
    </header>
  );
}
