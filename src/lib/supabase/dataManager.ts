import { supabase } from './client';
import { canUseMockFallback, isSimulationMode, isSupabaseConfigured } from './config';
import {
  mockProducts,
  mockCategories,
  mockStores,
  mockTags,
  mockClickCounts,
} from '../../data/mockData';
import {
  ProductWithDetails,
  Category,
  Store,
  Tag,
  ProductImage,
  ProductOffer,
  ClickLog,
  ProductClickStat,
  StoreClickStat,
  CategoryClickStat,
  RecentClickLog,
} from '../../types';
import { Database } from '../../types/database.types';
import { withDefaultAllowedDomain } from '../security/affiliateUrl';

type ProductTagRow = {
  product_id: string;
  tag: Tag | Tag[] | null;
};

type SupabaseProductRow = Omit<ProductWithDetails, 'images' | 'offers' | 'tags' | 'category'> & {
  images?: ProductImage[];
  offers?: (ProductOffer & { store: Store | null })[];
  category?: Category | null;
};

const readLocalJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;

  const data = localStorage.getItem(key);
  if (!data) return fallback;

  try {
    return JSON.parse(data) as T;
  } catch {
    return fallback;
  }
};

const assertDataSourceAvailable = () => {
  if (!isSupabaseConfigured() && !isSimulationMode()) {
    throw new Error('Supabase must be configured outside development simulation mode.');
  }
};

const sortClicksDesc = (a: ClickLog, b: ClickLog) => {
  return new Date(b.clicked_at || '').getTime() - new Date(a.clicked_at || '').getTime();
};

// ─── localStorage seed (simulation mode only) ────────────────────────────
const seedSimulationData = () => {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem('achadinhos_seeded')) {
    localStorage.setItem('achadinhos_categories', JSON.stringify(mockCategories));
    localStorage.setItem('achadinhos_stores', JSON.stringify(mockStores));
    localStorage.setItem('achadinhos_tags', JSON.stringify(mockTags));
    localStorage.setItem('achadinhos_products', JSON.stringify(mockProducts));

    const clicksList: ClickLog[] = [];
    const devices = ['Celular (iOS)', 'Celular (Android)', 'Desktop (Chrome)', 'Desktop (Safari)'];
    const referrers = ['https://instagram.com', 'https://tiktok.com', 'Direto', 'https://t.me/achadinhos'];
    const sources = ['link_bio', 'stories', 'whats_grupo', 'telegram_canal'];

    Object.entries(mockClickCounts).forEach(([prodId, count]) => {
      const product = mockProducts.find(p => p.id === prodId);
      const offer = product?.offers.find(o => o.is_active) || product?.offers[0];

      for (let i = 0; i < count; i++) {
        const date = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
        clicksList.push({
          id: `click-mock-${prodId}-${i}`,
          product_id: prodId,
          offer_id: offer?.id || null,
          store_id: offer?.store_id || null,
          category_id: product?.category_id || null,
          source: sources[Math.floor(Math.random() * sources.length)],
          referrer: referrers[Math.floor(Math.random() * referrers.length)],
          device: devices[Math.floor(Math.random() * devices.length)],
          clicked_at: date,
        });
      }
    });

    localStorage.setItem('achadinhos_clicks', JSON.stringify(clicksList));
    localStorage.setItem('achadinhos_seeded', 'true');
  }
};

// Only seed in development simulation mode
if (typeof window !== 'undefined' && isSimulationMode()) {
  seedSimulationData();
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════

export const getCategories = async (): Promise<Category[]> => {
  assertDataSourceAvailable();

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) {
      console.error('Error loading categories from Supabase:', error);
      if (canUseMockFallback()) {
        return readLocalJson('achadinhos_categories', mockCategories);
      }
      throw error;
    }
    return data || [];
  }

  return readLocalJson('achadinhos_categories', mockCategories);
};

// ═══════════════════════════════════════════════════════════════════════════
// 2. STORES
// ═══════════════════════════════════════════════════════════════════════════

