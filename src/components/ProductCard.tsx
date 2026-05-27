'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ProductWithDetails } from '../types';
import { getOfferDisplayPrice } from '../lib/services/shopeeSync';

interface ProductCardProps {
  product: ProductWithDetails;
}

const newProductCutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000;

export default function ProductCard({ product }: ProductCardProps) {
  const activeOffers = product.offers.filter((o) => {
    const isModeActive = o.is_active;
    const mode = (o.price_mode || '').toLowerCase();
    const isAvailable = mode !== 'unavailable' && mode !== 'preco_indisponivel';
    return isModeActive && isAvailable;
  });
  const [selectedOfferIndex, setSelectedOfferIndex] = useState(0);

  const currentOffer = activeOffers[selectedOfferIndex] || activeOffers[0];
  const mainImage = product.images.find((img) => img.is_main) || product.images[0];

  // Tag badge styles matching the reference image exactly
  const getTagStyles = (slug: string) => {
    switch (slug) {
      case 'achado-barato':
        return 'bg-[#E8F0E3] text-[#3D7A47]';
      case 'favorito':
        return 'bg-[#FCEEE3] text-[#C47A30]';
      case 'similar-ao-look':
        return 'bg-[#F0E5E2] text-[#9A4C3A]';
      case 'novo':
        return 'bg-[#FCE8E8] text-[#C44040]';
      default:
        return 'bg-[#EAE4D8] text-[#5C4D4C]';
    }
  };

  // Render store button text — clean and simple like reference
  const renderStoreButton = (storeSlug: string, isSelected: boolean) => {
    const storeColors: Record<string, { active: string; inactive: string }> = {
      shopee: {
        active: 'bg-[#EE4D2D] text-white border-[#EE4D2D]',
        inactive: 'bg-white text-[#3E3230] border-[#D9D0C3] hover:border-[#EE4D2D]/50',
      },
      amazon: {
        active: 'bg-[#146B93] text-white border-[#146B93]',
        inactive: 'bg-white text-[#3E3230] border-[#D9D0C3] hover:border-[#146B93]/50',
      },
      shein: {
        active: 'bg-[#222222] text-white border-[#222222]',
        inactive: 'bg-white text-[#3E3230] border-[#D9D0C3] hover:border-[#222]/50',
      },
    };

    const colors = storeColors[storeSlug] || {
      active: 'bg-[#3E3230] text-white border-[#3E3230]',
      inactive: 'bg-white text-[#3E3230] border-[#D9D0C3]',
    };

    const storeName = storeSlug === 'shein' ? 'SHEIN' : storeSlug.charAt(0).toUpperCase() + storeSlug.slice(1);

    return (
      <span
        className={`inline-block px-3 py-1 rounded-lg text-[11px] font-bold border transition-all duration-150 ${
          isSelected ? colors.active : colors.inactive
        }`}
      >
        {storeName}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-[#E8E0D4] shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col h-full">
      {/* Product Image */}
      <Link href={`/produto/${product.slug}`} className="block overflow-hidden">
        <div className="relative aspect-square overflow-hidden bg-[#F5F0E8] flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mainImage ? mainImage.image_url : '/images/placeholder.jpg'}
            alt={product.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 ease-out"
          />

          {/* Tag badge overlay — small and discrete like reference */}
          {product.tags.length > 0 && (
            <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
              {product.tags.slice(0, 1).map((tag) => (
                <span
                  key={tag.id}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${getTagStyles(tag.slug)}`}
                >
                  {tag.slug === 'favorito' ? '❤️ Favorito' : tag.slug === 'achado-barato' ? 'Achado barato' : tag.name}
                </span>
              ))}
            </div>
          )}

          {/* "Novo" badge on right side like reference */}
          {product.created_at && new Date(product.created_at).getTime() > newProductCutoffTime && (
            <div className="absolute top-2.5 right-2.5">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FCE8E8] text-[#C44040]">
                ❤️ Novo
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Card Content */}
      <div className="px-3 pt-3 pb-3 flex flex-col flex-grow gap-2">
        {/* Product Title */}
        <Link href={`/produto/${product.slug}`} className="block">
          <h3 className="font-bold text-[#3E3230] text-sm leading-tight line-clamp-1 hover:text-[#8B6F5E] transition-colors">
            {product.title}
          </h3>
        </Link>

        {/* Store Selection */}
        {activeOffers.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-[#9A8C85] font-medium">
              Escolha a loja:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {activeOffers.map((offer, idx) => {
                const isSelected = selectedOfferIndex === idx;
                const hasMultiple = activeOffers.length > 1;
                return hasMultiple ? (
                  <button
                    key={offer.id}
                    onClick={() => setSelectedOfferIndex(idx)}
                    className="cursor-pointer focus:outline-none"
                  >
                    {renderStoreButton(offer.store.slug, isSelected)}
                  </button>
                ) : (
                  <div key={offer.id} className="cursor-default">
                    {renderStoreButton(offer.store.slug, true)}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Price + CTA */}
        <div className="mt-auto pt-2 flex flex-col gap-2">
          {currentOffer ? (
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-bold text-[#3E3230] leading-snug">
                {currentOffer.store.name} · {getOfferDisplayPrice(currentOffer, currentOffer.store)}
              </span>

              {currentOffer.store.slug.toLowerCase() === 'shopee' && currentOffer.sync_enabled && (
                <span className="text-[10px] text-[#9A8C85] font-medium">
                  Atualizado recentemente
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm font-bold text-red-500">Oferta indisponível</span>
          )}

          {/* CTA Button - Brown like reference */}
          {currentOffer ? (
            <a
              href={`/go/${product.slug}?store=${currentOffer.store.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center block bg-[#5C4033] hover:bg-[#4A3227] text-white font-bold text-[11px] py-2.5 rounded-xl transition-all duration-200 tracking-wide"
            >
              Ver produto
            </a>
          ) : (
            <button
              disabled
              className="w-full bg-[#F0EBE3] text-[#9A8C85] font-bold text-[11px] py-2.5 rounded-xl cursor-not-allowed"
            >
              Indisponível
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
