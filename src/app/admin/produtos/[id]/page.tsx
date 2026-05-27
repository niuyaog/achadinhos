'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getProductById } from '@/lib/supabase/dataManager';
import { ProductWithDetails } from '@/types';
import ProductForm from '@/components/ProductForm';

export default function AdminEditProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<ProductWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProductData = async () => {
      if (id && typeof id === 'string') {
        try {
          const prod = await getProductById(id);
          setProduct(prod);
        } catch (err) {
          console.error('Failed to load product for editing', err);
        } finally {
          setLoading(false);
        }
      }
    };
    loadProductData();
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-3 text-center">
        <div className="w-8 h-8 border-4 border-[#8C6D62]/20 border-t-[#8C6D62] rounded-full animate-spin"></div>
        <p className="text-xs uppercase font-extrabold text-[#8A7A78] tracking-widest">Carregando dados do produto...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-8 text-center text-xs text-[#8A7A78]">
        ⚠️ Produto não encontrado ou inválido.
      </div>
    );
  }

  return (
    <div className="w-full">
      <ProductForm initialProduct={product} isEditMode={true} />
    </div>
  );
}
