/**
 * Shopee Price Synchronization Service & Normalizer
 * 
 * This service implements the normalizers for displaying synchronized prices, 
 * labels, and simulated synchronization workflows. It also serves as a robust 
 * architecture placeholder for future live Shopee OpenAPI integrations.
 */

import { ProductOffer, ProductWithDetails, Store } from '../../types';
import { isSimulationMode } from '../supabase/config';

// Supported price modes
export type NormalizedPriceMode = 'synced_price' | 'see_price_on_store' | 'unavailable';

/**
 * Normalizes any variations of price mode strings (handles both Portuguese schema defaults and English requirements)
 */
type OfferLike = Partial<ProductOffer>;

export const getOfferPriceMode = (offer: OfferLike | null | undefined): NormalizedPriceMode => {
  if (!offer) return 'see_price_on_store';
  const mode = (offer.price_mode || '').toLowerCase();
  
  if (mode === 'synced_price' || mode === 'preco_sincronizado') {
    return 'synced_price';
  }
  if (mode === 'unavailable' || mode === 'preco_indisponivel') {
    return 'unavailable';
  }
  return 'see_price_on_store';
};

/**
 * Normalizes the formatted display price text for a product offer.
 * 
 * Rules:
 * - For Shopee: Show "R$ XX,XX" if sync_enabled = true, mode is synced_price and price is valid.
 * - Otherwise, show "Ver preço na loja".
 * - If unavailable, show "Indisponível".
 */
export const getOfferDisplayPrice = (offer: OfferLike | null | undefined, store: Store): string => {
  if (!offer || !store) return 'Ver preço na loja';
  
  const mode = getOfferPriceMode(offer);
  
  if (mode === 'unavailable') {
    return 'Indisponível';
  }

  const isShopee = store.slug.toLowerCase() === 'shopee';
  
  if (isShopee && offer.sync_enabled && mode === 'synced_price' && offer.price !== null && offer.price !== undefined) {
    return `R$ ${Number(offer.price).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return 'Ver preço na loja';
};

/**
 * Normalizes the helper synchronization label underneath price displays.
 * 
 * Rules:
 * - If Shopee, sync_enabled = true, and price is synchronized: show sync date or "Atualizado recentemente".
 * - If Shopee and sync failed or sync is enabled but no price is loaded yet: show "Ver preço na loja" fallback.
 */
export const getOfferSyncLabel = (offer: OfferLike | null | undefined, store: Store): string => {
  if (!offer || !store) return '';
  
  const isShopee = store.slug.toLowerCase() === 'shopee';
  if (!isShopee || !offer.sync_enabled) {
    return 'Preço sujeito a alterações';
  }

  const mode = getOfferPriceMode(offer);
  if (mode !== 'synced_price') {
    return 'Consulte preço atualizado';
  }

  if (offer.sync_status === 'error') {
    return 'Falha na sincronização - Preço na loja';
  }

  if (offer.last_synced_at) {
    try {
      const d = new Date(offer.last_synced_at);
      return `Atualizado em ${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return 'Atualizado recentemente';
    }
  }

  return 'Atualizado recentemente';
};

/**
 * --------------------------------------------------------------------------------
 * FUTURE SHOPEE REAL API INTEGRATION BLUEPRINT
 * --------------------------------------------------------------------------------
 * 
 * To connect the real Shopee OpenAPI platform in the future, follow these steps:
 * 
 * 1. API CREDENTIALS SETUP:
 *    Add the following variables to your `.env.production` / `.env.local` files:
 *    - `SHOPEE_PARTNER_ID`: Your Shopee open platform partner identifier.
 *    - `SHOPEE_PARTNER_KEY`: Your secret HMAC SHA256 signature key.
 *    - `SHOPEE_APP_ID`: Your registered Shopee app ID.
 * 
 * 2. ENDPOINT & SIGNATURE:
 *    Shopee requires building a query signature for every request:
 *    - Request URL: `https://open-api.affiliate.shopee.com.br/api/v2/get_item_detail`
 *    - Payload Signature: `HMAC-SHA256(partner_key, api_path + timestamp + partner_id + access_token)`
 * 
 * 3. RESPONSE HANDLING:
 *    Parse the returned JSON to extract the current promotional price:
 *    - Current Price Path: `response.data.item.price` or `response.data.item.discount_price`
 *    - Stock Availability Path: `response.data.item.stock` (set mode to 'unavailable' if <= 0)
 * --------------------------------------------------------------------------------
 */

