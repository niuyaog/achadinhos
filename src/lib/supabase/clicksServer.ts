import 'server-only';

import { createSupabaseAdminClient } from './server';

type AffiliateClickPayload = {
  productId: string;
  offerId: string;
  storeId: string;
  categoryId?: string | null;
  source?: string | null;
  referrer?: string | null;
  device?: string | null;
};

export const registerAffiliateClickServer = async ({
  productId,
  offerId,
  storeId,
  categoryId = null,
  source = null,
  referrer = null,
  device = null,
}: AffiliateClickPayload): Promise<boolean> => {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.from('clicks').insert({
    product_id: productId,
    offer_id: offerId,
    store_id: storeId,
    category_id: categoryId,
    source,
    referrer,
    device,
  });

  if (error) {
    console.error('Error logging affiliate click with service role:', error);
    return false;
  }

  return true;
};
