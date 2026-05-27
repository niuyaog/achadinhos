'use client';

import React from 'react';
import ProductForm from '@/components/ProductForm';

export default function AdminNewProductPage() {
  return (
    <div className="w-full">
      <ProductForm isEditMode={false} />
    </div>
  );
}