export const getStores = async (): Promise<Store[]> => {
  assertDataSourceAvailable();

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .order('name', { ascending: true });
    if (error) {
      console.error('Error loading stores from Supabase:', error);
      if (canUseMockFallback()) {
        return readLocalJson('achadinhos_stores', mockStores).map(withDefaultAllowedDomain);
      }
      throw error;
    }
    return (data || []).map(withDefaultAllowedDomain);
  }

  return readLocalJson('achadinhos_stores', mockStores).map(withDefaultAllowedDomain);
};

export const saveStore = async (store: Partial<Store>) => {
  assertDataSourceAvailable();

  if (isSupabaseConfigured()) {
    const storePayload: Database['public']['Tables']['stores']['Insert'] = {
      name: store.name || 'Nova Loja',
      slug: store.slug || `store-${Date.now()}`,
      logo_url: store.logo_url || null,
      allowed_domain: withDefaultAllowedDomain({
        slug: store.slug || '',
        allowed_domain: store.allowed_domain || null,
      }).allowed_domain,
      supports_price_sync: store.supports_price_sync || false,
      is_active: store.is_active !== undefined ? store.is_active : true,
    };

    const { data, error } = await supabase
      .from('stores')
      .upsert(store.id ? { ...storePayload, id: store.id } : storePayload)
      .select();
    if (error) throw error;
    return data[0];
  }

  if (isSimulationMode() && typeof window !== 'undefined') {
      const stores = readLocalJson<Store[]>('achadinhos_stores', [...mockStores]);
      if (store.id) {
        const idx = stores.findIndex((s) => s.id === store.id);
        if (idx !== -1) {
          stores[idx] = withDefaultAllowedDomain({ ...stores[idx], ...store } as Store);
        }
      } else {
        const newStore: Store = {
          id: `store-${Date.now()}`,
          name: store.name || 'Nova Loja',
          slug: store.slug || `store-${Date.now()}`,
          logo_url: store.logo_url || '',
          allowed_domain: withDefaultAllowedDomain({
            slug: store.slug || `store-${Date.now()}`,
            allowed_domain: store.allowed_domain || null,
          }).allowed_domain || '',
          supports_price_sync: store.supports_price_sync || false,
          is_active: store.is_active !== undefined ? store.is_active : true,
          created_at: new Date().toISOString(),
        };
        stores.push(newStore);
        store.id = newStore.id;
      }

      localStorage.setItem('achadinhos_stores', JSON.stringify(stores));
      return store;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. PRODUCTS CRUD (Full Supabase implementation)
// ═══════════════════════════════════════════════════════════════════════════

export const getProducts = async (): Promise<ProductWithDetails[]> => {
  assertDataSourceAvailable();

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        images:product_images(*),
        offers:product_offers(*, store:stores(*)),
        category:categories(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading products from Supabase:', error);
      if (canUseMockFallback()) {
        return readLocalJson('achadinhos_products', mockProducts);
      }
      throw error;
    }

    // Fetch tags via product_tags junction table
    const { data: productTagsData } = await supabase
      .from('product_tags')
      .select('product_id, tag:tags(*)');

    const tagsByProduct: Record<string, Tag[]> = {};
    if (productTagsData) {
      (productTagsData as ProductTagRow[]).forEach((pt) => {
        if (!tagsByProduct[pt.product_id]) {
          tagsByProduct[pt.product_id] = [];
        }
        const tag = Array.isArray(pt.tag) ? pt.tag[0] : pt.tag;
        if (tag) {
          tagsByProduct[pt.product_id].push(tag);
        }
      });
    }

    const products: ProductWithDetails[] = ((data || []) as SupabaseProductRow[]).map((prod) => ({
      ...prod,
      images: (prod.images || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
      offers: (prod.offers || [])
        .filter((offer): offer is ProductOffer & { store: Store } => Boolean(offer.store))
        .map((offer) => ({
          ...offer,
          store: withDefaultAllowedDomain(offer.store),
        })),
      tags: tagsByProduct[prod.id] || [],
      category: prod.category || undefined,
    }));

    return products;
  }

  return readLocalJson('achadinhos_products', mockProducts);
};

export const getProductById = async (id: string): Promise<ProductWithDetails | null> => {
  const products = await getProducts();
  return products.find((p) => p.id === id) || null;
};

/**
 * Creates or updates a product in Supabase with all related data (images, offers).
 * Handles the full transactional flow: product → images → offers.
 */
export const saveProduct = async (prod: Partial<ProductWithDetails>) => {
  assertDataSourceAvailable();

  if (isSupabaseConfigured()) {
    const isEdit = !!prod.id;

    // 1. Upsert the product record
    const productPayload = {
      ...(isEdit ? { id: prod.id } : {}),
      title: prod.title || 'Sem título',
      slug: prod.slug || `prod-${Date.now()}`,
      description: prod.description || null,
      category_id: prod.category_id || null,
      is_active: prod.is_active !== undefined ? prod.is_active : true,
      is_featured: prod.is_featured !== undefined ? prod.is_featured : false,
      updated_at: new Date().toISOString(),
    };

    const { data: savedProduct, error: productError } = await supabase
      .from('products')
      .upsert(productPayload)
      .select()
      .single();

    if (productError) {
      console.error('Error saving product:', productError);
      throw productError;
    }

    const productId = savedProduct.id;

    // 2. Sync images — delete existing and re-insert
    if (prod.images && prod.images.length > 0) {
      // Delete old images for this product
      await supabase.from('product_images').delete().eq('product_id', productId);

      // Insert new images
      const imageRows = prod.images.map((img, idx) => ({
        product_id: productId,
        image_url: img.image_url,
        is_main: img.is_main || false,
        sort_order: img.sort_order ?? idx,
      }));

      const { error: imgError } = await supabase
        .from('product_images')
        .insert(imageRows);

      if (imgError) {
        console.error('Error saving product images:', imgError);
      }
    }

    // 3. Sync offers — delete existing and re-insert
    if (prod.offers && prod.offers.length > 0) {
      // Delete old offers for this product
      await supabase.from('product_offers').delete().eq('product_id', productId);

      // Insert new offers
      const offerRows = prod.offers.map((off) => ({
        product_id: productId,
        store_id: off.store_id,
        affiliate_url: off.affiliate_url,
        external_product_id: off.external_product_id || null,
        price: off.price || null,
        price_mode: off.price_mode || 'ver_preco_na_loja',
        is_active: off.is_active !== undefined ? off.is_active : true,
        sync_enabled: off.sync_enabled || false,
        sync_status: off.sync_status || 'not_synced',
        last_synced_at: off.last_synced_at || null,
        updated_at: new Date().toISOString(),
      }));

      const { error: offError } = await supabase
        .from('product_offers')
        .insert(offerRows);

      if (offError) {
        console.error('Error saving product offers:', offError);
      }
    }

    return { ...prod, id: productId };
  } else if (isSimulationMode() && typeof window !== 'undefined') {
      const products = readLocalJson<ProductWithDetails[]>('achadinhos_products', [...mockProducts]);

      if (prod.id) {
        const idx = products.findIndex((p) => p.id === prod.id);
        if (idx !== -1) {
          products[idx] = {
            ...products[idx],
            ...prod,
            updated_at: new Date().toISOString(),
          } as ProductWithDetails;
        }
      } else {
        const newId = `prod-${Date.now()}`;
        const newProduct: ProductWithDetails = {
          id: newId,
          title: prod.title || 'Sem título',
          slug: prod.slug || `prod-${Date.now()}`,
          description: prod.description || '',
          category_id: prod.category_id || '',
          is_active: prod.is_active !== undefined ? prod.is_active : true,
          is_featured: prod.is_featured !== undefined ? prod.is_featured : false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          category: prod.category || mockCategories[0],
          images: prod.images ? prod.images.map((img, i) => ({ ...img, id: `img-${Date.now()}-${i}`, product_id: newId })) : [],
          offers: prod.offers ? prod.offers.map((off, i) => ({ ...off, id: `off-${Date.now()}-${i}`, product_id: newId })) : [],
          tags: prod.tags || [],
        };
        products.push(newProduct);
        prod.id = newId;
      }

      localStorage.setItem('achadinhos_products', JSON.stringify(products));
      return prod;
  }
};

export const deleteProduct = async (id: string): Promise<boolean> => {
  assertDataSourceAvailable();

  if (isSupabaseConfigured()) {
    // product_images and product_offers cascade delete via FK
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      console.error('Error deleting product:', error);
      return false;
    }
    return true;
  } else if (isSimulationMode() && typeof window !== 'undefined') {
      let products = readLocalJson<ProductWithDetails[]>('achadinhos_products', [...mockProducts]);
      products = products.filter((p) => p.id !== id);
      localStorage.setItem('achadinhos_products', JSON.stringify(products));
      return true;
  }

  return false;
};

// ═══════════════════════════════════════════════════════════════════════════
// 4. IMAGE UPLOADS (Supabase Storage bucket: product-images)
// ═══════════════════════════════════════════════════════════════════════════

export const uploadProductImage = async (productId: string, file: File): Promise<Partial<ProductImage>> => {
  assertDataSourceAvailable();

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}.${fileExt}`;
  const filePath = `products/${productId}/${fileName}`;

  if (isSupabaseConfigured()) {
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return {
      product_id: productId,
      image_url: publicUrl,
      is_main: false,
      sort_order: 0,
    };
  } else if (isSimulationMode()) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Url = reader.result as string;
        resolve({
          id: `img-sim-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          product_id: productId,
          image_url: base64Url,
          is_main: false,
          sort_order: 0,
        });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  throw new Error('Upload indisponível fora do modo de simulação.');
};

