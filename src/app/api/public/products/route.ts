import { NextResponse } from 'next/server';
import { getProducts, stripPrivateOfferFields } from '@/lib/supabase/dataManager';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json([], { status: 503 });
    }
    
    // getProducts will run on the server and fetch from Supabase
    const products = await getProducts();
    
    // Strip sensitive fields (affiliate_url, external_product_id, etc.)
    const publicProducts = products.map(stripPrivateOfferFields);
    
    return NextResponse.json(publicProducts);
  } catch (err) {
    console.error('API /public/products error:', err);
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
  }
}
