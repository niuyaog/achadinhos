'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getProducts, logProductClick } from '../../../lib/supabase/dataManager';
import { ProductWithDetails } from '../../../types';
import ProductCard from '../../../components/ProductCard';
import { getOfferDisplayPrice } from '../../../lib/services/shopeeSync';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const router = useRouter();

  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [product, setProduct] = useState<ProductWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProductDetails = async () => {
      try {
        const prods = await getProducts();
        setProducts(prods);
        const found = prods.find((p) => p.slug === slug && p.is_active);
        setProduct(found || null);

        if (found) {
          logProductClick(found.id);
        }
      } catch (err) {
        console.error('Failed to load product details', err);
      } finally {
        setLoading(false);
      }
    };
    loadProductDetails();
  }, [slug]);

  const activeOffers = useMemo(() => {
    if (!product) return [];
    return product.offers.filter((o) => {
      const isModeActive = o.is_active;
      const mode = (o.price_mode || '').toLowerCase();
      const isAvailable = mode !== 'unavailable' && mode !== 'preco_indisponivel';
      return isModeActive && isAvailable;
    });
  }, [product]);

  const [selectedOfferIndex, setSelectedOfferIndex] = useState(0);
  const currentOffer = activeOffers[selectedOfferIndex] || activeOffers[0];

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const currentImage = product?.images[activeImageIndex] || product?.images[0];

  const similarProducts = useMemo(() => {
    if (!product) return [];
    return products
      .filter((p) => p.category_id === product.category_id && p.id !== product.id && p.is_active)
      .slice(0, 4);
  }, [product, products]);

  // Store button renderer
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
        className={`inline-block px-4 py-2 rounded-lg text-xs font-bold border transition-all duration-150 ${
          isSelected ? colors.active : colors.inactive
        }`}
      >
        {storeName}
      </span>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF8F3] flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-10 h-10 border-3 border-[#D4A574]/30 border-t-[#D4A574] rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-[#9A8C85] tracking-widest uppercase">
          Carregando detalhes do produto...
        </p>
      </div>
    );
  }

  // Not found
  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center gap-4 bg-[#FBF8F3]">
        <div className="w-16 h-16 rounded-full bg-[#F5F0E8] flex items-center justify-center text-2xl">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-[#3E3230]">
          Achadinho não encontrado
        </h2>
        <p className="text-sm text-[#9A8C85] max-w-xs leading-relaxed">
          Este produto pode ter sido desativado ou o link está incorreto.
        </p>
        <Link
          href="/"
          className="px-6 py-2.5 bg-[#5C4033] text-white font-bold text-xs rounded-xl uppercase tracking-wide hover:bg-[#4A3227] transition-all"
        >
          Voltar para o início
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Back navigation header */}
      <header className="sticky top-0 z-50 w-full border-b border-[#E8E0D4]/60 bg-[#FBF8F3]/90 backdrop-blur-md px-4 md:px-8 py-3 flex items-center justify-between">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#5C4D4C] hover:text-[#8B6F5E] transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </button>
        <Link href="/" className="text-lg font-bold text-[#3E3230] font-serif">
          Achadinhos<span className="text-[#D4A574]">✦</span>
        </Link>
        <div className="w-16"></div>
      </header>

      {/* Main Product Content */}
      <main className="flex-grow px-4 md:px-8 py-6">
        {/* Desktop: Gallery left, Info right */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">

          {/* Gallery */}
          <div className="flex flex-col gap-3">
            <div className="relative aspect-square overflow-hidden bg-[#F5F0E8] rounded-2xl border border-[#E8E0D4]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentImage ? currentImage.image_url : '/images/placeholder.jpg'}
                alt={product.title}
                className="w-full h-full object-cover transition-transform duration-300"
              />

              {product.images.length > 1 && (
                <span className="absolute bottom-3 right-3 bg-[#3E3230]/70 text-white text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-sm">
                  {activeImageIndex + 1} / {product.images.length}
                </span>
              )}
            </div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {product.images.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative aspect-square w-16 h-16 rounded-lg overflow-hidden border shrink-0 transition-all ${
                      activeImageIndex === idx
                        ? 'border-[#8B6F5E] ring-2 ring-[#8B6F5E]/20'
                        : 'border-[#E8E0D4] hover:border-[#8B6F5E]/50'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col gap-4 bg-white border border-[#E8E0D4] rounded-2xl p-6">
            {/* Tags */}
            {product.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {product.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#F5F0E8] text-[#8B6F5E]"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}

            {/* Title & Category */}
            <div>
              <h1 className="text-2xl font-bold text-[#3E3230] leading-tight">
                {product.title}
              </h1>
              {product.category && (
                <span className="text-[11px] font-semibold text-[#9A8C85] mt-1 inline-block">
                  {product.category.name}
                </span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-sm text-[#7A6E68] leading-relaxed border-t border-[#E8E0D4]/60 pt-3">
                {product.description}
              </p>
            )}

            {/* Store Selection */}
            {activeOffers.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-[#E8E0D4]/60 pt-4">
                <span className="text-[11px] text-[#9A8C85] font-medium">
                  Escolha a loja:
                </span>
                <div className="flex flex-wrap gap-2">
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

            {/* Price & CTA */}
            <div className="border-t border-[#E8E0D4]/60 pt-4 flex flex-col gap-3 mt-auto">
              {currentOffer ? (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xl font-bold text-[#3E3230] leading-snug">
                    {currentOffer.store.name} · {getOfferDisplayPrice(currentOffer, currentOffer.store)}
                  </span>

                  {currentOffer.store.slug.toLowerCase() === 'shopee' && currentOffer.sync_enabled && (
                    <span className="text-xs text-[#9A8C85] font-medium">
                      Atualizado recentemente
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-sm font-bold text-red-500">Oferta indisponível</span>
              )}

              {currentOffer ? (
                <a
                  href={`/go/${product.slug}?store=${currentOffer.store.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-center block bg-[#5C4033] hover:bg-[#4A3227] text-white font-bold text-sm py-3.5 rounded-xl transition-all duration-200 tracking-wide"
                >
                  Ver produto na loja
                </a>
              ) : (
                <button
                  disabled
                  className="w-full bg-[#F0EBE3] text-[#9A8C85] font-bold text-sm py-3.5 rounded-xl cursor-not-allowed"
                >
                  Indisponível
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <div className="max-w-6xl mx-auto mt-10 flex flex-col gap-4">
            <h3 className="text-lg font-bold text-[#3E3230]">
              ✨ Produtos parecidos
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {similarProducts.map((p) => (
                <div key={p.id} className="w-full">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-5 border-t border-[#E8E0D4]/50 text-center text-[11px] text-[#9A8C85] mt-auto flex flex-col gap-0.5">
        <p>© 2026 Achadinhos. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