export const deleteProductImage = async (imageId: string): Promise<boolean> => {
  assertDataSourceAvailable();

  if (isSupabaseConfigured() && !imageId.startsWith('img-temp-')) {
    const { error } = await supabase
      .from('product_images')
      .delete()
      .eq('id', imageId);
    return !error;
  }
  return true;
};

// ═══════════════════════════════════════════════════════════════════════════
// 5. STATISTICS & CLICKS
// ═══════════════════════════════════════════════════════════════════════════

export const getClickStats = async (): Promise<ClickLog[]> => {
  assertDataSourceAvailable();

  if (isSupabaseConfigured()) {
    const { data: clicks, error } = await supabase
      .from('clicks')
      .select('*')
      .order('clicked_at', { ascending: false });
    if (error) {
      console.error('Error loading clicks from Supabase:', error);
      if (canUseMockFallback()) {
        return readLocalJson<ClickLog[]>('achadinhos_clicks', []).sort(sortClicksDesc);
      }
      throw error;
    }
    return clicks || [];
  }

  return readLocalJson<ClickLog[]>('achadinhos_clicks', []).sort(sortClicksDesc);
};

export const logProductClick = async (productId: string) => {
  assertDataSourceAvailable();

  if (isSupabaseConfigured()) {
    await supabase.from('clicks').insert({
      product_id: productId,
    });
  } else if (isSimulationMode() && typeof window !== 'undefined') {
      const clicksList = readLocalJson<ClickLog[]>('achadinhos_clicks', []);
      clicksList.push({
        id: `click-sim-view-${Date.now()}`,
        product_id: productId,
        clicked_at: new Date().toISOString(),
        source: 'visualizacao_produto',
        referrer: 'Direto',
        device: 'Desconhecido',
      });
      localStorage.setItem('achadinhos_clicks', JSON.stringify(clicksList));
  }
};

