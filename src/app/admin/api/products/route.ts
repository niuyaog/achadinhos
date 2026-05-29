import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAccessToken } from '@/lib/supabase/adminAuth';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { ADMIN_ACCESS_TOKEN_COOKIE } from '@/lib/supabase/session';
import { isAllowedAffiliateUrl, normalizeAllowedDomain, getDefaultAllowedDomainForStore } from '@/lib/security/affiliateUrl';

export const dynamic = 'force-dynamic';

/**
 * Server-side product save endpoint.
 * Uses the service role key to bypass RLS for admin operations.
 * Validates admin session via httpOnly cookie before proceeding.
 */
export async function POST(request: NextRequest) {
  // 1. Validate admin session from cookie
  const token = request.cookies.get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  const validation = await validateAdminAccessToken(token);

  if (!validation.ok) {
    return NextResponse.json(
      { error: 'Sessão administrativa inválida. Faça login novamente.', code: validation.reason },
      { status: 401 }
    );
  }

  // 2. Parse the request body
  let body: {
    id?: string;
    title: string;
    slug: string;
    description?: string | null;
    category_id?: string | null;
    is_active?: boolean;
    is_featured?: boolean;
    images?: Array<{
      image_url: string;
      is_main: boolean;
      sort_order: number;
    }>;
    offers?: Array<{
      store_id: string;
      affiliate_url: string;
      external_product_id?: string | null;
      price?: number | null;
      price_mode?: string;
      is_active?: boolean;
      sync_enabled?: boolean;
      sync_status?: string;
      last_synced_at?: string | null;
    }>;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  }

  if (!body.title || !body.slug) {
    return NextResponse.json({ error: 'Título e slug são obrigatórios.' }, { status: 400 });
  }

  const adminSupabase = createSupabaseAdminClient();

  try {
    // 3. Validate affiliate URLs against store domains
    if (body.offers && body.offers.length > 0) {
      // Fetch stores to validate domains
      const storeIds = [...new Set(body.offers.map(o => o.store_id))];
      const { data: stores, error: storesError } = await adminSupabase
        .from('stores')
        .select('id, name, slug, allowed_domain')
        .in('id', storeIds);

      if (storesError) {
        return NextResponse.json(
          { error: `Erro ao buscar lojas: ${storesError.message}` },
          { status: 500 }
        );
      }

      const storeMap = new Map((stores || []).map(s => [s.id, s]));

      for (const offer of body.offers) {
        const store = storeMap.get(offer.store_id);
        if (!store) {
          return NextResponse.json(
            { error: `Loja com ID "${offer.store_id}" não encontrada.` },
            { status: 400 }
          );
        }

        if (offer.affiliate_url) {
          const domain = normalizeAllowedDomain(store.allowed_domain) || getDefaultAllowedDomainForStore(store.slug);
          if (!isAllowedAffiliateUrl(offer.affiliate_url, domain)) {
            return NextResponse.json(
              { error: `Link afiliado inválido para "${store.name}": a URL precisa pertencer ao domínio ${domain}.` },
              { status: 400 }
            );
          }
        }
      }
    }

    // 4. Upsert the product record
    const productPayload = {
      ...(body.id ? { id: body.id } : {}),
      title: body.title,
      slug: body.slug,
      description: body.description || null,
      category_id: body.category_id || null,
      is_active: body.is_active !== undefined ? body.is_active : true,
      is_featured: body.is_featured !== undefined ? body.is_featured : false,
      updated_at: new Date().toISOString(),
    };

    const { data: savedProduct, error: productError } = await adminSupabase
      .from('products')
      .upsert(productPayload)
      .select()
      .single();

    if (productError) {
      console.error('[admin/api/products] Product upsert failed:', productError);
      return NextResponse.json(
        { error: `Erro ao salvar produto: ${productError.message}` },
        { status: 500 }
      );
    }

    const productId = savedProduct.id;

    // 5. Sync images — delete existing and re-insert
    if (body.images && body.images.length > 0) {
      const { error: imgDeleteError } = await adminSupabase
        .from('product_images')
        .delete()
        .eq('product_id', productId);

      if (imgDeleteError) {
        console.error('[admin/api/products] product_images DELETE failed:', imgDeleteError);
        return NextResponse.json(
          { error: `Erro ao limpar imagens antigas: ${imgDeleteError.message}` },
          { status: 500 }
        );
      }

      const imageRows = body.images.map((img, idx) => ({
        product_id: productId,
        image_url: img.image_url,
        is_main: img.is_main || false,
        sort_order: img.sort_order ?? idx,
      }));

      const { error: imgInsertError } = await adminSupabase
        .from('product_images')
        .insert(imageRows);

      if (imgInsertError) {
        console.error('[admin/api/products] product_images INSERT failed:', imgInsertError);
        return NextResponse.json(
          { error: `Erro ao salvar imagens: ${imgInsertError.message}` },
          { status: 500 }
        );
      }
    }

    // 6. Sync offers — always delete existing, then re-insert confirmed offers
    if (body.offers !== undefined) {
      // First, get the IDs of existing offers so we can nullify FK references in clicks
      const { data: existingOffers } = await adminSupabase
        .from('product_offers')
        .select('id')
        .eq('product_id', productId);

      if (existingOffers && existingOffers.length > 0) {
        const existingOfferIds = existingOffers.map(o => o.id);

        // Nullify offer_id in clicks table to avoid FK constraint violation.
        // This preserves the click records (product_id, store_id remain intact).
        const { error: clicksUpdateError } = await adminSupabase
          .from('clicks')
          .update({ offer_id: null })
          .in('offer_id', existingOfferIds);

        if (clicksUpdateError) {
          console.error('[admin/api/products] clicks offer_id nullify failed:', clicksUpdateError);
          return NextResponse.json(
            { error: `Erro ao desvincular cliques das ofertas antigas: ${clicksUpdateError.message}` },
            { status: 500 }
          );
        }
      }

      // Now safely delete old offers for this product
      const { error: offDeleteError } = await adminSupabase
        .from('product_offers')
        .delete()
        .eq('product_id', productId);

      if (offDeleteError) {
        console.error('[admin/api/products] product_offers DELETE failed:', offDeleteError);
        return NextResponse.json(
          { error: `Erro ao limpar ofertas antigas: ${offDeleteError.message}` },
          { status: 500 }
        );
      }

      if (body.offers.length > 0) {
        // Deduplicate by store_id — last one wins
        const deduplicatedOffers = Object.values(
          body.offers.reduce((acc, current) => {
            acc[current.store_id] = current;
            return acc;
          }, {} as Record<string, typeof body.offers[0]>)
        );

        const offerRows = deduplicatedOffers.map((off) => ({
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

        const { error: offInsertError } = await adminSupabase
          .from('product_offers')
          .insert(offerRows);

        if (offInsertError) {
          console.error('[admin/api/products] product_offers INSERT failed:', offInsertError);
          return NextResponse.json(
            { error: `Erro ao salvar ofertas: ${offInsertError.message}` },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({ id: productId, success: true });
  } catch (err) {
    console.error('[admin/api/products] Unexpected error:', err);
    const message = err instanceof Error ? err.message : 'Erro inesperado ao salvar produto.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
