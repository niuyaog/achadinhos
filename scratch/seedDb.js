import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Parse .env.local to get values
const envPath = path.resolve(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('Error: .env.local file not found. Please create it first.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    env[key] = val;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
// Use service role key to bypass RLS and insert admin seeded data
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

console.log('Seeding Supabase at:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

// Define categories with generated UUIDs
const categories = [
  { id: crypto.randomUUID(), name: 'Blusas', slug: 'blusas', is_active: true, sort_order: 1 },
  { id: crypto.randomUUID(), name: 'Calças', slug: 'calcas', is_active: true, sort_order: 2 },
  { id: crypto.randomUUID(), name: 'Vestidos', slug: 'vestidos', is_active: true, sort_order: 3 },
  { id: crypto.randomUUID(), name: 'Tênis', slug: 'tenis', is_active: true, sort_order: 4 },
  { id: crypto.randomUUID(), name: 'Acessórios', slug: 'acessorios', is_active: true, sort_order: 5 },
  { id: crypto.randomUUID(), name: 'Beleza', slug: 'beleza', is_active: true, sort_order: 6 },
  { id: crypto.randomUUID(), name: 'Perfumes', slug: 'perfumes', is_active: true, sort_order: 7 },
];

// Define stores with generated UUIDs
const stores = [
  {
    id: crypto.randomUUID(),
    name: 'Shopee',
    slug: 'shopee',
    logo_url: '/logos/shopee.svg',
    allowed_domain: 'shopee.com.br',
    supports_price_sync: true,
    is_active: true,
  },
  {
    id: crypto.randomUUID(),
    name: 'Amazon',
    slug: 'amazon',
    logo_url: '/logos/amazon.svg',
    allowed_domain: 'amazon.com.br',
    supports_price_sync: false,
    is_active: true,
  },
  {
    id: crypto.randomUUID(),
    name: 'SHEIN',
    slug: 'shein',
    logo_url: '/logos/shein.svg',
    allowed_domain: 'shein.com',
    supports_price_sync: false,
    is_active: true,
  },
];

// Define tags with generated UUIDs
const tags = [
  { id: crypto.randomUUID(), name: 'Achado barato', slug: 'achado-barato' },
  { id: crypto.randomUUID(), name: 'Favorito', slug: 'favorito' },
  { id: crypto.randomUUID(), name: 'Similar ao look', slug: 'similar-ao-look' },
];

// Helper maps
const getCategoryBySlug = (slug) => categories.find(c => c.slug === slug);
const getStoreBySlug = (slug) => stores.find(s => s.slug === slug);
const getTagBySlug = (slug) => tags.find(t => t.slug === slug);

// Products to insert (mapped to real UUIDs)
const rawProducts = [
  {
    title: 'Regata Canelada Marrom',
    slug: 'regata-canelada-marrom',
    description: 'Regata canelada em malha premium de alta elasticidade. Perfeita para compor looks casuais e elegantes.',
    categorySlug: 'blusas',
    is_active: true,
    is_featured: true,
    tagSlugs: ['achado-barato'],
    images: [
      { image_url: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=500&q=80', is_main: true, sort_order: 0 },
    ],
    offers: [
      { storeSlug: 'shopee', affiliate_url: 'https://shopee.com.br/product-1', price: 39.90, price_mode: 'preco_sincronizado', is_active: true, sync_enabled: true, sync_status: 'synced' },
      { storeSlug: 'amazon', affiliate_url: 'https://amazon.com.br/product-1', price_mode: 'ver_preco_na_loja', is_active: true, sync_enabled: false },
      { storeSlug: 'shein', affiliate_url: 'https://shein.com/product-1', price_mode: 'ver_preco_na_loja', is_active: true, sync_enabled: false },
    ]
  },
  {
    title: 'Tênis Branco Casual',
    slug: 'tenis-branco-casual',
    description: 'Tênis clássico casual em couro sintético. Minimalista e combina com qualquer look.',
    categorySlug: 'tenis',
    is_active: true,
    is_featured: false,
    tagSlugs: ['achado-barato'],
    images: [
      { image_url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=500&q=80', is_main: true, sort_order: 0 },
    ],
    offers: [
      { storeSlug: 'shopee', affiliate_url: 'https://shopee.com.br/product-2', price_mode: 'ver_preco_na_loja', is_active: true, sync_enabled: false },
      { storeSlug: 'amazon', affiliate_url: 'https://amazon.com.br/product-2', price_mode: 'ver_preco_na_loja', is_active: true, sync_enabled: false },
    ]
  },
  {
    title: 'Conjunto Coração Dourado',
    slug: 'conjunto-coracao-dourado',
    description: 'Conjunto de colar e brincos com pingente coração dourado. Delicado e sofisticado.',
    categorySlug: 'acessorios',
    is_active: true,
    is_featured: true,
    tagSlugs: ['favorito'],
    images: [
      { image_url: 'https://images.unsplash.com/photo-1515562141589-67f0d569b6c6?auto=format&fit=crop&w=500&q=80', is_main: true, sort_order: 0 },
    ],
    offers: [
      { storeSlug: 'shopee', affiliate_url: 'https://shopee.com.br/product-3', price: 69.90, price_mode: 'preco_sincronizado', is_active: true, sync_enabled: true },
      { storeSlug: 'amazon', affiliate_url: 'https://amazon.com.br/product-3', price_mode: 'ver_preco_na_loja', is_active: true, sync_enabled: false },
    ]
  },
  {
    title: 'Perfume La Vie Est Belle 50ml',
    slug: 'perfume-la-vie-est-belle',
    description: 'Fragrância feminina floral com notas de íris, patchouli e baunilha. Sofisticado e marcante.',
    categorySlug: 'perfumes',
    is_active: true,
    is_featured: true,
    tagSlugs: [],
    images: [
      { image_url: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=500&q=80', is_main: true, sort_order: 0 },
    ],
    offers: [
      { storeSlug: 'amazon', affiliate_url: 'https://amazon.com.br/product-4', price_mode: 'ver_preco_na_loja', is_active: true, sync_enabled: false },
      { storeSlug: 'shopee', affiliate_url: 'https://shopee.com.br/product-4', price_mode: 'ver_preco_na_loja', is_active: true, sync_enabled: false },
    ]
  },
  {
    title: 'Bolsa Shoulder Bege',
    slug: 'bolsa-shoulder-bege',
    description: 'Bolsa de ombro em couro sintético macio com fechamento magnético e alça ajustável.',
    categorySlug: 'acessorios',
    is_active: true,
    is_featured: false,
    tagSlugs: ['achado-barato'],
    images: [
      { image_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=500&q=80', is_main: true, sort_order: 0 },
    ],
    offers: [
      { storeSlug: 'shopee', affiliate_url: 'https://shopee.com.br/product-5', price_mode: 'ver_preco_na_loja', is_active: true, sync_enabled: false },
      { storeSlug: 'shein', affiliate_url: 'https://shein.com/product-5', price_mode: 'ver_preco_na_loja', is_active: true, sync_enabled: false },
    ]
  },
  {
    title: 'Paleta de Sombras Nude',
    slug: 'paleta-sombras-nude',
    description: 'Paleta de 12 tons nude e terrosos, com texturas mate e cintilantes de alta pigmentação.',
    categorySlug: 'beleza',
    is_active: true,
    is_featured: true,
    tagSlugs: [],
    images: [
      { image_url: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=500&q=80', is_main: true, sort_order: 0 },
    ],
    offers: [
      { storeSlug: 'shopee', affiliate_url: 'https://shopee.com.br/product-6', price_mode: 'ver_preco_na_loja', is_active: true, sync_enabled: false },
      { storeSlug: 'amazon', affiliate_url: 'https://amazon.com.br/product-6', price_mode: 'ver_preco_na_loja', is_active: true, sync_enabled: false },
    ]
  }
];

async function seed() {
  try {
    console.log('Inserting categories...');
    const { error: catError } = await supabase.from('categories').upsert(categories);
    if (catError) throw new Error('Categories insert failed: ' + catError.message);
    console.log('✅ Categories seeded successfully.');

    console.log('Inserting stores...');
    const { error: storeError } = await supabase.from('stores').upsert(stores);
    if (storeError) throw new Error('Stores insert failed: ' + storeError.message);
    console.log('✅ Stores seeded successfully.');

    console.log('Inserting tags...');
    const { error: tagError } = await supabase.from('tags').upsert(tags);
    if (tagError) throw new Error('Tags insert failed: ' + tagError.message);
    console.log('✅ Tags seeded successfully.');

    console.log('Inserting products, images, and offers...');
    for (const rawProd of rawProducts) {
      const cat = getCategoryBySlug(rawProd.categorySlug);
      if (!cat) continue;

      const product_id = crypto.randomUUID();

      const productRow = {
        id: product_id,
        title: rawProd.title,
        slug: rawProd.slug,
        description: rawProd.description,
        category_id: cat.id,
        is_active: rawProd.is_active,
        is_featured: rawProd.is_featured,
      };

      const { error: prodError } = await supabase.from('products').insert(productRow);
      if (prodError) {
        console.error(`Failed to insert product ${rawProd.title}:`, prodError.message);
        continue;
      }

      // Images
      const imageRows = rawProd.images.map(img => ({
        id: crypto.randomUUID(),
        product_id,
        image_url: img.image_url,
        is_main: img.is_main,
        sort_order: img.sort_order,
      }));
      const { error: imgError } = await supabase.from('product_images').insert(imageRows);
      if (imgError) console.error(`Failed to insert images for ${rawProd.title}:`, imgError.message);

      // Offers
      const offerRows = rawProd.offers.map(off => {
        const store = getStoreBySlug(off.storeSlug);
        if (!store) return null;
        return {
          id: crypto.randomUUID(),
          product_id,
          store_id: store.id,
          affiliate_url: off.affiliate_url,
          price: off.price || null,
          price_mode: off.price_mode,
          is_active: off.is_active,
          sync_enabled: off.sync_enabled || false,
          sync_status: off.sync_status || 'not_synced',
          last_synced_at: off.sync_status === 'synced' ? new Date().toISOString() : null,
        };
      }).filter(Boolean);

      if (offerRows.length > 0) {
        const { error: offError } = await supabase.from('product_offers').insert(offerRows);
        if (offError) console.error(`Failed to insert offers for ${rawProd.title}:`, offError.message);
      }

      // Tags
      if (rawProd.tagSlugs && rawProd.tagSlugs.length > 0) {
        const tagRows = rawProd.tagSlugs.map(slug => {
          const tagObj = getTagBySlug(slug);
          if (!tagObj) return null;
          return {
            product_id,
            tag_id: tagObj.id
          };
        }).filter(Boolean);

        if (tagRows.length > 0) {
          const { error: ptError } = await supabase.from('product_tags').insert(tagRows);
          if (ptError) console.error(`Failed to insert product tags for ${rawProd.title}:`, ptError.message);
        }
      }

      console.log(`✅ Product seeded: "${rawProd.title}"`);
    }

    console.log('\n🎉 ALL DONE! Supabase seeded successfully with premium mock data!');
  } catch (err) {
    console.error('Fatal Seeding Error:', err.message);
    console.log('Hint: Make sure you run the schema.sql in Supabase SQL editor before running this script.');
  }
}

seed();
