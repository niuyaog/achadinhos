export interface Category {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  category_id?: string | null;
  is_active: boolean;
  is_featured: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  is_main: boolean;
  sort_order: number;
  created_at?: string;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  allowed_domain?: string | null;
  supports_price_sync: boolean;
  is_active: boolean;
  created_at?: string;
}

export type PriceMode = 'preco_sincronizado' | 'ver_preco_na_loja' | 'preco_indisponivel';

export interface ProductOffer {
  id: string;
  product_id: string;
  store_id: string;
  affiliate_url: string;
  external_product_id?: string | null;
  price?: number | null;
  price_mode: PriceMode | string;
  is_active: boolean;
  sync_enabled: boolean;
  sync_status?: string;
  last_synced_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

// Structured UI wrappers
export interface ProductWithDetails extends Product {
  images: ProductImage[];
  offers: (ProductOffer & { store: Store })[];
  tags: Tag[];
  category?: Category;
}

export interface ClickLog {
  id?: string;
  product_id?: string | null;
  offer_id?: string | null;
  store_id?: string | null;
  category_id?: string | null;
  source?: string | null;
  referrer?: string | null;
  device?: string | null;
  ip_hash?: string | null;
  clicked_at?: string;
}

export interface ProductClickStat {
  product_id: string;
  title: string;
  count: number;
}

export interface StoreClickStat {
  store_id: string;
  name: string;
  count: number;
}

export interface CategoryClickStat {
  category_id: string;
  name: string;
  count: number;
}

export interface RecentClickLog extends ClickLog {
  product_title: string;
  store_name: string;
  store_slug: string;
  category_name: string;
}
