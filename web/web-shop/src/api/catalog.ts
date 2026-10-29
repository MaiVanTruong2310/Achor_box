import type { CatalogProduct, Variant } from './shop';
export function modelOf(product: CatalogProduct): 'BASE' | 'PRO' | undefined {
  const models = [...new Set(product.variants?.filter(v => v.isActive).map(v => v.modelTier).filter(Boolean))];
  return models.length === 1 && (models[0] === 'BASE' || models[0] === 'PRO') ? models[0] : undefined;
}
export function availableVariant(product?: CatalogProduct, selected = ''): Variant | undefined {
  const variants = product?.variants || [];
  return variants.find(v => v.id === selected && v.isActive) || variants.find(v => v.isActive && v.stockQuantity > 0) || variants.find(v => v.isActive);
}
export const canBuy = (variant?: Variant) => !!variant && variant.isActive && variant.stockQuantity > 0 && variant.finalPrice != null && variant.finalPrice >= 0;
