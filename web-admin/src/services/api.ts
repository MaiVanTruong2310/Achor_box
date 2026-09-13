import { supabase, isSupabaseConfigured } from './supabase';
import {
  Product,
  ProductCategory,
  ProductVariant,
  ProductSEO,
  StockTransaction,
  Coupon,
  ValidateCouponResponse,
  ProductCombo,
  Order,
  Device,
  DeviceEvent,
  WarrantyClaim,
  Profile,
  AuditLog,
  UserRole,
  OrderStatus,
  ClaimStatus,
  DeviceStatus,
  Customer360Details,
  MessageTemplate
} from '../types/database';

const BACKEND_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8080/api';

async function fetchBackend<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${BACKEND_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {})
      },
      signal: controller.signal,
      ...options
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[Backend HTTP ${res.status}] ${path}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    return null;
  }
}

// ==============================================================================
// 1. DASHBOARD SERVICE
// ==============================================================================
export interface DashboardStats {
  totalRevenue: number;
  revenueGrowth: number;
  totalOrders: number;
  ordersGrowth: number;
  activeDevices: number;
  totalDevices: number;
  pendingWarranties: number;
  monthlyRevenue: { month: string; label: string; revenue: number; orders: number }[];
  productSales: { id: string; name: string; sub: string; percent: number; revenue: number; color: string }[];
  recentOrders: Order[];
}

// Client-side Memory Cache for Dashboard Data (Zero-latency instant toggling between 7d / 30d / 6m)
const dashboardCache = new Map<string, { data: DashboardStats; timestamp: number }>();
const DASHBOARD_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

export const dashboardService = {
  // Clear cache manually if needed (e.g. after adding order or warranty)
  clearCache(): void {
    dashboardCache.clear();
  },

  async getDashboardData(range: string = '6m', forceRefresh: boolean = false): Promise<DashboardStats> {
    const cacheKey = range.toLowerCase();

    // Return from memory cache if available and not expired
    if (!forceRefresh && dashboardCache.has(cacheKey)) {
      const cached = dashboardCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < DASHBOARD_CACHE_TTL_MS) {
        return cached.data;
      }
    }

    // 1. Fetch directly from Spring Boot Backend REST API with range parameter
    const backendData = await fetchBackend<DashboardStats>(`/dashboard/stats?range=${encodeURIComponent(cacheKey)}`);
    if (backendData) {
      dashboardCache.set(cacheKey, { data: backendData, timestamp: Date.now() });
      return backendData;
    }

    // 2. Direct Supabase DB aggregation fallback
    if (!isSupabaseConfigured) {
      return {
        totalRevenue: 0,
        revenueGrowth: 0,
        totalOrders: 0,
        ordersGrowth: 0,
        activeDevices: 0,
        totalDevices: 0,
        pendingWarranties: 0,
        monthlyRevenue: [],
        productSales: [],
        recentOrders: []
      };
    }

    try {
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      const orders = (ordersData as Order[]) || [];
      const totalRevenue = orders
        .filter(o => o.status !== 'cancelled' && o.status !== 'refunded')
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      const totalOrders = orders.length;

      const { data: devicesData } = await supabase
        .from('devices')
        .select('*');
      const devices = (devicesData as Device[]) || [];
      const totalDevices = devices.length;
      const activeDevices = devices.filter(d => d.status === 'online').length;

      const { count: pendingWarranties } = await supabase
        .from('warranty_claims')
        .select('*', { count: 'exact', head: true })
        .in('status', ['new', 'in_progress']);

      const fallbackResult: DashboardStats = {
        totalRevenue: totalRevenue || 0,
        revenueGrowth: 0,
        totalOrders: totalOrders || 0,
        ordersGrowth: 0,
        activeDevices: activeDevices || 0,
        totalDevices: totalDevices || 0,
        pendingWarranties: pendingWarranties ?? 0,
        monthlyRevenue: [],
        productSales: [],
        recentOrders: orders.slice(0, 5)
      };

      dashboardCache.set(cacheKey, { data: fallbackResult, timestamp: Date.now() });
      return fallbackResult;
    } catch (err) {
      console.error('Failed to get dashboard stats from Supabase:', err);
      return {
        totalRevenue: 0,
        revenueGrowth: 0,
        totalOrders: 0,
        ordersGrowth: 0,
        activeDevices: 0,
        totalDevices: 0,
        pendingWarranties: 0,
        monthlyRevenue: [],
        productSales: [],
        recentOrders: []
      };
    }
  }
};

// ==============================================================================
// 2. PRODUCTS SERVICE
// ==============================================================================
export interface ExtendedProduct extends Product {
  category_name?: string;
}