/**
 * Simulates the price synchronization query for a single Shopee offer.
 * Updates local localStorage state if in simulated mode.
 */
export const syncShopeeOfferPrice = async (offerId: string): Promise<{ success: boolean; price?: number; last_synced_at?: string; error?: string }> => {
  console.log(`[SHOPEE SYNC TRIGGER] Refreshing price for offer: ${offerId}`);

  // Simulating network latency (500ms)
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Simulation Mode logic
  if (typeof window !== 'undefined' && isSimulationMode()) {
    const rawProducts = localStorage.getItem('achadinhos_products');
    if (rawProducts) {
      try {
        const products = JSON.parse(rawProducts) as ProductWithDetails[];
        let foundOffer: ProductOffer | null = null;

        for (const p of products) {
          const off = p.offers.find((o) => o.id === offerId);
          if (off) {
            foundOffer = off;
            break;
          }
        }

        if (!foundOffer) {
          return { success: false, error: 'Oferta não encontrada no catálogo.' };
        }

        // Simulate a real price query fallback with realistic fluctuations (around R$ 19,90 - R$ 199,00)
        // Check if external_product_id or link is present
        const hasProductId = !!foundOffer.external_product_id;
        
        if (!hasProductId) {
          // Keep see_price_on_store if no sync key is defined
          foundOffer.sync_status = 'error';
          foundOffer.last_synced_at = new Date().toISOString();
          localStorage.setItem('achadinhos_products', JSON.stringify(products));
          return { success: false, error: 'ID do Produto Shopee não configurado.' };
        }

        // Generate a simulated stable price with minor random change
        const currentPrice = foundOffer.price || 49.90;
        const delta = (Math.random() - 0.5) * 5; // +/- R$ 2.50 fluctuation
        const newPrice = Math.max(9.90, Math.round((currentPrice + delta) * 100) / 100);

        // Update fields
        foundOffer.price = newPrice;
        foundOffer.price_mode = 'preco_sincronizado'; // set to synced
        foundOffer.sync_status = 'synced';
        foundOffer.last_synced_at = new Date().toISOString();

        localStorage.setItem('achadinhos_products', JSON.stringify(products));
        return { 
          success: true, 
          price: newPrice, 
          last_synced_at: foundOffer.last_synced_at 
        };

      } catch {
        return { success: false, error: 'Falha ao processar banco local.' };
      }
    }
  }

  return {
    success: false,
    error: 'Sincronização Shopee real ainda não está habilitada fora do modo de desenvolvimento.',
  };
};

/**
 * Simulates price synchronization queries across all active Shopee offers.
 */
export const syncAllShopeeOffers = async (): Promise<{ totalCount: number; successCount: number }> => {
  console.log('[SHOPEE SYNC ALL] Triggered sync sweep across all catalog offers.');
  
  let totalCount = 0;
  let successCount = 0;

  if (typeof window !== 'undefined' && isSimulationMode()) {
    const rawProducts = localStorage.getItem('achadinhos_products');
    if (rawProducts) {
      try {
        const products = JSON.parse(rawProducts) as ProductWithDetails[];
        
        for (const p of products) {
          for (const offer of p.offers) {
            const isShopee = offer.store.slug.toLowerCase() === 'shopee';
            if (isShopee && offer.sync_enabled && offer.is_active) {
              totalCount++;
              
              // Simulate individual sync details
              const hasId = !!offer.external_product_id;
              if (hasId) {
                const currentPrice = offer.price || 49.90;
                const delta = (Math.random() - 0.5) * 5;
                offer.price = Math.max(9.90, Math.round((currentPrice + delta) * 100) / 100);
                offer.price_mode = 'preco_sincronizado';
                offer.sync_status = 'synced';
                offer.last_synced_at = new Date().toISOString();
                successCount++;
              } else {
                offer.sync_status = 'error';
                offer.last_synced_at = new Date().toISOString();
              }
            }
          }
        }
        
        localStorage.setItem('achadinhos_products', JSON.stringify(products));
      } catch (error) {
        console.error('Error batch syncing Shopee offers locally:', error);
      }
    }
  }

  return { totalCount, successCount };
};
