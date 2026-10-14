import { Product } from '../types/product';
import { customerRequest } from './customerClient';
async function catalog(): Promise<Product[]> {
  const rows = await customerRequest<any[]>('/products', {}, false);
  return rows.filter(p => p.isActive).flatMap(p => (p.variants || []).filter((v: any) => v.isActive).map((v: any): Product => ({
    id: v.id, variantId: v.id, parentProductId: p.id, sku: v.sku, name: `${p.name} · ${v.variantName}`, subtitle: v.variantName, description: p.description || '', price: Number(v.calculatedPrice ?? Number(p.price) + Number(v.priceDelta || 0)),
    inStock: v.stockQuantity > 0, stockQuantity: v.stockQuantity, images: v.images?.length ? v.images : p.images || [], category: 'box', tags: [],
    dimensions: { width: Number(v.widthCm || 0), height: Number(v.heightCm || 0), depth: Number(v.depthCm || 0), weight: Number(v.weightKg || 0), maxLoadWeight: Number(v.maxLoadKg || 0) }, features: [{ title: (v.hasWeightSensor ?? p.hasWeightSensor) ? 'Có cảm biến trọng lượng' : 'Không có cảm biến trọng lượng', description: 'Theo cấu hình phiên bản thiết bị' }], specs: [...(v.size ? [{ name: 'Kích cỡ', value: v.size }] : []), ...(v.capacityLiter ? [{ name: 'Dung tích', value: `${v.capacityLiter} L` }] : []), ...(v.modelTier ? [{ name: 'Phiên bản', value: v.modelTier }] : [])], boxIncludes: [], warrantyMonths: Number(v.warrantyMonths || 0)
  })));
}
export const productApi = {
  async getProducts(params?: { category?: string; search?: string }): Promise<Product[]> { const rows = await catalog(); const q = params?.search?.toLowerCase() || ''; return rows.filter(p => (params?.category == null || params.category === 'all' || p.category === params.category) && `${p.name} ${p.sku}`.toLowerCase().includes(q)); },
  async getProductById(id: string): Promise<Product | null> { return (await catalog()).find(p => p.id === id || p.sku === id) || null; },
  async getFeaturedProducts(): Promise<Product[]> { return (await catalog()).slice(0, 4); }
};
