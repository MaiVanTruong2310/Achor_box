import { adminRequest } from './adminRequest';
import { Product, ProductCategory, ProductVariant, ProductSEO, StockTransaction, Coupon, ValidateCouponResponse, ProductCombo, Order, Device, DeviceEvent, WarrantyClaim, Profile, AuditLog, UserRole, OrderStatus, ClaimStatus, DeviceStatus, Customer360Details, MessageTemplate } from '../types/database';
const BACKEND_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8080/api';
async function fetchBackend<T>(path: string, options?: RequestInit): Promise<T | null> { return adminRequest<T>(path, options); }
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
    monthlyRevenue: {
        month: string;
        label: string;
        revenue: number;
        orders: number;
    }[];
    productSales: {
        id: string;
        name: string;
        sub: string;
        percent: number;
        revenue: number;
        color: string;
    }[];
    recentOrders: Order[];
}
// Client-side Memory Cache for Dashboard Data (Zero-latency instant toggling between 7d / 30d / 6m)
const dashboardCache = new Map<string, {
    data: DashboardStats;
    timestamp: number;
}>();
const DASHBOARD_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
export const dashboardService = {
    // Clear cache manually if needed (e.g. after adding order or warranty)
    clearCache(): void {
        dashboardCache.clear();
    },
    async getDashboardData(range: string = '6m', forceRefresh: boolean = false): Promise<DashboardStats> {
        const cacheKey = range.toLowerCase();
        if (!forceRefresh && dashboardCache.has(cacheKey)) {
            const cached = dashboardCache.get(cacheKey)!;
            if (Date.now() - cached.timestamp < DASHBOARD_CACHE_TTL_MS) {
                return cached.data;
            }
        }
        const backendData = await fetchBackend<DashboardStats>(`/dashboard/stats?range=${encodeURIComponent(cacheKey)}`);
        if (backendData) {
            dashboardCache.set(cacheKey, { data: backendData, timestamp: Date.now() });
            return backendData;
        }
        throw new Error("Phản hồi backend không hợp lệ.");
    }
};
// ==============================================================================
// 2. PRODUCTS SERVICE
// ==============================================================================
export interface ExtendedProduct extends Product {
    category_name?: string;
    manager_id?: string | null;
    has_weight_sensor?: boolean;
}

export interface PagedResult<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    pageNumber: number;
    pageSize: number;
}

export function mapBackendProduct(p: any): ExtendedProduct {
    return {
        id: p.id,
        category_id: p.categoryId,
        category_name: p.categoryName || '',
        manager_id: p.managerId || null,
        has_weight_sensor: p.hasWeightSensor ?? false,
        sku: p.sku,
        name: p.name,
        description: p.description,
        price: p.price,
        images: Array.isArray(p.images) ? p.images : (p.images ? [p.images] : []),
        stock_quantity: p.variants?.length ? p.variants.reduce((sum: number, v: any) => sum + Number(v.stockQuantity || 0), 0) : p.stockQuantity ?? 0,
        is_active: p.isActive ?? true,
        created_at: p.createdAt,
        variants: Array.isArray(p.variants) ? p.variants.map((v: any) => ({
            id: v.id,
            product_id: v.productId,
            variant_name: v.variantName,
            sku: v.sku,
            name: v.variantName,
            price_delta: Number(v.priceDelta || 0),
            price_adjustment: Number(v.priceDelta || 0),
            calculated_price: Number(v.calculatedPrice || 0),
            stock_quantity: Number(v.stockQuantity || 0),
            width_cm: v.widthCm != null ? Number(v.widthCm) : undefined,
            height_cm: v.heightCm != null ? Number(v.heightCm) : undefined,
            depth_cm: v.depthCm != null ? Number(v.depthCm) : undefined,
            weight_kg: v.weightKg != null ? Number(v.weightKg) : undefined,
            max_load_kg: v.maxLoadKg != null ? Number(v.maxLoadKg) : undefined,
            capacity_liter: v.capacityLiter != null ? Number(v.capacityLiter) : undefined,
            model_tier: v.modelTier || undefined,
            warranty_months: v.warrantyMonths != null ? Number(v.warrantyMonths) : undefined,
            has_weight_sensor: v.hasWeightSensor ?? false,
            images: Array.isArray(v.images) ? v.images : []
        })) : []
    };
}