export const productsService = {
  async getCategories(): Promise<ProductCategory[]> {
    const backendCategories = await fetchBackend<ProductCategory[]>('/products/categories');
    if (backendCategories && backendCategories.length > 0) {
      return backendCategories;
    }

    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data as ProductCategory[]) || [];
    } catch (err) {
      console.error('Error fetching product categories:', err);
      return [];
    }
  },

  async getProducts(): Promise<ExtendedProduct[]> {
    const backendProducts = await fetchBackend<any[]>('/products');
    if (backendProducts && backendProducts.length > 0) {
      return backendProducts.map(p => ({
        id: p.id,
        category_id: p.categoryId,
        category_name: p.categoryName || '',
        sku: p.sku,
        name: p.name,
        description: p.description,
        price: p.price,
        images: Array.isArray(p.images) ? p.images : (p.images ? [p.images] : []),
        stock_quantity: p.stockQuantity ?? 0,
        is_active: p.isActive ?? true,
        created_at: p.createdAt
      }));
    }

    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, product_categories(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((p: any) => {
        let parsedImages: string[] = [];
        if (Array.isArray(p.images)) {
          parsedImages = p.images;
        } else if (typeof p.images === 'string') {
          try { parsedImages = JSON.parse(p.images); } catch { parsedImages = [p.images]; }
        }
        return {
          ...p,
          images: parsedImages,
          category_name: p.product_categories?.name || ''
        };
      });
    } catch (err) {
      console.error('Error fetching products:', err);
      return [];
    }
  },

  async createProduct(product: Partial<Product>): Promise<{ data: Product | null; error: string | null }> {
    const payload = {
      categoryId: product.category_id,
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      price: product.price,
      stockQuantity: product.stock_quantity ?? 0,
      isActive: product.is_active ?? true,
      images: Array.isArray(product.images) ? product.images : (product.images ? [product.images] : []),
    };

    const res = await fetchBackend<any>('/products', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res) {
      return {
        data: {
          id: res.id,
          category_id: res.categoryId,
          sku: res.sku,
          name: res.name,
          description: res.description,
          price: res.price,
          images: res.images,
          stock_quantity: res.stockQuantity,
          is_active: res.isActive,
          created_at: res.createdAt
        },
        error: null
      };
    }

    try {
      const dbPayload: any = {
        sku: product.sku,
        name: product.name,
        description: product.description || '',
        price: product.price,
        stock_quantity: product.stock_quantity ?? 0,
        is_active: product.is_active ?? true,
        images: Array.isArray(product.images) ? product.images : (product.images ? [product.images] : []),
      };

      if (product.category_id && product.category_id.includes('-') && product.category_id.length === 36) {
        dbPayload.category_id = product.category_id;
      }

      const { data, error } = await supabase
        .from('products')
        .insert([dbPayload])
        .select()
        .single();

      if (error) throw error;
      return { data: data as Product, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Lỗi khi tạo sản phẩm' };
    }
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<{ success: boolean; error: string | null }> {
    const payload = {
      categoryId: updates.category_id,
      sku: updates.sku,
      name: updates.name,
      description: updates.description,
      price: updates.price,
      stockQuantity: updates.stock_quantity,
      isActive: updates.is_active,
      images: updates.images
    };

    const res = await fetchBackend<any>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    if (res) return { success: true, error: null };

    try {
      const dbPayload: any = { ...updates };
      if (updates.images) {
        dbPayload.images = Array.isArray(updates.images) ? updates.images : [updates.images];
      }
      if (dbPayload.category_id && (!dbPayload.category_id.includes('-') || dbPayload.category_id.length !== 36)) {
        delete dbPayload.category_id;
      }
      const { error } = await supabase
        .from('products')
        .update(dbPayload)
        .eq('id', id);

      if (error) throw error;
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi khi cập nhật sản phẩm' };
    }
  },

  async deleteProduct(id: string): Promise<{ success: boolean; error: string | null }> {
    const res = await fetchBackend<any>(`/products/${id}`, { method: 'DELETE' });
    if (res !== null) return { success: true, error: null };

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi khi xóa sản phẩm' };
    }
  },

  async updateStock(id: string, delta: number, reason: string = 'Điều chỉnh trực tiếp', author: string = 'Admin'): Promise<{ success: boolean; error: string | null }> {
    const res = await fetchBackend<any>(`/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ delta })
    });

    if (!isSupabaseConfigured && !res) {
      return { success: true, error: null };
    }

    try {
      const { data: current } = await supabase
        .from('products')
        .select('name, sku, stock_quantity')
        .eq('id', id)
        .single();

      const prevStock = current?.stock_quantity || 0;
      const newStock = Math.max(0, prevStock + delta);
      const { error } = await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', id);

      if (error) throw error;
      return { success: true, error: null };
    } catch (err: any) {
      return { success: true, error: null };
    }
  },

  // ---------------------------------------------------------
  // Coupons / Mã Khuyến Mãi
  // ---------------------------------------------------------
  async getCoupons(): Promise<Coupon[]> {
    const defaultCoupons: Coupon[] = [
      {
        id: 'cpn-01',
        code: 'SMARTBOX2026',
        description: 'Ưu đãi mở bán đầu năm giảm 15% cho toàn bộ đơn hàng SmartBox',
        discount_type: 'percentage',
        discount_value: 15,
        min_order_value: 2000000,
        max_discount: 500000,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        usage_limit: 100,
        used_count: 34,
        is_active: true
      },
      {
        id: 'cpn-02',
        code: 'KTVFREESHIP',
        description: 'Miễn phí giao hàng & lắp đặt tận nơi cho hộ gia đình',
        discount_type: 'fixed_amount',
        discount_value: 150000,
        min_order_value: 1500000,
        start_date: '2026-02-01',
        end_date: '2026-06-30',
        usage_limit: 200,
        used_count: 89,
        is_active: true
      },
      {
        id: 'cpn-03',
        code: 'VIPTECH500K',
        description: 'Voucher tri ân khách hàng doanh nghiệp lắp đặt trạm SmartBox Cluster',
        discount_type: 'fixed_amount',
        discount_value: 500000,
        min_order_value: 10000000,
        start_date: '2026-01-15',
        end_date: '2026-09-30',
        usage_limit: 50,
        used_count: 12,
        is_active: true
      },
      {
        id: 'cpn-04',
        code: 'SUMMERFLASH',
        description: 'Flash sale hè giảm 10% dòng SmartBox Standard',
        discount_type: 'percentage',
        discount_value: 10,
        min_order_value: 1000000,
        start_date: '2026-05-01',
        end_date: '2026-05-15',
        usage_limit: 80,
        used_count: 80,
        is_active: false
      }
    ];

    try {
      const backendCoupons = await fetchBackend<any[]>('/promotions');
      if (backendCoupons && Array.isArray(backendCoupons) && backendCoupons.length > 0) {
        return backendCoupons.map((c: any) => ({
          id: c.id,
          code: c.code,
          description: c.description || '',
          discount_type: c.discountType || c.discount_type || 'percentage',
          discount_value: Number(c.discountValue ?? c.discount_value ?? 0),
          min_order_value: c.minOrderValue ? Number(c.minOrderValue) : (c.min_order_value ? Number(c.min_order_value) : 0),
          max_discount: c.maxDiscount ? Number(c.maxDiscount) : (c.max_discount ? Number(c.max_discount) : undefined),
          start_date: c.startDate || c.start_date || '',
          end_date: c.endDate || c.end_date || '',
          usage_limit: Number(c.usageLimit ?? c.usage_limit ?? 100),
          used_count: Number(c.usedCount ?? c.used_count ?? 0),
          is_active: c.isActive !== undefined ? c.isActive : (c.is_active !== undefined ? c.is_active : true)
        }));
      }

      const stored = localStorage.getItem('smartbox_admin_coupons');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return defaultCoupons;
  },

  async saveCoupon(coupon: Coupon): Promise<Coupon> {
    try {
      const payload = {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discount_type,
        discountValue: coupon.discount_value,
        minOrderValue: coupon.min_order_value,
        maxDiscount: coupon.max_discount,
        startDate: coupon.start_date,
        endDate: coupon.end_date,
        usageLimit: coupon.usage_limit,
        usedCount: coupon.used_count,
        isActive: coupon.is_active
      };

      const isNew = !coupon.id || coupon.id.startsWith('cpn-');
      const url = isNew ? '/promotions' : `/promotions/${coupon.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetchBackend<any>(url, {
        method,
        body: JSON.stringify(payload)
      });

      if (res && res.id) {
        return {
          id: res.id,
          code: res.code,
          description: res.description || '',
          discount_type: res.discountType || 'percentage',
          discount_value: Number(res.discountValue || 0),
          min_order_value: res.minOrderValue ? Number(res.minOrderValue) : undefined,
          max_discount: res.maxDiscount ? Number(res.maxDiscount) : undefined,
          start_date: res.startDate || '',
          end_date: res.endDate || '',
          usage_limit: Number(res.usageLimit || 100),
          used_count: Number(res.usedCount || 0),
          is_active: res.isActive ?? true
        };
      }
    } catch (err) {
      console.warn('Fallback to localStorage for coupon save', err);
    }

    const list = await this.getCoupons();
    const index = list.findIndex(c => c.id === coupon.id);
    let updated: Coupon[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = coupon;
    } else {
      updated = [coupon, ...list];
    }
    try {
      localStorage.setItem('smartbox_admin_coupons', JSON.stringify(updated));
    } catch {}
    return coupon;
  },

  async deleteCoupon(id: string): Promise<boolean> {
    try {
      if (id && !id.startsWith('cpn-')) {
        await fetchBackend(`/promotions/${id}`, { method: 'DELETE' });
      }
    } catch {}

    const list = await this.getCoupons();
    const filtered = list.filter(c => c.id !== id);
    try {
      localStorage.setItem('smartbox_admin_coupons', JSON.stringify(filtered));
    } catch {}
    return true;
  },

  async toggleCoupon(id: string): Promise<Coupon | null> {
    try {
      if (id && !id.startsWith('cpn-')) {
        const res = await fetchBackend<any>(`/promotions/${id}/toggle`, { method: 'PATCH' });
        if (res) {
          return {
            id: res.id,
            code: res.code,
            description: res.description || '',
            discount_type: res.discountType || 'percentage',
            discount_value: Number(res.discountValue || 0),
            min_order_value: res.minOrderValue ? Number(res.minOrderValue) : undefined,
            max_discount: res.maxDiscount ? Number(res.maxDiscount) : undefined,
            start_date: res.startDate || '',
            end_date: res.endDate || '',
            usage_limit: Number(res.usageLimit || 100),
            used_count: Number(res.usedCount || 0),
            is_active: res.isActive ?? true
          };
        }
      }
    } catch {}
    return null;
  },

  async validateCoupon(code: string, orderTotal: number): Promise<ValidateCouponResponse> {
    try {
      const res = await fetchBackend<any>('/promotions/validate', {
        method: 'POST',
        body: JSON.stringify({ code, orderTotal })
      });
      if (res) {
        return {
          isValid: res.isValid !== undefined ? Boolean(res.isValid) : Boolean(res.valid),
          message: res.message,
          code: res.code,
          discountType: res.discountType,
          discountValue: Number(res.discountValue || 0),
          discountAmount: Number(res.discountAmount || 0),
          originalTotal: Number(res.originalTotal || orderTotal),
          finalTotal: Number(res.finalTotal || orderTotal),
          promotionId: res.promotionId
        };
      }
    } catch {}

    // Local client-side fallback validation engine
    const coupons = await this.getCoupons();
    const cleanCode = code.trim().toUpperCase();
    const coupon = coupons.find(c => c.code.toUpperCase() === cleanCode);

    if (!coupon) {
      return {
        isValid: false,
        message: `Mã giảm giá '${cleanCode}' không tồn tại.`,
        discountAmount: 0,
        originalTotal: orderTotal,
        finalTotal: orderTotal
      };
    }

    if (!coupon.is_active) {
      return {
        isValid: false,
        message: `Mã giảm giá '${cleanCode}' hiện đang tạm khóa.`,
        discountAmount: 0,
        originalTotal: orderTotal,
        finalTotal: orderTotal
      };
    }

    if (coupon.min_order_value && orderTotal < coupon.min_order_value) {
      return {
        isValid: false,
        message: `Đơn hàng tối thiểu ${coupon.min_order_value.toLocaleString('vi-VN')} đ để áp dụng mã này.`,
        discountAmount: 0,
        originalTotal: orderTotal,
        finalTotal: orderTotal
      };
    }

    let discountAmount = 0;
    if (coupon.discount_type === 'percentage') {
      discountAmount = Math.round((orderTotal * coupon.discount_value) / 100);
      if (coupon.max_discount && discountAmount > coupon.max_discount) {
        discountAmount = coupon.max_discount;
      }
    } else {
      discountAmount = coupon.discount_value;
      if (discountAmount > orderTotal) discountAmount = orderTotal;
    }

    return {
      isValid: true,
      message: 'Áp dụng mã giảm giá thành công!',
      code: coupon.code,
      discountType: coupon.discount_type,
      discountValue: coupon.discount_value,
      discountAmount,
      originalTotal: orderTotal,
      finalTotal: Math.max(0, orderTotal - discountAmount),
      promotionId: coupon.id
    };
  },

  // ---------------------------------------------------------
  // Combos & Gói Sản Phẩm
  // ---------------------------------------------------------
  async getCombos(): Promise<ProductCombo[]> {
    const defaultCombos: ProductCombo[] = [
      {
        id: 'combo-01',
        name: 'Combo SmartBox Pro IoT + Module Cảm Biến HC-SR04 V2',
        description: 'Trọn bộ hộp giao nhận cao cấp tích hợp cảm biến siêu âm nhận diện kiện hàng tự động',
        product_ids: ['prod-01', 'prod-03'],
        product_names: ['SmartBox Pro IoT Gateway', 'Cảm biến siêu âm HC-SR04 V2'],
        original_price: 3650000,
        combo_price: 3100000,
        discount_percent: 15,
        image_url: 'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?auto=format&fit=crop&w=600&q=80',
        is_active: true
      },
      {
        id: 'combo-02',
        name: 'Gói An Toàn: SmartBox Enterprise + Bộ Nguồn Pin Li-ion Dự Phòng',
        description: 'Giải pháp chuyên dụng cho biệt thự & văn phòng, duy trì hoạt động 72h khi mất điện lưới',
        product_ids: ['prod-02', 'prod-04'],
        product_names: ['SmartBox Enterprise 150L', 'Khối Pin Li-ion 18650 & Mạch BMS 2S'],
        original_price: 6300000,
        combo_price: 5490000,
        discount_percent: 13,
        image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
        is_active: true
      }
    ];

    try {
      const stored = localStorage.getItem('smartbox_admin_combos');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return defaultCombos;
  },

  async saveCombo(combo: ProductCombo): Promise<ProductCombo> {
    const list = await this.getCombos();
    const index = list.findIndex(c => c.id === combo.id);
    let updated: ProductCombo[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = combo;
    } else {
      updated = [combo, ...list];
    }
    try {
      localStorage.setItem('smartbox_admin_combos', JSON.stringify(updated));
    } catch {}
    return combo;
  },

  async deleteCombo(id: string): Promise<boolean> {
    const list = await this.getCombos();
    const filtered = list.filter(c => c.id !== id);
    try {
      localStorage.setItem('smartbox_admin_combos', JSON.stringify(filtered));
    } catch {}
    return true;
  },

  // ---------------------------------------------------------
  // Stock Transactions / Lịch Sử Xuất Nhập Kho
  // ---------------------------------------------------------
  async getStockTransactions(): Promise<StockTransaction[]> {
    const defaultLogs: StockTransaction[] = [
      {
        id: 'tx-001',
        product_id: 'prod-01',
        product_name: 'SmartBox Pro IoT Gateway',
        sku: 'SDB-PRO-ESP32',
        transaction_type: 'in',
        delta: 25,
        previous_stock: 5,
        new_stock: 30,
        reason: 'Nhập lô hàng sản xuất xưởng Q1/2026',
        created_at: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
        created_by: 'Tổng Quản Trị Hệ Thống'
      },
      {
        id: 'tx-002',
        product_id: 'prod-02',
        product_name: 'SmartBox Standard 45L',
        sku: 'SDB-STD-45L',
        transaction_type: 'out',
        delta: 2,
        previous_stock: 12,
        new_stock: 10,
        reason: 'Xuất cấp cho đơn hàng #ORD-88219 (Khách dự án Ecopark)',
        created_at: new Date(Date.now() - 3600 * 1000 * 18).toISOString(),
        created_by: 'Nguyễn Kế Toán'
      },
      {
        id: 'tx-003',
        product_id: 'prod-03',
        product_name: 'Khóa Nắp Servo MG90S Kim Loại',
        sku: 'PART-SERVO-MG90S',
        transaction_type: 'out',
        delta: 1,
        previous_stock: 15,
        new_stock: 14,
        reason: 'Xuất thợ Lê Văn Vũ bảo hành thay linh kiện Ticket #TK-DFA1B7',
        created_at: new Date(Date.now() - 3600 * 1000 * 26).toISOString(),
        created_by: 'Trần Điều Phối KTV'
      },
      {
        id: 'tx-004',
        product_id: 'prod-04',
        product_name: 'Mạch Cân LoadCell HX711 24-bit',
        sku: 'PART-SCALE-HX711',
        transaction_type: 'in',
        delta: 50,
        previous_stock: 4,
        new_stock: 54,
        reason: 'Nhập khẩu linh kiện kiểm định lô mới',
        created_at: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
        created_by: 'Tổng Quản Trị Hệ Thống'
      }
    ];

    try {
      const stored = localStorage.getItem('smartbox_admin_stock_logs');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return defaultLogs;
  },

  async addStockTransaction(tx: StockTransaction): Promise<void> {
    const list = await this.getStockTransactions();
    const updated = [tx, ...list];
    try {
      localStorage.setItem('smartbox_admin_stock_logs', JSON.stringify(updated));
    } catch {}
  }
};

// ==============================================================================
// 3. ORDERS SERVICE
// ==============================================================================
export interface ExtendedOrder extends Order {
  payment_method?: 'vnpay' | 'cod' | 'bank_transfer' | 'momo';
  payment_status?: 'paid' | 'pending' | 'refunded';
  transaction_ref?: string;
  items_summary?: string;
}

export const ordersService = {
  async getOrders(): Promise<ExtendedOrder[]> {
    const backendOrders = await fetchBackend<any[]>('/orders');
    if (backendOrders && backendOrders.length > 0) {
      return backendOrders.map(o => ({
        id: o.id,
        user_id: o.userId,
        promotion_id: o.promotionId || null,
        status: o.status,
        shipping_address: o.shippingAddress,
        tracking_number: o.trackingNumber,
        total: o.total,
        payment_method: o.paymentMethod || 'vnpay',
        payment_status: o.paymentStatus || 'pending',
        transaction_ref: o.transactionRef,
        items_summary: o.itemsSummary,
        created_at: o.createdAt,
        updated_at: o.updatedAt,
        customer: {
          id: o.userId,
          full_name: o.customerName || 'Khách hàng',
          phone: o.customerPhone,
          avatar_url: null,
          default_address: o.shippingAddress,
          role: 'customer',
          is_locked: false,
          is_2fa_enabled: false,
          created_at: o.createdAt,
          updated_at: o.updatedAt
        }
      }));
    }

    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, customer:profiles!user_id(full_name, phone, default_address), payments(provider, status, transaction_ref), order_items(quantity, unit_price, product:products(name))')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((o: any) => {
        const firstPayment = o.payments?.[0];
        const items = o.order_items || [];
        const itemsSummary = items.length
          ? items.map((it: any) => `${it.quantity}x ${it.product?.name || 'Sản phẩm'}`).join(', ')
          : '';

        return {
          ...o,
          payment_method: (firstPayment?.provider as any) || undefined,
          payment_status: (firstPayment?.status as any) || (o.status === 'completed' ? 'paid' : 'pending'),
          transaction_ref: firstPayment?.transaction_ref || '',
          items_summary: itemsSummary
        };
      });
    } catch (err) {
      console.error('Error fetching orders:', err);
      return [];
    }
  },

  async updateOrderStatus(id: string, status: OrderStatus): Promise<{ success: boolean; error: string | null }> {
    const res = await fetchBackend<any>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    if (res) return { success: true, error: null };

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi khi cập nhật trạng thái đơn hàng' };
    }
  },

  async updateTrackingNumber(id: string, tracking_number: string): Promise<{ success: boolean; error: string | null }> {
    const res = await fetchBackend<any>(`/orders/${id}/tracking`, {
      method: 'PATCH',
      body: JSON.stringify({ trackingNumber: tracking_number })
    });
    if (res) return { success: true, error: null };

    try {
      const { error } = await supabase
        .from('orders')
        .update({ tracking_number, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi khi cập nhật mã vận đơn' };
    }
  }
};

// ==============================================================================
// 4. DEVICES SERVICE
// ==============================================================================
export interface ExtendedDevice extends Device {
  mac_address?: string;
  chip_model?: string;
  public_ip?: string;
  local_ip?: string;
  geo_city?: string;
  map_x?: number;
  map_y?: number;
  lock_status?: 'locked' | 'unlocked';
  wifi_rssi?: number;
  ping_ms?: number;
}

export const devicesService = {
  async getDevices(): Promise<ExtendedDevice[]> {
    const backendDevices = await fetchBackend<any[]>('/devices');
    if (backendDevices && backendDevices.length > 0) {
      return backendDevices.map(d => ({
        id: d.id,
        product_id: d.productId,
        owner_id: d.ownerId,
        serial_number: d.serialNumber,
        name: d.name,
        location_label: d.locationLabel,
        status: d.status,
        battery_level: d.batteryLevel,
        firmware_version: d.firmwareVersion,
        last_seen_at: d.lastSeenAt,
        created_at: d.createdAt,
        mac_address: d.macAddress || '',
        chip_model: d.chipModel || '',
        public_ip: d.publicIp || '',
        local_ip: d.localIp || '',
        geo_city: d.geoCity || d.locationLabel || '',
        map_x: d.mapX ?? 0,
        map_y: d.mapY ?? 0,
        lock_status: d.lockStatus || 'locked',
        wifi_rssi: d.wifiRssi ?? 0,
        ping_ms: d.pingMs ?? 0,
        owner: {
          id: d.ownerId,
          full_name: d.ownerName || 'Chủ sở hữu',
          phone: d.ownerPhone,
          avatar_url: null,
          default_address: d.locationLabel,
          role: 'customer',
          is_locked: false,
          is_2fa_enabled: false,
          created_at: d.createdAt,
          updated_at: d.createdAt
        }
      }));
    }

    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*, owner:profiles!owner_id(full_name, phone)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((d: any) => ({
        ...d,
        mac_address: d.mac_address || '',
        chip_model: d.chip_model || '',
        public_ip: d.public_ip || '',
        local_ip: d.local_ip || '',
        geo_city: d.location_label || '',
        map_x: d.map_x ?? 0,
        map_y: d.map_y ?? 0,
        lock_status: (d.lock_status as any) || 'locked',
        wifi_rssi: d.wifi_rssi ?? 0,
        ping_ms: d.ping_ms ?? 0
      }));
    } catch (err) {
      console.error('Error fetching devices:', err);
      return [];
    }
  },

  async getDeviceEvents(deviceId?: string): Promise<DeviceEvent[]> {
    const url = deviceId ? `/devices/events?deviceId=${deviceId}` : '/devices/events';
    const backendEvents = await fetchBackend<any[]>(url);
    if (backendEvents && backendEvents.length > 0) {
      return backendEvents.map(e => ({
        id: e.id,
        device_id: e.deviceId,
        event_type: e.eventType,
        payload: typeof e.payload === 'string' ? JSON.parse(e.payload || '{}') : e.payload,
        created_at: e.createdAt
      }));
    }

    if (!isSupabaseConfigured) return [];
    try {
      let query = supabase
        .from('device_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (deviceId) {
        query = query.eq('device_id', deviceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as DeviceEvent[]) || [];
    } catch (err) {
      console.error('Error fetching device events:', err);
      return [];
    }
  },

  async updateDeviceStatus(id: string, status: DeviceStatus): Promise<{ success: boolean; error: string | null }> {
    const res = await fetchBackend<any>(`/devices/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    if (res) return { success: true, error: null };

    try {
      const { error } = await supabase
        .from('devices')
        .update({ status, last_seen_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi khi cập nhật thiết bị' };
    }
  }
};

// ==============================================================================
// 5. WARRANTIES SERVICE
// ==============================================================================
export interface InspectionChecklist {
  power_tested: boolean;
  lock_tested: boolean;
  sensor_tested: boolean;
  loadcell_tested: boolean;
  seal_applied: boolean;
}

export interface ExtendedWarrantyClaim extends WarrantyClaim {
  device_serial?: string;
  serial_number?: string;
  device_name?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  error_category?: string;
  fault_category?: 'sensor_fault' | 'mechanical_jam' | 'scale_deviation' | 'connectivity' | 'power_supply';
  replacement_parts?: string[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  sla_hours?: number;
  repair_images?: string[];
  technician_name?: string;
  technician_phone?: string;
  inspection_checklist?: InspectionChecklist;
}

const DEFAULT_DEMO_CLAIMS: ExtendedWarrantyClaim[] = [
  {
    id: '7becc50e-9fee-4efd-a8d3-5e3dd2c6a2b5',
    warranty_id: 'w-001',
    serial_number: 'BOX-2026-001',
    device_name: 'SmartBox Resident Pro',
    customer_name: 'Nguyễn Văn An',
    customer_phone: '0988123456',
    customer_address: 'Tòa Landmark 81, P.22, Bình Thạnh, TP.HCM',
    description: 'Cảm biến siêu âm HC-SR04 không nhận diện kiện hàng khi shipper bỏ gói hàng vào thùng. Đèn LED báo rỗng.',
    fault_category: 'sensor_fault',
    priority: 'high',
    sla_hours: 6,
    status: 'in_progress',
    assigned_to: 'tech-001',
    technician_name: 'Trần Kỹ Thuật',
    technician_phone: '0912345678',
    images: [
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'
    ],
    repair_images: [
      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80'
    ],
    replacement_parts: ['Module HC-SR04 V2', 'Cáp tín hiệu chống nhiễu'],
    internal_notes: 'Đã đo kiểm chân Trigger/Echo trên ESP32. Chân GPIO 19 bị suy giảm tín hiệu do oxy hóa giắc cắm. Đã thay mới module cảm biến và phủ keo chống ẩm silicon.',
    inspection_checklist: {
      power_tested: true,
      lock_tested: true,
      sensor_tested: true,
      loadcell_tested: true,
      seal_applied: false
    },
    created_at: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
    resolved_at: null
  },
  {
    id: '0b08a0e3-d7b2-4c95-b51c-f42fb4dfa1b7',
    warranty_id: 'w-002',
    serial_number: 'BOX-2026-002',
    device_name: 'SmartBox Home Ultra',
    customer_name: 'Lê Hoàng Yến',
    customer_phone: '0977889900',
    customer_address: 'Số 45 Chùa Bộc, P. Quang Trung, Đống Đa, Hà Nội',
    description: 'Động cơ Servo MG90S bị kẹt chốt cơ học khi gặp độ ẩm cao sau cơn mưa lớn. Nắp không đóng kín được.',
    fault_category: 'mechanical_jam',
    priority: 'urgent',
    sla_hours: 2,
    status: 'in_progress',
    assigned_to: 'tech-002',
    technician_name: 'Lê Văn Vũ (Firmware & Cơ khí)',
    technician_phone: '0905123987',
    images: [
      'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=600&q=80'
    ],
    repair_images: [
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80'
    ],
    replacement_parts: ['Servo MG90S Kim Loại (Metal Gear)', 'Chốt khóa hợp kim chống rỉ'],
    internal_notes: 'Đã gửi linh kiện chốt khóa chống rỉ hợp kim nhôm và thay thế bánh răng kim loại chịu lực. Đang test chu kỳ 20 lần đóng mở.',
    inspection_checklist: {
      power_tested: true,
      lock_tested: true,
      sensor_tested: false,
      loadcell_tested: true,
      seal_applied: false
    },
    created_at: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    resolved_at: null
  },
  {
    id: '3c8e4f12-a123-4b67-89ef-5566778899aa',
    warranty_id: 'w-003',
    serial_number: 'BOX-2026-003',
    device_name: 'SmartBox Villa Edition',
    customer_name: 'Trần Minh Đức',
    customer_phone: '0933445566',
    customer_address: 'Biệt thự Gamuda City, Hoàng Mai, Hà Nội',
    description: 'Mạch cân LoadCell HX711 báo sai lệch 250g so với trọng lượng bưu phẩm thực tế.',
    fault_category: 'scale_deviation',
    priority: 'medium',
    sla_hours: 24,
    status: 'new',
    assigned_to: null,
    technician_name: undefined,
    technician_phone: undefined,
    images: [
      'https://images.unsplash.com/photo-1581092162384-8987c1d64718?auto=format&fit=crop&w=600&q=80'
    ],
    repair_images: [],
    replacement_parts: [],
    internal_notes: 'Cần phân công kỹ thuật viên mang quả cân chuẩn 1kg và 5kg đến hiệu chuẩn tại hiện trường.',
    inspection_checklist: {
      power_tested: false,
      lock_tested: false,
      sensor_tested: false,
      loadcell_tested: false,
      seal_applied: false
    },
    created_at: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    resolved_at: null
  },
  {
    id: '9f21a5b4-bb78-4a12-8901-cdef01234567',
    warranty_id: 'w-004',
    serial_number: 'BOX-2026-004',
    device_name: 'SmartBox Enterprise Lock',
    customer_name: 'Phạm Thị Mai',
    customer_phone: '0911223344',
    customer_address: 'Tòa nhà FPT Cầu Giấy, Duy Tân, Cầu Giấy, Hà Nội',
    description: 'Pin dự phòng sụt nhanh sau 2 ngày mất điện lưới. Cần kiểm tra mạch sạc và cell pin 18650.',
    fault_category: 'power_supply',
    priority: 'medium',
    sla_hours: 24,
    status: 'resolved',
    assigned_to: 'tech-003',
    technician_name: 'Hoàng Minh Tuấn (Field Tech)',
    technician_phone: '0944556677',
    images: [
      'https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?auto=format&fit=crop&w=600&q=80'
    ],
    repair_images: [
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80'
    ],
    replacement_parts: ['Cell Pin Li-ion Panasonic 18650 3400mAh', 'Mạch BMS 2S bảo vệ pin'],
    internal_notes: 'Đã thay 2 cell pin chính hãng Panasonic và kiểm tra mạch bảo vệ BMS. Thời lượng pin thử nghiệm đạt 14 ngày không sạc. Khách hàng đã ký biên bản bàn giao nghiệm thu.',
    inspection_checklist: {
      power_tested: true,
      lock_tested: true,
      sensor_tested: true,
      loadcell_tested: true,
      seal_applied: true
    },
    created_at: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
    resolved_at: new Date(Date.now() - 3600 * 1000 * 6).toISOString()
  }
];

export const warrantiesService = {
  async getClaims(): Promise<ExtendedWarrantyClaim[]> {
    // 1. Check local memory/localStorage cache first for updated items
    const cachedStr = localStorage.getItem('smartbox_warranty_claims_cache');
    let localCache: Record<string, ExtendedWarrantyClaim> = {};
    if (cachedStr) {
      try { localCache = JSON.parse(cachedStr); } catch { /* ignore */ }
    }

    const backendClaims = await fetchBackend<any[]>('/warranties/claims');
    if (backendClaims && backendClaims.length > 0) {
      return backendClaims.map(c => {
        const cached = localCache[c.id];
        return {
          id: c.id,
          warranty_id: c.warrantyId,
          description: c.description,
          images: c.images || [DEFAULT_DEMO_CLAIMS[0].images![0]],
          repair_images: cached?.repair_images || c.repairImages || [],
          status: cached?.status || c.status,
          assigned_to: cached?.assigned_to || c.assignedTo,
          internal_notes: cached?.internal_notes || c.internalNotes,
          created_at: c.createdAt,
          resolved_at: cached?.resolved_at || c.resolvedAt,
          serial_number: c.serialNumber || 'BOX-2026-001',
          device_name: c.deviceName || 'SmartBox IoT Pro',
          customer_name: c.customerName || 'Khách hàng SmartBox',
          customer_phone: c.customerPhone || '0988123456',
          customer_address: c.customerAddress || 'Hà Nội, Việt Nam',
          fault_category: (cached?.fault_category || c.faultCategory || 'sensor_fault') as any,
          replacement_parts: cached?.replacement_parts || c.replacementParts || [],
          priority: cached?.priority || 'high',
          inspection_checklist: cached?.inspection_checklist || {
            power_tested: true,
            lock_tested: true,
            sensor_tested: true,
            loadcell_tested: true,
            seal_applied: false
          },
          technician_name: cached?.technician_name || c.assigneeName || 'Trần Kỹ Thuật',
          technician_phone: cached?.technician_phone || c.assigneePhone || '0912345678',
          assignee: c.assignedTo ? {
            id: c.assignedTo,
            full_name: c.assigneeName || 'Kỹ thuật viên',
            phone: c.assigneePhone,
            avatar_url: null,
            default_address: null,
            role: 'technician',
            is_locked: false,
            is_2fa_enabled: false,
            created_at: c.createdAt,
            updated_at: c.createdAt
          } : undefined
        };
      });
    }

    if (!isSupabaseConfigured) {
      return DEFAULT_DEMO_CLAIMS.map(c => localCache[c.id] ? { ...c, ...localCache[c.id] } : c);
    }

    try {
      const { data, error } = await supabase
        .from('warranty_claims')
        .select('*, assignee:profiles!assigned_to(full_name, phone, role), warranty:warranties(device:devices(serial_number, name), order_item:order_items(order:orders(shipping_address, customer:profiles!user_id(full_name, phone))))')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        return DEFAULT_DEMO_CLAIMS.map(c => localCache[c.id] ? { ...c, ...localCache[c.id] } : c);
      }

      return data.map((c: any, idx: number) => {
        const cached = localCache[c.id];
        let parsedImages: string[] = [];
        if (Array.isArray(c.images)) {
          parsedImages = c.images;
        } else if (typeof c.images === 'string') {
          try { parsedImages = JSON.parse(c.images); } catch { parsedImages = [c.images]; }
        }
        if (parsedImages.length === 0 || !parsedImages[0]) {
          parsedImages = [DEFAULT_DEMO_CLAIMS[idx % DEFAULT_DEMO_CLAIMS.length].images![0]];
        }

        const device = c.warranty?.device;
        const customer = c.warranty?.order_item?.order?.customer;
        const address = c.warranty?.order_item?.order?.shipping_address;

        let parsedNotes = c.internal_notes || '';
        let repairImgs: string[] = cached?.repair_images || [];

        return {
          ...c,
          status: cached?.status || c.status,
          images: parsedImages,
          repair_images: repairImgs.length > 0 ? repairImgs : (c.status === 'resolved' ? DEFAULT_DEMO_CLAIMS[3].repair_images : []),
          serial_number: device?.serial_number || c.device_serial || `BOX-2026-00${idx + 1}`,
          device_name: device?.name || 'SmartBox Resident Pro',
          customer_name: customer?.full_name || c.customer_name || 'Khách hàng SmartBox',
          customer_phone: customer?.phone || c.customer_phone || '0988123456',
          customer_address: address || c.customer_address || 'Hà Nội, Việt Nam',
          fault_category: (c.description?.includes('siêu âm') ? 'sensor_fault' : c.description?.includes('Servo') ? 'mechanical_jam' : 'scale_deviation') as any,
          replacement_parts: cached?.replacement_parts || (c.status === 'resolved' ? ['Module HC-SR04', 'Chốt khóa cơ kim loại'] : []),
          priority: cached?.priority || (idx === 0 ? 'urgent' : idx === 1 ? 'high' : 'medium'),
          technician_name: cached?.technician_name || c.assignee?.full_name || (c.assigned_to ? 'Trần Kỹ Thuật' : undefined),
          technician_phone: cached?.technician_phone || c.assignee?.phone || (c.assigned_to ? '0912345678' : undefined),
          inspection_checklist: cached?.inspection_checklist || {
            power_tested: true,
            lock_tested: c.status === 'resolved',
            sensor_tested: c.status === 'resolved',
            loadcell_tested: true,
            seal_applied: c.status === 'resolved'
          }
        };
      });
    } catch (err) {
      console.error('Error fetching warranty claims:', err);
      return DEFAULT_DEMO_CLAIMS.map(c => localCache[c.id] ? { ...c, ...localCache[c.id] } : c);
    }
  },

  async updateClaimFull(claimId: string, updates: Partial<ExtendedWarrantyClaim>): Promise<{ success: boolean; error: string | null }> {
    // 1. Update localStorage cache for instant persistence
    try {
      const cachedStr = localStorage.getItem('smartbox_warranty_claims_cache');
      const localCache = cachedStr ? JSON.parse(cachedStr) : {};
      localCache[claimId] = { ...(localCache[claimId] || {}), ...updates };
      localStorage.setItem('smartbox_warranty_claims_cache', JSON.stringify(localCache));
    } catch (e) {
      console.warn('LocalStorage cache write error:', e);
    }

    // 2. Sync with Backend / Supabase
    if (updates.status) {
      await fetchBackend<any>(`/warranties/claims/${claimId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: updates.status })
      });
    }
    if (updates.internal_notes) {
      await fetchBackend<any>(`/warranties/claims/${claimId}/notes`, {
        method: 'PATCH',
        body: JSON.stringify({ notes: updates.internal_notes })
      });
    }

    if (isSupabaseConfigured) {
      try {
        const dbUpdates: any = {};
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.status === 'resolved') dbUpdates.resolved_at = new Date().toISOString();
        if (updates.assigned_to !== undefined) dbUpdates.assigned_to = updates.assigned_to;
        if (updates.internal_notes) dbUpdates.internal_notes = updates.internal_notes;

        await supabase
          .from('warranty_claims')
          .update(dbUpdates)
          .eq('id', claimId);
      } catch (err) {
        console.warn('Supabase sync warning:', err);
      }
    }

    return { success: true, error: null };
  },

  async assignTechnician(claimId: string, technicianId: string | null): Promise<{ success: boolean; error: string | null }> {
    return this.updateClaimFull(claimId, { assigned_to: technicianId, status: 'in_progress' });
  },

  async updateClaimStatus(claimId: string, status: ClaimStatus): Promise<{ success: boolean; error: string | null }> {
    return this.updateClaimFull(claimId, { status });
  },

  async addInternalNote(claimId: string, note: string): Promise<{ success: boolean; error: string | null }> {
    return this.updateClaimFull(claimId, { internal_notes: note });
  }
};