export const registerAffiliateClick = async (
  productId: string,
  offerId: string,
  storeId: string,
  categoryId: string | null = null,
  source: string | null = null,
  referrer: string | null = null,
  device: string | null = null
) => {
  assertDataSourceAvailable();

  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('clicks').insert({
      product_id: productId,
      offer_id: offerId,
      store_id: storeId,
      category_id: categoryId,
      source: source,
      referrer: referrer,
      device: device,
    });
    if (error) {
      console.error('Error logging affiliate click in database:', error);
    }
  } else if (isSimulationMode()) {
    if (typeof window !== 'undefined') {
      const clicksList = readLocalJson<ClickLog[]>('achadinhos_clicks', []);

      clicksList.push({
        id: `click-sim-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        product_id: productId,
        offer_id: offerId,
        store_id: storeId,
        category_id: categoryId,
        source: source || 'link_bio',
        referrer: referrer || 'Direto',
        device: device || 'Desconhecido',
        clicked_at: new Date().toISOString(),
      });

      localStorage.setItem('achadinhos_clicks', JSON.stringify(clicksList));
    } else {
      console.log(`[SIMULATED CLICK] Product: ${productId}, Offer: ${offerId}, Store: ${storeId}`);
    }
  }
};

// ─── Statistics helper functions ──────────────────────────────────────────

export const getTotalClicksCount = async (): Promise<number> => {
  const clicks = await getClickStats();
  return clicks.length;
};

export const getClicksByProduct = async (): Promise<ProductClickStat[]> => {
  const clicks = await getClickStats();
  const products = await getProducts();

  const counts: Record<string, number> = {};
  clicks.forEach((c) => {
    if (c.product_id) {
      counts[c.product_id] = (counts[c.product_id] || 0) + 1;
    }
  });

  return products.map((p) => ({
    product_id: p.id,
    title: p.title,
    count: counts[p.id] || 0,
  })).sort((a, b) => b.count - a.count);
};

export const getClicksByStore = async (): Promise<StoreClickStat[]> => {
  const clicks = await getClickStats();
  const stores = await getStores();

  const counts: Record<string, number> = {};
  clicks.forEach((c) => {
    if (c.store_id) {
      counts[c.store_id] = (counts[c.store_id] || 0) + 1;
    }
  });

  return stores.map((s) => ({
    store_id: s.id,
    name: s.name,
    count: counts[s.id] || 0,
  })).sort((a, b) => b.count - a.count);
};

export const getClicksByCategory = async (): Promise<CategoryClickStat[]> => {
  const clicks = await getClickStats();
  const categories = await getCategories();

  const counts: Record<string, number> = {};
  clicks.forEach((c) => {
    if (c.category_id) {
      counts[c.category_id] = (counts[c.category_id] || 0) + 1;
    }
  });

  return categories.map((cat) => ({
    category_id: cat.id,
    name: cat.name,
    count: counts[cat.id] || 0,
  })).sort((a, b) => b.count - a.count);
};

export const getMostClickedProducts = async (limit: number = 4): Promise<ProductWithDetails[]> => {
  const products = await getProducts();
  const clicks = await getClickStats();

  const counts: Record<string, number> = {};
  clicks.forEach((c) => {
    if (c.product_id) {
      counts[c.product_id] = (counts[c.product_id] || 0) + 1;
    }
  });

  const activeProducts = products.filter((p) => p.is_active);

  return activeProducts.sort((a, b) => {
    const clicksA = counts[a.id] || 0;
    const clicksB = counts[b.id] || 0;
    return clicksB - clicksA;
  }).slice(0, limit);
};

export const getRecentClicks = async (limit: number = 10): Promise<RecentClickLog[]> => {
  const clicks = await getClickStats();
  const products = await getProducts();
  const stores = await getStores();

  const recent = clicks.slice(0, limit);

  return recent.map((c) => {
    const product = products.find((p) => p.id === c.product_id);
    const store = stores.find((s) => s.id === c.store_id);
    const category = product ? product.category : undefined;
    return {
      ...c,
      product_title: product ? product.title : 'Produto removido',
      store_name: store ? store.name : 'Loja removida',
      store_slug: store ? store.slug : '',
      category_name: category ? category.name : 'Sem categoria',
    };
  });
};