export const productsService = {
    async getCategories(): Promise<ProductCategory[]> {
        const backendCategories = await fetchBackend<ProductCategory[]>('/products/categories');
        if (backendCategories) {
            return backendCategories;
        }
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async getProducts(): Promise<ExtendedProduct[]> {
        const backendProducts = await fetchBackend<any[]>('/products');
        if (backendProducts && Array.isArray(backendProducts)) {
            return backendProducts.map(mapBackendProduct);
        }
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async getProductById(id: string): Promise<ExtendedProduct> {
        const backendProduct = await fetchBackend<any>(`/products/${id}`);
        if (backendProduct) {
            return mapBackendProduct(backendProduct);
        }
        throw new Error("Không thể tải thông tin sản phẩm.");
    },
    async getProductsPaged(params?: {
        page?: number;
        size?: number;
        categoryId?: string;
        search?: string;
    }): Promise<PagedResult<ExtendedProduct>> {
        const page = params?.page ?? 0;
        const size = params?.size ?? 10;
        const queryParams = new URLSearchParams();
        queryParams.set('page', String(page));
        queryParams.set('size', String(size));
        if (params?.categoryId && params.categoryId !== 'all') {
            queryParams.set('categoryId', params.categoryId);
        }
        if (params?.search && params.search.trim()) {
            queryParams.set('search', params.search.trim());
        }
        const res = await fetchBackend<any>(`/products/paged?${queryParams.toString()}`);
        if (res) {
            const rawContent = Array.isArray(res.content) ? res.content : [];
            return {
                content: rawContent.map(mapBackendProduct),
                totalElements: Number(res.totalElements ?? rawContent.length),
                totalPages: Number(res.totalPages ?? 1),
                pageNumber: Number(res.currentPage ?? page),
                pageSize: Number(res.pageSize ?? size)
            };
        }
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async createProduct(product: Partial<Product>): Promise<{
        data: Product | null;
        error: string | null;
    }> {
        const payload = {
            categoryId: product.category_id,
            managerId: (product as any).manager_id || null,
            hasWeightSensor: (product as any).has_weight_sensor ?? false,
            sku: product.sku,
            name: product.name,
            description: product.description || '',
            price: product.price,
            stockQuantity: product.stock_quantity ?? 0,
            isActive: product.is_active ?? true,
            images: Array.isArray(product.images) ? product.images : (product.images ? [product.images] : []),
            variants: Array.isArray(product.variants) ? product.variants.map((v: any) => ({
                variantName: v.variant_name || v.name || v.sku,
                sku: v.sku,
                priceDelta: Number(v.price_delta ?? v.price_adjustment ?? 0),
                stockQuantity: Number(v.stock_quantity ?? 0)
            })) : []
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
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async updateProduct(id: string, updates: Partial<Product>): Promise<{
        success: boolean;
        error: string | null;
    }> {
        const payload = {
            categoryId: updates.category_id,
            managerId: (updates as any).manager_id || null,
            hasWeightSensor: (updates as any).has_weight_sensor,
            sku: updates.sku,
            name: updates.name,
            description: updates.description,
            price: updates.price,
            isActive: updates.is_active,
            images: updates.images,
            variants: Array.isArray(updates.variants) ? updates.variants.map((v: any) => ({
                id: v.id,
                variantName: v.variant_name || v.name || v.sku,
                sku: v.sku,
                priceDelta: Number(v.price_delta ?? v.price_adjustment ?? 0),
                ...(v.id ? {} : { stockQuantity: Number(v.stock_quantity ?? 0) })
            })) : undefined
        };
        const res = await fetchBackend<any>(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        if (res)
            return { success: true, error: null };
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async deleteProduct(id: string): Promise<{
        success: boolean;
        error: string | null;
    }> {
        const res = await fetchBackend<any>(`/products/${id}`, { method: 'DELETE' });
        if (res !== null)
            return { success: true, error: null };
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async updateStock(id: string, delta: number, reason: string = 'Điều chỉnh trực tiếp'): Promise<{
        success: boolean;
        error: string | null;
    }> {
        await fetchBackend('/products/' + id + '/stock', { method: 'PATCH', body: JSON.stringify({ delta, reason }) });
        return { success: true, error: null };
    },
    async adjustVariantStock(productId: string, variantId: string, delta: number, reason: string = 'Điều chỉnh trực tiếp'): Promise<any> {
        return fetchBackend(`/products/${productId}/variants/${variantId}/stock`, {
            method: 'PATCH',
            body: JSON.stringify({ delta, reason })
        });
    },
    async getProductInventoryHistory(productId: string): Promise<any[]> {
        const rows = await fetchBackend<any[]>(`/products/${productId}/inventory-history`);
        return rows || [];
    },
    async uploadImage(file: File): Promise<string> {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetchBackend<{ url: string }>('/products/images', {
            method: 'POST',
            body: formData
        });
        return res?.url || '';
    },
    async getProductManagers(): Promise<{ id: string; fullName: string; email: string }[]> {
        try {
            const res = await fetchBackend<any>('/users/paged?role=product_manager&size=100');
            return (res?.content || []).map((u: any) => ({
                id: u.id,
                fullName: u.fullName || u.email,
                email: u.email
            }));
        } catch {
            return [];
        }
    },
    async createCategory(category: { name: string; slug?: string; description?: string; managerId?: string | null; manager_id?: string | null }): Promise<ProductCategory> {
        const payload = {
            ...category,
            managerId: category.managerId || category.manager_id || null
        };
        const res = await fetchBackend<ProductCategory>('/products/categories', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        if (res) return res;
        throw new Error("Không thể tạo danh mục mới.");
    },
    async updateCategory(id: string, category: { name: string; slug?: string; description?: string; managerId?: string | null; manager_id?: string | null }): Promise<ProductCategory> {
        const payload = {
            ...category,
            managerId: category.managerId || category.manager_id || null
        };
        const res = await fetchBackend<ProductCategory>(`/products/categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        if (res) return res;
        throw new Error("Không thể cập nhật danh mục.");
    },
    async deleteCategory(id: string): Promise<void> {
        await fetchBackend(`/products/categories/${id}`, {
            method: 'DELETE'
        });
    },
    async updateVariantSpecifications(productId: string, variantId: string, specs: {
        widthCm?: number;
        heightCm?: number;
        depthCm?: number;
        weightKg?: number;
        maxLoadKg?: number;
        capacityLiter?: number;
        modelTier?: string;
        warrantyMonths?: number;
        images?: string[];
    }): Promise<any> {
        return fetchBackend(`/products/${productId}/variants/${variantId}/specifications`, {
            method: 'PATCH',
            body: JSON.stringify(specs)
        });
    },
    async seedStandardProducts(): Promise<void> {
        const cats = await this.getCategories();
        const mainCat = cats.find(c => c.slug === 'tu-nhan-hang-thong-minh') || cats[0];
        const catId = mainCat ? mainCat.id : undefined;

        await this.createProduct({
            name: 'Tủ Nhận Hàng Thông Minh SmartBox Home Standard',
            sku: 'SBX-STD-01',
            category_id: catId,
            price: 3490000,
            description: 'Tủ giao nhận bưu kiện thông minh chuyên biệt cho nhà phố và hộ gia đình. Tích hợp mã OTP, mở khóa từ xa và thông báo tức thì khi có hàng.',
            is_active: true,
            images: ['https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80'],
            variants: [
                { variant_name: 'Size S (Tiêu Chuẩn - 45L)', sku: 'SBX-STD-S', price_delta: 0, stock_quantity: 15 } as any,
                { variant_name: 'Size M (Gia Đình - 70L)', sku: 'SBX-STD-M', price_delta: 500000, stock_quantity: 25 } as any,
                { variant_name: 'Size L (Dung Tích Lớn - 110L)', sku: 'SBX-STD-L', price_delta: 1200000, stock_quantity: 10 } as any,
            ]
        } as any);

        await this.createProduct({
            name: 'Tủ Nhận Hàng Thông Minh SmartBox Pro Flagship',
            sku: 'SBX-PRO-02',
            category_id: catId,
            price: 5890000,
            description: 'Dòng tủ thông minh cao cấp tích hợp module cảm biến cân trọng lượng điện tử, xác thực chính xác khối lượng bưu kiện và chống trộm quang học.',
            is_active: true,
            has_weight_sensor: true,
            images: ['https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80'],
            variants: [
                { variant_name: 'Size M Pro (Cảm Biến Cân - 70L)', sku: 'SBX-PRO-M', price_delta: 0, stock_quantity: 20 } as any,
                { variant_name: 'Size L Pro (Cảm Biến Cân - 120L)', sku: 'SBX-PRO-L', price_delta: 900000, stock_quantity: 12 } as any,
            ]
        } as any);

        await this.createProduct({
            name: 'Tủ Nhận Hàng Thông Minh SmartBox Mini Eco',
            sku: 'SBX-MINI-03',
            category_id: catId,
            price: 2490000,
            description: 'Tủ nhận bưu phẩm nhỏ gọn tiết kiệm không gian, phù hợp chung cư hoặc cửa hàng nhỏ, lắp đặt treo tường hoặc chân đế linh hoạt.',
            is_active: true,
            images: ['https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80'],
            variants: [
                { variant_name: 'Size Mini (30L)', sku: 'SBX-MINI-S', price_delta: 0, stock_quantity: 30 } as any,
            ]
        } as any);

        const refreshed = await this.getProducts();
        for (const prod of refreshed) {
            for (const v of prod.variants || []) {
                if (v.sku === 'SBX-STD-S') {
                    await this.updateVariantSpecifications(prod.id, v.id, {
                        widthCm: 42, heightCm: 70, depthCm: 38, weightKg: 16, maxLoadKg: 35, capacityLiter: 45, modelTier: 'BASE', warrantyMonths: 24
                    });
                } else if (v.sku === 'SBX-STD-M') {
                    await this.updateVariantSpecifications(prod.id, v.id, {
                        widthCm: 48, heightCm: 95, depthCm: 42, weightKg: 22, maxLoadKg: 50, capacityLiter: 70, modelTier: 'BASE', warrantyMonths: 24
                    });
                } else if (v.sku === 'SBX-STD-L') {
                    await this.updateVariantSpecifications(prod.id, v.id, {
                        widthCm: 55, heightCm: 120, depthCm: 48, weightKg: 30, maxLoadKg: 80, capacityLiter: 110, modelTier: 'BASE', warrantyMonths: 24
                    });
                } else if (v.sku === 'SBX-PRO-M') {
                    await this.updateVariantSpecifications(prod.id, v.id, {
                        widthCm: 48, heightCm: 95, depthCm: 42, weightKg: 25, maxLoadKg: 60, capacityLiter: 70, modelTier: 'PRO', warrantyMonths: 36
                    });
                } else if (v.sku === 'SBX-PRO-L') {
                    await this.updateVariantSpecifications(prod.id, v.id, {
                        widthCm: 58, heightCm: 125, depthCm: 50, weightKg: 35, maxLoadKg: 100, capacityLiter: 120, modelTier: 'PRO', warrantyMonths: 36
                    });
                } else if (v.sku === 'SBX-MINI-S') {
                    await this.updateVariantSpecifications(prod.id, v.id, {
                        widthCm: 38, heightCm: 55, depthCm: 32, weightKg: 12, maxLoadKg: 25, capacityLiter: 30, modelTier: 'BASE', warrantyMonths: 18
                    });
                }
            }
        }
    },
    // ---------------------------------------------------------
    // Coupons / Mã Khuyến Mãi
    // ---------------------------------------------------------
    async getCoupons(): Promise<Coupon[]> {
        const backendCoupons = await fetchBackend<any[]>('/promotions');
        if (backendCoupons && Array.isArray(backendCoupons)) {
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
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async saveCoupon(coupon: Coupon): Promise<Coupon> {
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
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async deleteCoupon(id: string): Promise<boolean> {
        await fetchBackend('/promotions/' + id, { method: 'DELETE' });
        return true;
    },
    async toggleCoupon(id: string): Promise<Coupon | null> {
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
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async validateCoupon(code: string, orderTotal: number): Promise<ValidateCouponResponse> {
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
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    // ---------------------------------------------------------
    // Combos & Gói Sản Phẩm
    // ---------------------------------------------------------
    async getCombos(): Promise<ProductCombo[]> {
        throw new Error('Chức năng combo chưa có API backend.');
    },
    async saveCombo(combo: ProductCombo): Promise<ProductCombo> {
        throw new Error('Chức năng combo chưa có API backend.');
    },
    async deleteCombo(id: string): Promise<boolean> {
        throw new Error('Chức năng combo chưa có API backend.');
    },
    // ---------------------------------------------------------
    // Stock Transactions / Lịch Sử Xuất Nhập Kho
    // ---------------------------------------------------------
    async getStockTransactions(): Promise<StockTransaction[]> {
        const rows = await fetchBackend<any[]>('/products/inventory-movements');
        return (rows || []).map(r => ({ id: r.id, product_id: r.productId, product_name: r.productName, sku: r.sku, transaction_type: r.delta > 0 ? 'in' as const : 'out' as const, delta: r.delta, previous_stock: r.previousStock, new_stock: r.newStock, reason: r.reason, created_at: r.createdAt, created_by: r.actorName || 'Hệ thống' }));
    },
    async getStockTransactionsPaged(page: number = 0, size: number = 20): Promise<PagedResult<StockTransaction>> {
        const res = await fetchBackend<any>(`/products/inventory-movements?paged=true&page=${page}&size=${size}`);
        if (res) {
            const rows = Array.isArray(res.content) ? res.content : [];
            return {
                content: rows.map((r: any) => ({
                    id: r.id,
                    product_id: r.productId,
                    product_name: r.productName,
                    sku: r.sku,
                    transaction_type: r.delta > 0 ? ('in' as const) : ('out' as const),
                    delta: r.delta,
                    previous_stock: r.previousStock,
                    new_stock: r.newStock,
                    reason: r.reason,
                    created_at: r.createdAt,
                    created_by: r.actorName || 'Hệ thống'
                })),
                totalElements: Number(res.totalElements ?? rows.length),
                totalPages: Number(res.totalPages ?? 1),
                pageNumber: Number(res.pageNumber ?? page),
                pageSize: Number(res.pageSize ?? size)
            };
        }
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async addStockTransaction(tx: StockTransaction): Promise<void> {
        throw new Error('Dùng thao tác điều chỉnh kho từng SKU; backend tự ghi lịch sử.');
    }
};
// ==============================================================================
// 3. ORDERS SERVICE
// ==============================================================================
export interface ExtendedOrder extends Order {
    payment_method?: 'vnpay' | 'vnpay_sandbox' | 'mock' | 'cod' | 'bank_transfer' | 'momo';
    payment_status?: 'paid' | 'pending' | 'refunded';
    transaction_ref?: string;
    items_summary?: string;
}
export const ordersService = {
    async getOrders(): Promise<ExtendedOrder[]> {
        const backendOrders = await fetchBackend<any[]>('/orders');
        if (backendOrders) {
            return backendOrders.map(o => ({
                id: o.id,
                user_id: o.userId,
                promotion_id: o.promotionId || null,
                status: o.status,
                shipping_address: o.shippingAddress,
                tracking_number: o.trackingNumber,
                total: o.total,
                payment_method: o.paymentMethod || undefined,
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
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async updateOrderStatus(id: string, status: OrderStatus): Promise<{
        success: boolean;
        error: string | null;
    }> {
        if (status !== 'cancelled')
            return { success: false, error: 'Trạng thái thanh toán, phê duyệt và hoàn thành phải được cập nhật qua quy trình backend. Hoàn thành tại module Giao & Lắp đặt sau nghiệm thu.' };
        const res = await fetchBackend<any>(`/orders/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
        if (res)
            return { success: true, error: null };
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async updateTrackingNumber(id: string, tracking_number: string): Promise<{
        success: boolean;
        error: string | null;
    }> {
        const res = await fetchBackend<any>(`/orders/${id}/tracking`, {
            method: 'PATCH',
            body: JSON.stringify({ trackingNumber: tracking_number })
        });
        if (res)
            return { success: true, error: null };
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async getOrderById(id: string): Promise<any> {
        const backendOrder = await fetchBackend<any>(`/orders/${id}`);
        if (backendOrder) {
            return backendOrder;
        }
        throw new Error("Không thể tải thông tin đơn hàng.");
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
        if (backendDevices) {
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
                door_status: d.doorStatus || 'closed',
                weight_kg: Number(d.weightKg ?? 0),
                package_detected: Boolean(d.packageDetected),
                scale_ready: Boolean(d.scaleReady),
                device_state: d.deviceState || 'starting',
                mqtt_topic_id: d.mqttTopicId || '',
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
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async getDeviceEvents(deviceId?: string): Promise<DeviceEvent[]> {
        const url = deviceId ? `/devices/events?deviceId=${deviceId}` : '/devices/events';
        const backendEvents = await fetchBackend<any[]>(url);
        if (backendEvents) {
            return backendEvents.map(e => ({
                id: e.id,
                device_id: e.deviceId,
                event_type: e.eventType,
                payload: typeof e.payload === 'string' ? JSON.parse(e.payload || '{}') : e.payload,
                created_at: e.createdAt
            }));
        }
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async updateDeviceStatus(id: string, status: DeviceStatus): Promise<{
        success: boolean;
        error: string | null;
    }> {
        const res = await fetchBackend<any>(`/devices/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
        if (res)
            return { success: true, error: null };
        throw new Error("Phản hồi backend không hợp lệ.");
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
export interface WarrantyLookupResult {
    serialNumber: string;
    productName: string;
    variantName: string;
    status: 'active' | 'expired' | 'pending_activation' | string;
    statusLabel: string;
    startDate: string;
    endDate: string;
    remainingDays: number;
    isValid: boolean;
    ownerNameMasked: string;
    ownerPhoneMasked: string;
    locationLabel: string;
    deviceStatus: string;
    hardwareSpecs: string[];
    features: string[];
}
export const warrantiesService = {
    async getClaims(): Promise<ExtendedWarrantyClaim[]> {
        const rows = await fetchBackend<any[]>('/warranties/claims');
        return (rows || []).map(c => ({ id: c.id, warranty_id: c.warrantyId, description: c.description, images: c.images || [], status: c.status, assigned_to: c.assignedTo, internal_notes: c.internalNotes, created_at: c.createdAt, resolved_at: c.resolvedAt, serial_number: c.serialNumber, device_name: c.deviceName, customer_name: c.customerName, customer_phone: c.customerPhone, customer_address: c.customerAddress, fault_category: c.faultCategory, technician_name: c.assigneeName, technician_phone: c.assigneePhone }));
    },
    async updateClaimFull(claimId: string, updates: Partial<ExtendedWarrantyClaim>): Promise<{
        success: boolean;
        error: string | null;
    }> {
        if (updates.assigned_to !== undefined) {
            if (!updates.assigned_to)
                throw new Error('Chọn kỹ thuật viên trước khi phân công.');
            await fetchBackend('/warranties/claims/' + claimId + '/assign', { method: 'PATCH', body: JSON.stringify({ technicianId: updates.assigned_to }) });
        }
        if (updates.internal_notes !== undefined)
            await fetchBackend('/warranties/claims/' + claimId + '/notes', { method: 'PATCH', body: JSON.stringify({ notes: updates.internal_notes }) });
        if (updates.status)
            await fetchBackend('/warranties/claims/' + claimId + '/status', { method: 'PATCH', body: JSON.stringify({ status: updates.status }) });
        return { success: true, error: null };
    },
    async assignTechnician(claimId: string, technicianId: string | null): Promise<{
        success: boolean;
        error: string | null;
    }> {
        return this.updateClaimFull(claimId, { assigned_to: technicianId, status: 'in_progress' });
    },
    async updateClaimStatus(claimId: string, status: ClaimStatus): Promise<{
        success: boolean;
        error: string | null;
    }> {
        return this.updateClaimFull(claimId, { status });
    },
    async addInternalNote(claimId: string, note: string): Promise<{
        success: boolean;
        error: string | null;
    }> {
        return this.updateClaimFull(claimId, { internal_notes: note });
    },
    async lookupWarranty(serial: string): Promise<WarrantyLookupResult> {
        const cleanSerial = serial.trim().toUpperCase();
        const data = await fetchBackend<WarrantyLookupResult>(`/warranties/lookup?serial=${encodeURIComponent(cleanSerial)}`);
        if (data)
            return data;
        throw new Error("Phản hồi backend không hợp lệ.");
    }
};
// ==============================================================================
// 6. USERS SERVICE
// ==============================================================================
export const usersService = {
    async getUsers(): Promise<Profile[]> {
        const backendUsers = await fetchBackend<any[]>('/users');
        if (backendUsers) {
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
        throw new Error("Phản hồi backend không hợp lệ.");
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
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async sendResetPasswordOtp(id: string): Promise<{
        success: boolean;
        message: string;
        email?: string;
        previewOtp?: string;
    }> {
        const res = await fetchBackend<any>(`/users/${id}/send-reset-otp`, { method: 'POST' });
        if (res)
            return res;
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async verifyOtpAndResetPassword(id: string, otp: string, newPassword?: string): Promise<{
        success: boolean;
        message: string;
        updatedPassword?: string;
    }> {
        const res = await fetchBackend<any>(`/users/${id}/verify-reset-password`, {
            method: 'POST',
            body: JSON.stringify({ otp, newPassword })
        });
        if (res)
            return res;
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async toggleUserLock(id: string, currentLockState: boolean, reason?: string): Promise<{
        success: boolean;
        error: string | null;
    }> {
        const res = await fetchBackend<any>(`/users/${id}/toggle-lock`, {
            method: 'PATCH',
            body: JSON.stringify({ isLocked: !currentLockState, reason })
        });
        if (res)
            return { success: true, error: null };
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async updateUserRole(id: string, role: UserRole): Promise<{
        success: boolean;
        error: string | null;
    }> {
        const res = await fetchBackend<any>(`/users/${id}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role })
        });
        if (res)
            return { success: true, error: null };
        throw new Error("Phản hồi backend không hợp lệ.");
    }
};
// ==============================================================================
// 7. AUDIT LOGS SERVICE
// ==============================================================================
export const auditLogsService = {
    async getLogs(): Promise<AuditLog[]> {
        const backendLogs = await fetchBackend<any[]>('/audit-logs');
        if (backendLogs) {
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
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async logAction(action: string, targetTable: string, targetId: string, meta?: Record<string, any>): Promise<void> {
        await fetchBackend('/audit-logs', { method: 'POST', body: JSON.stringify({ action, targetTable, targetId, meta: JSON.stringify(meta || {}) }) });
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
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async saveSetting(key: string, value: any): Promise<{
        success: boolean;
        error: string | null;
    }> {
        if (key !== 'notification_templates')
            throw new Error('Dùng API cấu hình danh mục tương ứng.');
        await fetchBackend('/settings/templates', { method: 'POST', body: JSON.stringify({ code: 'ORDER_CONFIRMED', channel: 'email', subject: value.email_subject, body: value.claim_received || '' }) });
        return { success: true, error: null };
    }
};
// ==============================================================================
// 9. TEMPLATES SERVICE
// ==============================================================================
export const templatesService = {
    async getTemplates(): Promise<MessageTemplate[]> {
        const backendData = await fetchBackend<any[]>('/settings/templates');
        if (backendData && Array.isArray(backendData)) {
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
        throw new Error("Phản hồi backend không hợp lệ.");
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
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async saveTemplate(template: Partial<MessageTemplate>): Promise<{
        success: boolean;
        data?: MessageTemplate;
        error?: string;
    }> {
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
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async resetTemplateToDefault(code: string): Promise<{
        success: boolean;
        data?: MessageTemplate;
        error?: string;
    }> {
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
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async testSendTemplate(payload: any): Promise<any> {
        const res = await fetchBackend<any>(`/settings/templates/${payload.templateCode}/test-send`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        if (res)
            return res;
        throw new Error("Phản hồi backend không hợp lệ.");
    }
};