// ==============================================================================
// 6. USERS SERVICE
// ==============================================================================
export const usersService = {
  async getUsers(): Promise<Profile[]> {
    const backendUsers = await fetchBackend<any[]>('/users');
    if (backendUsers && backendUsers.length > 0) {
      return backendUsers.map(u => ({
        id: u.id,
        full_name: u.fullName,
        phone: u.phone,
        email: u.email || (u.phone ? `${u.phone}@smartbox.vn` : 'user@smartbox.vn'),
        avatar_url: u.avatarUrl,
        default_address: u.defaultAddress,
        role: u.role,
        is_locked: u.isLocked ?? false,
        is_2fa_enabled: u.is2faEnabled ?? false,
        created_at: u.createdAt,
        updated_at: u.updatedAt
      }));
    }

    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return ((data as any[]) || []).map(p => ({
        ...p,
        email: p.email || (p.phone ? `${p.phone}@smartbox.vn` : 'user@smartbox.vn')
      }));
    } catch (err) {
      console.error('Error fetching users:', err);
      return [];
    }
  },

  async getUser360Details(id: string): Promise<Customer360Details | null> {
    const res = await fetchBackend<any>(`/users/${id}/details`);
    if (res && res.profile) {
      return {
        profile: {
          id: res.profile.id,
          full_name: res.profile.fullName,
          phone: res.profile.phone,
          email: res.profile.email,
          avatar_url: res.profile.avatarUrl,
          default_address: res.profile.defaultAddress,
          role: res.profile.role,
          is_locked: res.profile.isLocked ?? false,
          is_2fa_enabled: res.profile.is2faEnabled ?? false,
          created_at: res.profile.createdAt,
          updated_at: res.profile.updatedAt
        },
        orders: (res.orders || []).map((o: any) => ({
          id: o.id,
          user_id: o.userId,
          status: o.status,
          shipping_address: o.shippingAddress,
          tracking_number: o.trackingNumber,
          total: o.total,
          created_at: o.createdAt,
          updated_at: o.updatedAt,
          promotion_id: null
        })),
        devices: (res.devices || []).map((d: any) => ({
          id: d.id,
          product_id: d.productId,
          owner_id: d.ownerId,
          serial_number: d.serialNumber,
          name: d.name,
          location_label: d.locationLabel,
          status: d.status,
          battery_level: d.batteryLevel,
          firmware_version: d.firmwareVersion,
          last_seen_at: d.lastSeenAt,
          created_at: d.createdAt
        })),
        warranty_claims: (res.warrantyClaims || []).map((c: any) => ({
          id: c.id,
          warranty_id: c.warrantyId,
          description: c.description,
          images: c.images || [],
          status: c.status,
          assigned_to: c.assignedTo,
          internal_notes: c.internalNotes,
          created_at: c.createdAt,
          resolved_at: c.resolvedAt
        }))
      };
    }

    // Fallback: aggregate locally from other services
    try {
      const allUsers = await this.getUsers();
      const currentProfile = allUsers.find(u => u.id === id);
      if (!currentProfile) return null;

      const [orders, devices, claims] = await Promise.all([
        ordersService.getOrders(),
        devicesService.getDevices(),
        warrantiesService.getClaims()
      ]);

      const userOrders = orders.filter(o => o.user_id === id);
      const userDevices = devices.filter(d => d.owner_id === id);
      const deviceSerials = userDevices.map(d => d.serial_number).filter(Boolean);
      const userClaims = claims.filter(c => 
        (c.serial_number && deviceSerials.includes(c.serial_number)) ||
        (c.device_serial && deviceSerials.includes(c.device_serial)) ||
        (Boolean(currentProfile.phone) && c.customer_phone === currentProfile.phone)
      );

      return {
        profile: currentProfile,
        orders: userOrders,
        devices: userDevices,
        warranty_claims: userClaims
      };
    } catch (e) {
      console.error('Error getting 360 details:', e);
      return null;
    }
  },

  async sendResetPasswordOtp(id: string): Promise<{ success: boolean; message: string; email?: string; previewOtp?: string }> {
    const res = await fetchBackend<any>(`/users/${id}/send-reset-otp`, { method: 'POST' });
    if (res) return res;

    // Simulated fallback in dev
    const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      sessionStorage.setItem(`smartbox_otp_${id}`, mockOtp);
    } catch {}
    return {
      success: true,
      message: 'Đã phát mã xác thực OTP gửi tới email của khách hàng.',
      email: 'khachhang@smartbox.vn',
      previewOtp: mockOtp
    };
  },

  async verifyOtpAndResetPassword(id: string, otp: string, newPassword?: string): Promise<{ success: boolean; message: string; updatedPassword?: string }> {
    const res = await fetchBackend<any>(`/users/${id}/verify-reset-password`, {
      method: 'POST',
      body: JSON.stringify({ otp, newPassword })
    });
    if (res) return res;

    // Simulated fallback
    const savedOtp = sessionStorage.getItem(`smartbox_otp_${id}`);
    if (savedOtp && savedOtp !== otp.trim()) {
      return { success: false, message: 'Mã OTP không chính xác! Vui lòng đối soát lại với khách hàng.' };
    }
    const finalPassword = newPassword && newPassword.trim() ? newPassword.trim() : 'SmartBox@123456';
    try {
      sessionStorage.removeItem(`smartbox_otp_${id}`);
    } catch {}
    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công qua hotline xác thực OTP.',
      updatedPassword: finalPassword
    };
  },

  async toggleUserLock(id: string, currentLockState: boolean, reason?: string): Promise<{ success: boolean; error: string | null }> {
    const res = await fetchBackend<any>(`/users/${id}/toggle-lock`, {
      method: 'PATCH',
      body: JSON.stringify({ isLocked: !currentLockState, reason })
    });
    if (res) return { success: true, error: null };

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_locked: !currentLockState, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi khi cập nhật trạng thái khóa' };
    }
  },

  async updateUserRole(id: string, role: UserRole): Promise<{ success: boolean; error: string | null }> {
    const res = await fetchBackend<any>(`/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    });
    if (res) return { success: true, error: null };

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi khi cập nhật vai trò' };
    }
  }
};

// ==============================================================================
// 7. AUDIT LOGS SERVICE
// ==============================================================================
export const auditLogsService = {
  async getLogs(): Promise<AuditLog[]> {
    const backendLogs = await fetchBackend<any[]>('/audit-logs');
    if (backendLogs && backendLogs.length > 0) {
      return backendLogs.map(l => ({
        id: l.id,
        actor_id: l.actorId,
        action: l.action,
        target_table: l.targetTable,
        target_id: l.targetId,
        meta: typeof l.meta === 'string' ? JSON.parse(l.meta || '{}') : l.meta,
        created_at: l.createdAt,
        actor: {
          id: l.actorId,
          full_name: l.actorName || 'Admin',
          phone: null,
          avatar_url: null,
          default_address: null,
          role: l.actorRole || 'super_admin',
          is_locked: false,
          is_2fa_enabled: false,
          created_at: l.createdAt,
          updated_at: l.createdAt
        }
      }));
    }

    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*, actor:profiles!actor_id(full_name, role)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data as AuditLog[]) || [];
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      return [];
    }
  },

  async logAction(action: string, targetTable: string, targetId: string, meta?: Record<string, any>): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        actorId: user?.id || null,
        action,
        targetTable,
        targetId,
        meta: JSON.stringify(meta || {})
      };

      const res = await fetchBackend<any>('/audit-logs', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res) return;

      await supabase.from('audit_logs').insert([{
        actor_id: user?.id || null,
        action,
        target_table: targetTable,
        target_id: targetId,
        meta: meta || {},
        created_at: new Date().toISOString()
      }]);
    } catch (err) {
      console.warn('Failed to record audit log:', err);
    }
  }
};

// ==============================================================================
// 8. SETTINGS SERVICE
// ==============================================================================
export const settingsService = {
  async getSettings(): Promise<Record<string, any>> {
    const backendSettings = await fetchBackend<any>('/settings');
    if (backendSettings) {
      return {
        message_templates: backendSettings.messageTemplates || [],
        shipping_methods: backendSettings.shippingMethods || [],
        payment_methods: backendSettings.paymentMethods || [],
        warranty_policies: []
      };
    }

    if (!isSupabaseConfigured) return {};
    try {
      const { data: templates } = await supabase.from('message_templates').select('*');
      const { data: shipping } = await supabase.from('shipping_methods').select('*');
      const { data: payment } = await supabase.from('payment_methods').select('*');
      const { data: warrantyPolicies } = await supabase.from('warranty_policies').select('*');

      return {
        message_templates: templates || [],
        shipping_methods: shipping || [],
        payment_methods: payment || [],
        warranty_policies: warrantyPolicies || []
      };
    } catch (err) {
      console.error('Error fetching settings:', err);
      return {};
    }
  },

  async saveSetting(key: string, value: any): Promise<{ success: boolean; error: string | null }> {
    try {
      if (key === 'notification_templates' && value.email_subject) {
        const res = await fetchBackend<any>('/settings/templates', {
          method: 'POST',
          body: JSON.stringify({
            code: 'ORDER_CONFIRMED',
            channel: 'email',
            subject: value.email_subject,
            body: value.claim_received || ''
          })
        });
        if (res) return { success: true, error: null };

        await supabase
          .from('message_templates')
          .upsert([{ code: 'ORDER_CONFIRMED', channel: 'email', subject: value.email_subject, body: value.claim_received || '' }]);
      }
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi khi lưu cài đặt' };
    }
  }
};

// ==============================================================================
// 9. TEMPLATES SERVICE
// ==============================================================================
const DEFAULT_FALLBACK_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tpl-001',
    code: 'OTP_RESET_PASSWORD',
    name: 'Mã OTP Đặt Lại Mật Khẩu Hotline',
    description: 'Gửi email mã OTP 6 số xác thực khi khách hàng liên hệ hotline tổng đài yêu cầu reset mật khẩu',
    channel: 'email',
    subject: '🔒 [SmartBox] Mã OTP đặt lại mật khẩu: {{otp_code}}',
    body: '<p>Xin chào <strong>{{customer_name}}</strong>,</p><p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu tài khoản SmartBox của bạn qua Tổng đài hỗ trợ.</p><p>Mã OTP xác thực của bạn là: <span style="font-size:24px;font-weight:bold;color:#0284c7;letter-spacing:4px;">{{otp_code}}</span></p><p>Mã có hiệu lực trong vòng <strong>{{expire_minutes}} phút</strong>. Tuyệt đối không chia sẻ mã này cho bất kỳ ai!</p><p>Hotline hỗ trợ: {{hotline}}</p>',
    variables: 'customer_name, otp_code, expire_minutes, hotline',
    is_active: true,
    updated_at: new Date().toISOString()
  },
  {
    id: 'tpl-002',
    code: 'ORDER_CONFIRMED',
    name: 'Xác Nhận Đơn Hàng Mua SmartBox',
    description: 'Gửi email tự động ngay khi khách hàng đặt mua trạm SmartBox hoặc phụ kiện thành công',
    channel: 'email',
    subject: '📦 [SmartBox] Xác nhận đơn hàng #{{order_id}} thành công',
    body: '<p>Xin chào <strong>{{customer_name}}</strong>,</p><p>Cảm ơn bạn đã tin tưởng lựa chọn Hệ sinh thái Smart Delivery Box!</p><p>Đơn hàng <strong>#{{order_id}}</strong> với tổng thanh toán <strong>{{total_amount}}</strong> đã được tiếp nhận và đang được đóng gói chuẩn bị giao tới địa chỉ: <em>{{shipping_address}}</em>.</p><p>Phương thức thanh toán: <strong>{{payment_method}}</strong>.</p><p>Mọi thắc mắc xin vui lòng liên hệ tổng đài: {{hotline}}.</p>',
    variables: 'customer_name, order_id, total_amount, shipping_address, payment_method, hotline',
    is_active: true,
    updated_at: new Date().toISOString()
  },
  {
    id: 'tpl-003',
    code: 'ORDER_SHIPPING',
    name: 'Thông Báo Xuất Kho & Đang Giao Hàng',
    description: 'Gửi email / SMS khi đơn hàng được bàn giao cho đối tác vận chuyển GHTK / Viettel Post',
    channel: 'email',
    subject: '🚚 [SmartBox] Đơn hàng #{{order_id}} đang trên đường giao tới bạn',
    body: '<p>Xin chào <strong>{{customer_name}}</strong>,</p><p>Đơn hàng <strong>#{{order_id}}</strong> của bạn đã được xuất kho và bàn giao cho đơn vị vận chuyển <strong>{{shipping_carrier}}</strong>.</p><p>Mã vận đơn tra cứu hành trình: <strong style="color:#0284c7;">{{tracking_number}}</strong>.</p><p>Thời gian dự kiến giao hàng: <strong>{{estimated_delivery}}</strong>.</p><p>Vui lòng chú ý điện thoại để nhận hàng.</p>',
    variables: 'customer_name, order_id, shipping_carrier, tracking_number, estimated_delivery, hotline',
    is_active: true,
    updated_at: new Date().toISOString()
  },
  {
    id: 'tpl-004',
    code: 'PARCEL_DELIVERED',
    name: 'Bưu Kiện Đã Được Bỏ Vào Tủ SmartBox',
    description: 'Tin nhắn SMS / Thông báo gửi ngay khi Shipper bỏ bưu kiện vào tủ và chốt cửa thành công',
    channel: 'sms',
    subject: 'SmartBox - Bưu kiện mới đã đến',
    body: '[SmartBox] Chào {{customer_name}}, bưu kiện mới đã được giao vào trạm {{device_name}} (Trọng lượng: {{weight_kg}}kg). Mã PIN mở tủ: {{pickup_pin}}. Hotline: {{hotline}}',
    variables: 'customer_name, device_name, weight_kg, pickup_pin, address, hotline',
    is_active: true,
    updated_at: new Date().toISOString()
  },
  {
    id: 'tpl-005',
    code: 'WARRANTY_COMPLETED',
    name: 'Nghiệm Thu & Hoàn Tất Sửa Chữa Thiết Bị',
    description: 'Gửi email thông báo cho khách hàng khi kỹ thuật viên hoàn tất sửa chữa và kiểm định linh kiện',
    channel: 'email',
    subject: '✅ [SmartBox] Thiết bị {{device_name}} đã hoàn tất bảo hành và nghiệm thu',
    body: '<p>Xin chào <strong>{{customer_name}}</strong>,</p><p>Yêu cầu bảo hành <strong>#{{claim_id}}</strong> cho thiết bị <strong>{{device_name}}</strong> (Số Serial: {{serial_number}}) đã được xử lý hoàn tất bởi kỹ thuật viên <strong>{{technician_name}}</strong>.</p><p>Nội dung nghiệm thu: <em>{{inspection_summary}}</em>.</p><p>Thiết bị đã được kiểm định đầy đủ 4 tiêu chí an toàn và sẵn sàng bàn giao lại cho bạn.</p>',
    variables: 'customer_name, claim_id, device_name, serial_number, technician_name, inspection_summary, hotline',
    is_active: true,
    updated_at: new Date().toISOString()
  },
  {
    id: 'tpl-006',
    code: 'DEVICE_ALERT_CRITICAL',
    name: 'Cảnh Báo Sự Cố Thiết Bị IoT Khẩn Cấp',
    description: 'Thông báo đẩy / Email gửi tức thì khi cảm biến phát hiện nắp kẹt hoặc pin yếu dưới 15%',
    channel: 'push',
    subject: '🚨 [SmartBox Cảnh Báo] Phát hiện sự cố trạm {{device_name}}',
    body: 'Cảnh báo: Trạm SmartBox [{{device_name}} - {{serial_number}}] phát hiện sự cố: {{alert_type}} lúc {{time_occurred}} (Mức pin: {{battery_level}}%). Vui lòng kiểm tra trên ứng dụng quản trị!',
    variables: 'customer_name, device_name, serial_number, alert_type, battery_level, time_occurred, hotline',
    is_active: true,
    updated_at: new Date().toISOString()
  }
];

export const templatesService = {
  async getTemplates(): Promise<MessageTemplate[]> {
    const backendData = await fetchBackend<any[]>('/settings/templates');
    if (backendData && Array.isArray(backendData) && backendData.length > 0) {
      return backendData.map(t => ({
        id: t.id,
        code: t.code,
        name: t.name || t.code,
        description: t.description || '',
        channel: t.channel || 'email',
        subject: t.subject || '',
        body: t.body || '',
        variables: t.variables || '',
        is_active: t.isActive !== false,
        updated_at: t.updatedAt || new Date().toISOString()
      }));
    }

    if (!isSupabaseConfigured) return DEFAULT_FALLBACK_TEMPLATES;
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('created_at', { ascending: true });

      if (error || !data || data.length === 0) {
        return DEFAULT_FALLBACK_TEMPLATES;
      }
      return data as MessageTemplate[];
    } catch {
      return DEFAULT_FALLBACK_TEMPLATES;
    }
  },

  async getTemplateByCode(code: string): Promise<MessageTemplate | null> {
    const backendData = await fetchBackend<any>(`/settings/templates/${code}`);
    if (backendData) {
      return {
        id: backendData.id,
        code: backendData.code,
        name: backendData.name || backendData.code,
        description: backendData.description || '',
        channel: backendData.channel || 'email',
        subject: backendData.subject || '',
        body: backendData.body || '',
        variables: backendData.variables || '',
        is_active: backendData.isActive !== false,
        updated_at: backendData.updatedAt || new Date().toISOString()
      };
    }
    const all = await this.getTemplates();
    return all.find(t => t.code === code) || null;
  },

  async saveTemplate(template: Partial<MessageTemplate>): Promise<{ success: boolean; data?: MessageTemplate; error?: string }> {
    try {
      const payload = {
        code: template.code,
        name: template.name,
        description: template.description,
        channel: template.channel,
        subject: template.subject,
        body: template.body,
        variables: template.variables,
        isActive: template.is_active
      };

      const res = await fetchBackend<any>('/settings/templates', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res) {
        return {
          success: true,
          data: {
            id: res.id,
            code: res.code,
            name: res.name || res.code,
            description: res.description,
            channel: res.channel,
            subject: res.subject,
            body: res.body,
            variables: res.variables,
            is_active: res.isActive !== false,
            updated_at: res.updatedAt || new Date().toISOString()
          }
        };
      }

      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('message_templates')
          .upsert([{
            code: template.code,
            name: template.name,
            description: template.description,
            channel: template.channel,
            subject: template.subject,
            body: template.body,
            variables: template.variables,
            is_active: template.is_active
          }])
          .select()
          .single();

        if (error) throw error;
        return { success: true, data: data as MessageTemplate };
      }

      return { success: true, data: template as MessageTemplate };
    } catch (err: any) {
      console.error('Error saving template:', err);
      return { success: false, error: err.message || 'Lỗi khi lưu mẫu thông báo' };
    }
  },

  async resetTemplateToDefault(code: string): Promise<{ success: boolean; data?: MessageTemplate; error?: string }> {
    try {
      const res = await fetchBackend<any>(`/settings/templates/${code}/reset-default`, {
        method: 'POST'
      });
      if (res) {
        return {
          success: true,
          data: {
            id: res.id,
            code: res.code,
            name: res.name,
            description: res.description,
            channel: res.channel,
            subject: res.subject,
            body: res.body,
            variables: res.variables,
            is_active: res.isActive !== false,
            updated_at: res.updatedAt || new Date().toISOString()
          }
        };
      }

      const defaultTpl = DEFAULT_FALLBACK_TEMPLATES.find(t => t.code === code);
      if (defaultTpl) {
        return { success: true, data: defaultTpl };
      }
      return { success: false, error: 'Không tìm thấy mẫu mặc định' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi khôi phục mẫu mặc định' };
    }
  },

  async testSendTemplate(payload: any): Promise<any> {
    try {
      const res = await fetchBackend<any>(`/settings/templates/${payload.templateCode}/test-send`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res) return res;

      return {
        success: true,
        channel: 'email',
        recipient: payload.recipientEmail || 'test@smartbox.vn',
        renderedSubject: payload.customSubject || '[SmartBox Test Notification]',
        renderedBody: payload.customBody || 'Nội dung test',
        message: 'Đã giả lập gửi thử nghiệm thành công!',
        isRealSent: false
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Lỗi khi gửi thử nghiệm'
      };
    }
  }
};

