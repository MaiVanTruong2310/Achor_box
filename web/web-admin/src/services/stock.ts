import type { Product, ProductVariant } from '../types/database';

/**
 * One stock rule for every admin screen, matching the backend dashboard query
 * (active SKUs with stock_quantity <= 5 are "cảnh báo tồn kho").
 *   0       -> hết hàng
 *   1..5    -> sắp hết
 *   > 5     -> còn hàng
 */
export const LOW_STOCK_THRESHOLD = 5;

export type StockLevel = 'out_of_stock' | 'low_stock' | 'in_stock';

const isActive = (v: ProductVariant) => (v as ProductVariant & { is_active?: boolean }).is_active !== false;

/** Sellable units: products with variants are tracked per SKU, legacy products by their own stock. */
function skuStocks(product: Product): number[] {
  const variants = (product.variants || []).filter(isActive);
  return variants.length ? variants.map((v) => v.stock_quantity || 0) : [product.stock_quantity ?? 0];
}

export function stockLevel(quantity: number): StockLevel {
  if (quantity <= 0) return 'out_of_stock';
  if (quantity <= LOW_STOCK_THRESHOLD) return 'low_stock';
  return 'in_stock';
}

export function productTotalStock(product: Product): number {
  return skuStocks(product).reduce((sum, n) => sum + n, 0);
}

/** A product is out of stock when nothing is sellable, and "sắp hết" when any SKU needs restocking. */
export function productStockLevel(product: Product): StockLevel {
  const stocks = skuStocks(product);
  if (stocks.every((n) => n <= 0)) return 'out_of_stock';
  if (stocks.some((n) => n <= LOW_STOCK_THRESHOLD)) return 'low_stock';
  return 'in_stock';
}

export const stockLevelLabel: Record<StockLevel, string> = {
  out_of_stock: 'Hết hàng',
  low_stock: 'Sắp hết',
  in_stock: 'Còn hàng',
};

/** SKU counts behind the "Cảnh báo tồn kho" KPI. */
export function stockAlerts(products: Product[]) {
  let out = 0;
  let low = 0;
  for (const product of products) {
    for (const quantity of skuStocks(product)) {
      const level = stockLevel(quantity);
      if (level === 'out_of_stock') out++;
      else if (level === 'low_stock') low++;
    }
  }
  return { out, low, total: out + low };
}

/** Same split for the dashboard list, which already holds only SKUs at or below the threshold. */
export function splitAlertRows(rows: { stock?: number | null }[] = []) {
  const out = rows.filter((r) => (r.stock ?? 0) <= 0).length;
  return { out, low: rows.length - out, total: rows.length };
}
