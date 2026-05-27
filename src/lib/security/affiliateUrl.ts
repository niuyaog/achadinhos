import { Store } from '@/types';

const DEFAULT_ALLOWED_DOMAINS: Record<string, string> = {
  shopee: 'shopee.com.br',
  amazon: 'amazon.com.br',
  shein: 'shein.com',
};

export const normalizeAllowedDomain = (domain?: string | null) => {
  return (domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
};

export const getDefaultAllowedDomainForStore = (storeSlug?: string | null) => {
  if (!storeSlug) return null;
  return DEFAULT_ALLOWED_DOMAINS[storeSlug.toLowerCase()] || null;
};

export const withDefaultAllowedDomain = <T extends Pick<Store, 'slug' | 'allowed_domain'>>(store: T): T => {
  return {
    ...store,
    allowed_domain: normalizeAllowedDomain(store.allowed_domain) || getDefaultAllowedDomainForStore(store.slug),
  };
};

export const isAllowedAffiliateUrl = (url: string, allowedDomain?: string | null) => {
  try {
    const parsedUrl = new URL(url);
    if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
      return false;
    }

    const normalizedAllowedDomain = normalizeAllowedDomain(allowedDomain);
    if (!normalizedAllowedDomain) {
      return false;
    }

    const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');

    return hostname === normalizedAllowedDomain || hostname.endsWith(`.${normalizedAllowedDomain}`);
  } catch {
    return false;
  }
};

export const getAffiliateUrlValidationError = (url: string, store: Pick<Store, 'name' | 'allowed_domain'>) => {
  if (!store.allowed_domain) {
    return `A loja ${store.name} precisa ter um domínio permitido antes de receber ofertas.`;
  }

  if (!isAllowedAffiliateUrl(url, store.allowed_domain)) {
    return `O link afiliado precisa ser http/https e pertencer ao domínio permitido: ${store.allowed_domain}.`;
  }

  return null;
};
