import { API_CONFIG, delay } from './client';
import { Product } from '../types/product';
import { MOCK_PRODUCTS } from '../mocks/products';

export const productApi = {
  /**
   * Lấy danh sách sản phẩm
   */
  async getProducts(params?: { category?: string; search?: string }): Promise<Product[]> {
    if (API_CONFIG.useMock) {
      await delay(250);
      let list = [...MOCK_PRODUCTS];
      if (params?.category && params.category !== 'all') {
        list = list.filter((p) => p.category === params.category);
      }
      if (params?.search) {
        const q = params.search.toLowerCase().trim();
        list = list.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.subtitle.toLowerCase().includes(q)
        );
      }
      return list;
    }

    const res = await fetch(`${API_CONFIG.baseUrl}/products`);
    if (!res.ok) throw new Error('Không thể tải danh sách sản phẩm');
    return res.json();
  },

  /**
   * Lấy chi tiết sản phẩm theo ID hoặc SKU
   */
  async getProductById(idOrSku: string): Promise<Product | null> {
    if (API_CONFIG.useMock) {
      await delay(200);
      const product = MOCK_PRODUCTS.find(
        (p) => p.id === idOrSku || p.sku.toLowerCase() === idOrSku.toLowerCase()
      );
      return product || null;
    }

    const res = await fetch(`${API_CONFIG.baseUrl}/products/${idOrSku}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error('Không thể tải thông tin sản phẩm');
    }
    return res.json();
  },

  /**
   * Lấy sản phẩm nổi bật (Featured) cho trang chủ
   */
  async getFeaturedProducts(): Promise<Product[]> {
    if (API_CONFIG.useMock) {
      await delay(200);
      return MOCK_PRODUCTS.filter((p) => p.category === 'box');
    }

    const res = await fetch(`${API_CONFIG.baseUrl}/products?featured=true`);
    if (!res.ok) throw new Error('Không thể tải sản phẩm nổi bật');
    return res.json();
  }
};
