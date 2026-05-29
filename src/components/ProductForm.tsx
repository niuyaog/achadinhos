'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCategories, getStores, uploadProductImage } from '../lib/supabase/dataManager';
import { Category, Store, ProductWithDetails, ProductImage, ProductOffer } from '../types';
import { getAffiliateUrlValidationError } from '../lib/security/affiliateUrl';

interface ProductFormProps {
  initialProduct?: ProductWithDetails | null;
  isEditMode?: boolean;
}

export default function ProductForm({ initialProduct, isEditMode = false }: ProductFormProps) {
  const router = useRouter();

  // Unified Product ID (generates once on creation to map dynamic storage folders)
  const [productId] = useState(() => initialProduct?.id || `prod-${Date.now()}`);

  // Form core states
  const [title, setTitle] = useState(initialProduct?.title || '');
  const [slug, setSlug] = useState(initialProduct?.slug || '');
  const [description, setDescription] = useState(initialProduct?.description || '');
  const [categoryId, setCategoryId] = useState(initialProduct?.category_id || '');
  const [isActive, setIsActive] = useState(initialProduct?.is_active ?? true);
  const [isFeatured, setIsFeatured] = useState(initialProduct?.is_featured ?? false);

  // Gallery images states
  const [images, setImages] = useState<ProductImage[]>(initialProduct?.images || []);
  const [uploading, setUploading] = useState(false);

  // System options lists
  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);

  const [offers, setOffers] = useState<(ProductOffer & { store: Store })[]>(() => {
    if (!initialProduct?.offers) return [];
    return initialProduct.offers.reduce((acc, current) => {
      if (!acc.find((o) => o.store_id === current.store_id)) {
        acc.push(current);
      }
      return acc;
    }, [] as (ProductOffer & { store: Store })[]);
  });
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [affiliateUrl, setAffiliateUrl] = useState('');
  const [priceMode, setPriceMode] = useState<string>('preco_sincronizado');
  const [price, setPrice] = useState('');
  const [externalProductId, setExternalProductId] = useState('');
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);

  const selectedStore = stores.find((s) => s.id === selectedStoreId);

  const handleSelectedStoreChange = (storeId: string) => {
    setSelectedStoreId(storeId);
    const existing = offers.find((o) => o.store_id === storeId);
    if (existing) {
      setAffiliateUrl(existing.affiliate_url || '');
      setPriceMode(existing.price_mode || 'preco_sincronizado');
      setPrice(existing.price ? existing.price.toString() : '');
      setExternalProductId(existing.external_product_id || '');
      setSyncEnabled(existing.sync_enabled || false);
      return;
    }

    setAffiliateUrl('');
    setPriceMode('preco_sincronizado');
    setPrice('');
    setExternalProductId('');
    const store = stores.find((s) => s.id === storeId);
    setSyncEnabled(store ? store.supports_price_sync : false);
  };

  // Load categories and stores
  useEffect(() => {
    const fetchOptions = async () => {
      const cats = await getCategories();
      setCategories(cats);
      const sts = await getStores();
      setStores(sts);
      
      if (sts.length > 0) {
        setSelectedStoreId(sts[0].id);
      }
    };
    fetchOptions();
  }, []);

  // Auto-slugify based on title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (!isEditMode) {
      const slugified = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(slugified);
    }
  };

  // 1. Multi-File Upload flow
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 15) {
      alert('Limite de 15 imagens por produto.');
      e.target.value = '';
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB

    for (let i = 0; i < files.length; i++) {
      if (!allowedTypes.includes(files[i].type)) {
        alert('Selecione apenas imagens no formato JPEG, PNG ou WEBP.');
        e.target.value = '';
        return;
      }
      if (files[i].size > maxSizeBytes) {
        alert('Uma ou mais imagens excedem o tamanho máximo de 5MB.');
        e.target.value = '';
        return;
      }
    }

    setUploading(true);
    const newImages = [...images];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadedImg = await uploadProductImage(productId, file);
        
        // Auto-assign is_main to true if it is the first photo overall
        const hasMain = newImages.some((img) => img.is_main);
        
        const finalImg: ProductImage = {
          id: uploadedImg.id || `img-temp-${Date.now()}-${i}`,
          product_id: productId,
          image_url: uploadedImg.image_url || '',
          is_main: !hasMain && i === 0 && newImages.length === 0,
          sort_order: newImages.length,
        };

        newImages.push(finalImg);
      }
      setImages(newImages);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao fazer upload da imagem.';
      alert(msg);
    } finally {
      setUploading(false);
      // Reset input value
      e.target.value = '';
    }
  };

  // 2. Primary Image toggle logic (enforces single active selection)
  const handleSetMainImage = (id: string) => {
    setImages(
      images.map((img) => ({
        ...img,
        is_main: img.id === id,
      }))
    );
  };

  // 3. Image Removal
  const handleRemoveImage = (id: string) => {
    const filtered = images.filter((img) => img.id !== id);
    // Safe main reassign
    if (filtered.length > 0 && !filtered.some((img) => img.is_main)) {
      filtered[0].is_main = true;
    }
    setImages(filtered);
  };

  // 4. Image Reordering
  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= images.length) return;

    const list = [...images];
    // Swap elements
    const temp = list[index];
    list[index] = list[newIndex];
    list[newIndex] = temp;

    // Recalculate sort_order
    const reordered = list.map((img, i) => ({
      ...img,
      sort_order: i,
    }));

    setImages(reordered);
  };

  // 5. Offers management functions
  const handleEditOffer = (offer: ProductOffer & { store: Store }) => {
    setEditingStoreId(offer.store_id);
    setSelectedStoreId(offer.store_id);
    setAffiliateUrl(offer.affiliate_url || '');
    setPriceMode(offer.price_mode || 'preco_sincronizado');
    setPrice(offer.price !== undefined && offer.price !== null ? offer.price.toString() : '');
    setExternalProductId(offer.external_product_id || '');
    setSyncEnabled(offer.sync_enabled || false);
  };

  const handleCancelEditOffer = () => {
    setEditingStoreId(null);
    setAffiliateUrl('');
    setPriceMode('preco_sincronizado');
    setPrice('');
    setExternalProductId('');
    if (stores.length > 0) {
      setSelectedStoreId(stores[0].id);
    }
  };

  const handleAddOffer = () => {
    if (affiliateUrl.trim() === '') {
      alert('Por favor, preencha o link afiliado.');
      return;
    }

    const store = stores.find((s) => s.id === selectedStoreId);
    if (!store) return;

    const validationError = getAffiliateUrlValidationError(affiliateUrl.trim(), store);
    if (validationError) {
      alert(validationError);
      return;
    }

    const offerIndex = offers.findIndex((o) => o.store_id === selectedStoreId);
    const parsedPrice = priceMode === 'preco_sincronizado' ? parseFloat(price) || 0 : undefined;

    const newOffer: ProductOffer & { store: Store } = {
      id: offers[offerIndex]?.id || `off-temp-${Date.now()}`,
      product_id: productId,
      store_id: selectedStoreId,
      store: store,
      affiliate_url: affiliateUrl.trim(),
      price: parsedPrice,
      price_mode: priceMode,
      is_active: priceMode !== 'preco_indisponivel', // Inactive if set to unavailable
      sync_enabled: store.supports_price_sync ? syncEnabled : false,
      external_product_id: store.supports_price_sync ? externalProductId : null,
      sync_status: offers[offerIndex]?.sync_status || 'not_synced',
      last_synced_at: offers[offerIndex]?.last_synced_at || null,
    };

    if (offerIndex !== -1) {
      const updated = [...offers];
      updated[offerIndex] = newOffer;
      setOffers(updated);
    } else {
      setOffers([...offers, newOffer]);
    }

    setAffiliateUrl('');
    setPrice('');
    setExternalProductId('');
    setEditingStoreId(null);
  };

  const handleRemoveOffer = (storeId: string) => {
    const offerToRemove = offers.find(o => o.store_id === storeId);
    setOffers(offers.filter((o) => o.store_id !== storeId));
    if (offerToRemove && editingStoreId === offerToRemove.store_id) {
      handleCancelEditOffer();
    }
  };

  // 6. Form Submit function
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (categoryId === '') {
      alert('Por favor, selecione uma categoria.');
      return;
    }
    if (images.length === 0) {
      alert('Por favor, adicione pelo menos uma imagem para o produto.');
      return;
    }
    if (offers.length === 0) {
      alert('Por favor, configure pelo menos uma oferta ativa.');
      return;
    }

    setLoading(true);

    try {
      // Build a clean payload with only confirmed offers (no draft state)
      const apiPayload = {
        id: isEditMode ? productId : undefined,
        title,
        slug,
        description,
        category_id: categoryId,
        is_active: isActive,
        is_featured: isFeatured,
        images: images.map((img) => ({
          image_url: img.image_url,
          is_main: img.is_main,
          sort_order: img.sort_order,
        })),
        offers: offers.map((o) => ({
          store_id: o.store_id,
          affiliate_url: o.affiliate_url,
          external_product_id: o.external_product_id || null,
          price: o.price,
          price_mode: o.price_mode,
          is_active: o.is_active,
          sync_enabled: o.sync_enabled,
          sync_status: o.sync_status || 'not_synced',
          last_synced_at: o.last_synced_at || null,
        })),
      };

      const res = await fetch('/admin/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || `Erro do servidor (${res.status})`);
      }

      router.push('/admin/produtos');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido ao salvar produto.';
      alert(`Erro ao salvar produto:\n${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6 max-w-4xl mx-auto w-full">
      {/* Header breadcrumb */}
      <div className="flex items-center justify-between border-b border-[#E8E2D5]/60 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#4A3D3C] font-serif">
            {isEditMode ? 'Editar Achadinho' : 'Cadastrar Novo Achadinho'}
          </h1>
          <p className="text-xs text-[#8A7A78] mt-0.5">
            {isEditMode ? 'Atualize imagens, preços e links afiliados deste item.' : 'Cadastre um novo item na vitrine com múltiplas ofertas.'}
          </p>
        </div>

        <Link
          href="/admin/produtos"
          className="bg-transparent hover:bg-[#EAE4D8]/40 text-[#5C4D4C] border border-[#DFD7C7] text-xs font-bold px-4 py-2.5 rounded-xl transition-all uppercase shrink-0"
        >
          Cancelar
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Form Inputs */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-[#FCFAF6] border border-[#E8E2D5] rounded-[2rem] p-5 shadow-sm flex flex-col gap-4">
            <h3 className="font-extrabold text-[#4A3D3C] text-xs uppercase tracking-wider border-b border-[#E8E2D5]/60 pb-2">
              📝 Detalhes do Produto
            </h3>

            {/* Title */}
            <div>
              <label className="block text-[9px] uppercase tracking-wider font-extrabold text-[#8A7A78]">
                Nome do Produto
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={handleTitleChange}
                placeholder="Ex: Regata Canelada Premium Marrom"
                className="mt-1.5 block w-full px-4 py-2.5 border border-[#DFD7C7] rounded-xl bg-white text-[#4A3D3C] text-xs focus:outline-none focus:ring-1 focus:ring-[#8C6D62]"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-[9px] uppercase tracking-wider font-extrabold text-[#8A7A78]">
                Slug URL
              </label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="ex-regata-canelada-premium-marrom"
                className="mt-1.5 block w-full px-4 py-2.5 border border-[#DFD7C7] rounded-xl bg-white text-[#4A3D3C] text-xs focus:outline-none focus:ring-1 focus:ring-[#8C6D62]"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-[9px] uppercase tracking-wider font-extrabold text-[#8A7A78]">
                Categoria
              </label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1.5 block w-full px-4 py-2.5 border border-[#DFD7C7] rounded-xl bg-white text-[#4A3D3C] text-xs focus:outline-none focus:ring-1 focus:ring-[#8C6D62] cursor-pointer"
              >
                <option value="">Selecione uma categoria...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[9px] uppercase tracking-wider font-extrabold text-[#8A7A78]">
                Descrição Curta
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Insira detalhes rápidos do caimento, tom, qualidade..."
                className="mt-1.5 block w-full px-4 py-2.5 border border-[#DFD7C7] rounded-xl bg-white text-[#4A3D3C] text-xs focus:outline-none focus:ring-1 focus:ring-[#8C6D62] resize-none"
              />
            </div>

            {/* Switches: Active & Featured */}
            <div className="flex flex-wrap gap-6 border-t border-[#E8E2D5]/50 pt-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#5C4D4C]">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-[#8C6D62] focus:ring-[#8C6D62] w-4 h-4 border-[#DFD7C7]"
                />
                Produto Ativo (Visível na Vitrine)
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#5C4D4C]">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded text-[#8C6D62] focus:ring-[#8C6D62] w-4 h-4 border-[#DFD7C7]"
                />
                Destaque da Semana (Destaques)
              </label>
            </div>
          </div>

          {/* Image Gallery Section (Multi-File Uploader Setup) */}
          <div className="bg-[#FCFAF6] border border-[#E8E2D5] rounded-[2rem] p-5 shadow-sm flex flex-col gap-4">
            <h3 className="font-extrabold text-[#4A3D3C] text-xs uppercase tracking-wider border-b border-[#E8E2D5]/60 pb-2 flex items-center justify-between">
              <span>🖼️ Galeria de Imagens</span>
              {uploading && (
                <span className="text-[10px] font-bold text-[#8C6D62] animate-pulse">
                  ⚡ Enviando fotos...
                </span>
              )}
            </h3>

            {/* Safe Select File Selector */}
            <div className="flex flex-col gap-2">
              <label className="block text-[9px] uppercase tracking-wider font-extrabold text-[#8A7A78]">
                Selecionar Imagens do Computador
              </label>
              <div className="border-2 border-dashed border-[#DFD7C7] hover:border-[#8C6D62]/40 rounded-2xl p-6 bg-white transition-all flex flex-col items-center justify-center gap-2 relative">
                <span className="text-2xl">📸</span>
                <span className="text-[10px] text-[#8A7A78] font-bold uppercase tracking-wider">Clique para selecionar uma ou várias fotos</span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg, image/png, image/webp"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Preview Thumbnails List */}
            {images.length === 0 ? (
              <span className="text-[11px] text-[#8A7A78] italic p-6 bg-white/40 rounded-xl text-center border border-dashed border-[#DFD7C7]">
                Nenhuma foto carregada ainda. Use o seletor acima para adicionar.
              </span>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    className={`bg-white border rounded-xl overflow-hidden p-2 flex flex-col gap-2 relative shadow-inner transition-all ${
                      img.is_main ? 'border-[#8C6D62] ring-2 ring-[#8C6D62]/10' : 'border-[#E8E2D5]'
                    }`}
                  >
                    <div className="aspect-square rounded-lg overflow-hidden bg-[#F5F2EB]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                    </div>

                    {/* Meta actions */}
                    <div className="flex flex-col gap-1.5 mt-1 border-t border-[#E8E2D5]/30 pt-1.5">
                      <label className="flex items-center gap-1.5 cursor-pointer text-[9px] font-extrabold text-[#5C4D4C]">
                        <input
                          type="radio"
                          name="is_main_radio"
                          checked={img.is_main}
                          onChange={() => handleSetMainImage(img.id)}
                          className="text-[#8C6D62] w-3 h-3"
                        />
                        Principal
                      </label>

                      {/* Sort arrows */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveImage(idx, 'up')}
                          className="text-[9px] font-extrabold text-[#8C6D62] disabled:opacity-30 cursor-pointer"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={idx === images.length - 1}
                          onClick={() => handleMoveImage(idx, 'down')}
                          className="text-[9px] font-extrabold text-[#8C6D62] disabled:opacity-30 cursor-pointer"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(img.id)}
                          className="text-[9px] font-extrabold text-red-600 hover:text-red-700 ml-auto cursor-pointer"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Manage Offers */}
        <div className="flex flex-col gap-6">
          <div className="bg-[#FCFAF6] border border-[#E8E2D5] rounded-[2rem] p-5 shadow-sm flex flex-col gap-4">
            <h3 className="font-extrabold text-[#4A3D3C] text-xs uppercase tracking-wider border-b border-[#E8E2D5]/60 pb-2">
              🏪 Ofertas por Loja
            </h3>

            {/* Selector */}
            <div className="flex flex-col gap-3 p-3.5 bg-white/40 border border-[#E8E2D5]/60 rounded-2xl">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#8A7A78] leading-none">
                {editingStoreId ? 'Editar Oferta Selecionada' : 'Nova Oferta'}
              </span>
              
              {/* Store Select */}
              <div>
	                <select
	                  value={selectedStoreId}
	                  onChange={(e) => handleSelectedStoreChange(e.target.value)}
	                  disabled={editingStoreId !== null}
                  className="block w-full px-3 py-2 border border-[#DFD7C7] rounded-xl bg-white text-[#4A3D3C] text-xs focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Affiliate URL */}
              <div>
                <input
                  type="text"
                  placeholder="Link de afiliado seguro da loja..."
                  value={affiliateUrl}
                  onChange={(e) => setAffiliateUrl(e.target.value)}
                  className="block w-full px-3 py-2 border border-[#DFD7C7] rounded-xl bg-white text-[#4A3D3C] text-xs focus:outline-none"
                />
              </div>

              {/* Shopee Sync Section */}
              {selectedStore?.slug.toLowerCase() === 'shopee' && (
                <div className="border border-[#E8E2D5] rounded-xl p-3 bg-[#EAE4D8]/10 flex flex-col gap-2.5">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#8C6D62]">Configurações de Sincronização Shopee</span>
                  
                  {/* External Product ID */}
                  <div>
                    <label className="block text-[8px] uppercase tracking-wider font-extrabold text-[#8A7A78] mb-1">ID do Produto Shopee (external_product_id)</label>
                    <input
                      type="text"
                      placeholder="Ex: 1234567890"
                      value={externalProductId}
                      onChange={(e) => setExternalProductId(e.target.value)}
                      className="block w-full px-3 py-2 border border-[#DFD7C7] rounded-xl bg-white text-[#4A3D3C] text-xs focus:outline-none"
                    />
                  </div>

                  {/* Sync Enabled Switch */}
                  <label className="flex items-center gap-2 cursor-pointer text-[10px] font-bold text-[#5C4D4C] mt-0.5">
                    <input
                      type="checkbox"
                      checked={syncEnabled}
                      onChange={(e) => setSyncEnabled(e.target.checked)}
                      className="rounded text-[#8C6D62] focus:ring-[#8C6D62] w-3.5 h-3.5 border-[#DFD7C7]"
                    />
                    Habilitar Sincronização Automática
                  </label>
                </div>
              )}

              {/* Price mode */}
              <div className="flex gap-2.5">
                <select
                  value={priceMode}
                  onChange={(e) => setPriceMode(e.target.value)}
                  className="block w-1/2 px-3 py-2 border border-[#DFD7C7] rounded-xl bg-white text-[#4A3D3C] text-xs focus:outline-none cursor-pointer"
                >
                  <option value="preco_sincronizado">Sincronizado</option>
                  <option value="ver_preco_na_loja">Ver na loja</option>
                  <option value="preco_indisponivel">Indisponível</option>
                </select>

                <input
                  type="number"
                  step="0.01"
                  disabled={priceMode !== 'preco_sincronizado'}
                  placeholder="Preço R$"
                  value={priceMode !== 'preco_sincronizado' ? '' : price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="block w-1/2 px-3 py-2 border border-[#DFD7C7] rounded-xl bg-white text-[#4A3D3C] text-xs focus:outline-none disabled:opacity-40 disabled:bg-gray-100"
                />
              </div>

              <button
                type="button"
                onClick={handleAddOffer}
                className="w-full bg-[#5C4033] hover:bg-[#4A3227] text-white text-[10px] font-bold py-2.5 rounded-xl uppercase tracking-wider cursor-pointer transition-all"
              >
                {editingStoreId ? 'Atualizar Oferta' : 'Confirmar Oferta'}
              </button>

              {editingStoreId && (
                <button
                  type="button"
                  onClick={handleCancelEditOffer}
                  className="w-full bg-transparent hover:bg-[#EAE4D8]/20 text-[#5C4D4C] border border-[#DFD7C7] text-[10px] font-bold py-2.5 rounded-xl uppercase tracking-wider cursor-pointer transition-all"
                >
                  Cancelar Edição
                </button>
              )}
            </div>

            {/* List of added offers */}
            <div className="flex flex-col gap-2">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#8A7A78]">Ofertas Adicionadas</span>
              
              {offers.length === 0 ? (
                <span className="text-[11px] text-[#8A7A78] italic p-3 bg-white/40 rounded-xl text-center border border-dashed border-[#DFD7C7]">
                  Nenhuma oferta cadastrada.
                </span>
              ) : (
                <div className="flex flex-col gap-2">
                  {offers.map((o) => (
                    <div
                      key={o.store_id}
                      className={`bg-white border rounded-xl p-3 flex items-center justify-between text-xs transition-all ${
                        editingStoreId === o.store_id ? 'border-[#8C6D62] ring-2 ring-[#8C6D62]/10 bg-[#8C6D62]/5' : 'border-[#E8E2D5]'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 gap-0.5">
                        <span className="font-extrabold text-[#4A3D3C] flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${o.is_active ? 'bg-green-600' : 'bg-red-500'}`}></span>
                          {o.store.name}
                          {editingStoreId === o.store_id && (
                            <span className="text-[8px] uppercase tracking-wider font-extrabold bg-[#8C6D62] text-white px-1.5 py-0.5 rounded">Editando</span>
                          )}
                        </span>
                        
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-[#8A7A78]">
                          <span>
                            {o.price_mode === 'preco_sincronizado' ? 'Sincronizado' : o.price_mode === 'ver_preco_na_loja' ? 'Ver na loja' : 'Indisponível'}
                          </span>
                          {o.price_mode === 'preco_sincronizado' && o.price !== undefined && o.price !== null && (
                            <span className="font-bold text-[#4A3D3C]">
                              R$ {Number(o.price).toFixed(2)}
                            </span>
                          )}
                          <span className="text-[#E8E2D5]/50">|</span>
                          <span className="flex items-center gap-0.5 text-[#5C4D4C]">
                            {o.affiliate_url ? '🔗 Link Cadastrado' : '⚠️ Sem Link'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditOffer(o)}
                          className="text-[10px] font-extrabold text-[#8C6D62] hover:text-[#5C4033] cursor-pointer px-2 py-1.5 hover:bg-[#8C6D62]/10 rounded transition-all"
                          title="Editar Oferta"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveOffer(o.store_id)}
                          className="text-[10px] font-extrabold text-red-600 hover:text-red-700 cursor-pointer px-2 py-1.5 hover:bg-red-50 rounded transition-all"
                          title="Excluir Oferta"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Action Footer */}
      <div className="border-t border-[#E8E2D5]/60 pt-6 flex justify-end gap-3.5">
        <Link
          href="/admin/produtos"
          className="bg-transparent hover:bg-[#EAE4D8]/40 text-[#5C4D4C] border border-[#DFD7C7] text-xs font-bold px-6 py-3.5 rounded-2xl transition-all uppercase tracking-wider"
        >
          Voltar
        </Link>
        <button
          type="submit"
          disabled={loading || uploading}
          className="bg-[#5C4033] hover:bg-[#4A3227] text-white text-xs font-bold px-8 py-3.5 rounded-2xl shadow-md hover:shadow-lg transition-all uppercase tracking-wider cursor-pointer"
        >
          {loading ? 'Salvando...' : 'Salvar Produto'}
        </button>
      </div>
    </form>
  );
}
