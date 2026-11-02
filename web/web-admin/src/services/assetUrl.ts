const shopOrigin = (import.meta.env.VITE_SHOP_URL || 'http://localhost:5174').replace(/\/+$/, '');

/** Catalog images may be stored as storefront-relative paths (/products/x.svg); resolve them against the shop. */
export function assetUrl(src?: string | null): string {
  if (!src) return '';
  if (/^(https?:|data:|blob:)/i.test(src)) return src;
  return `${shopOrigin}${src.startsWith('/') ? '' : '/'}${src}`;
}
