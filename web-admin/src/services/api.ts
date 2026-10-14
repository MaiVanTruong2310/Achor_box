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
        if (backendProducts) {
            return backendProducts.map(p => ({
                id: p.id,
                category_id: p.categoryId,
                category_name: p.categoryName || '',
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
                    stock_quantity: Number(v.stockQuantity || 0)
                })) : []
            }));
        }
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async createProduct(product: Partial<Product>): Promise<{
        data: Product | null;
        error: string | null;
    }> {
        const payload = {
            categoryId: product.category_id,
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
    async updateStock(id: string, delta: number, reason: string = 'Điều chỉnh trực tiếp', author: string = 'Admin'): Promise<{
        success: boolean;
        error: string | null;
    }> {
        await fetchBackend('/products/' + id + '/stock', { method: 'PATCH', body: JSON.stringify({ delta }) });
        return { success: true, error: null };
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
// ==============================================================
// CMS CONTENT & MARKETING SERVICE
// ==============================================================
export interface ArticleItem {
    id: string;
    title: string;
    slug: string;
    category: string;
    summary: string;
    content: string;
    coverImage?: string;
    authorName?: string;
    status: 'published' | 'draft' | 'archived';
    viewCount: number;
    tags?: string[];
    publishedAt?: string;
    createdAt?: string;
    updatedAt?: string;
}
export interface BannerItem {
    id: string;
    title: string;
    imageUrl: string;
    targetUrl?: string;
    position: string;
    displayOrder: number;
    isActive: boolean;
    clickCount: number;
    startDate?: string;
    endDate?: string;
    createdAt?: string;
    updatedAt?: string;
}
export interface ReviewItem {
    id: string;
    productId?: string;
    productName: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    rating: number;
    title?: string;
    comment: string;
    images?: string[];
    status: 'pending' | 'approved' | 'rejected';
    rejectReason?: string;
    adminReply?: string;
    adminRepliedAt?: string;
    createdAt?: string;
}
export interface FaqItem {
    id: string;
    question: string;
    answer: string;
    category: string;
    displayOrder: number;
    isPublished: boolean;
    helpfulCount: number;
    createdAt?: string;
    updatedAt?: string;
}
export interface ContentSummaryStats {
    totalArticles: number;
    publishedArticles: number;
    totalBanners: number;
    activeBanners: number;
    totalReviews: number;
    pendingReviews: number;
    totalFaqs: number;
}
export const contentService = {
    // --- STATS ---
    async getSummaryStats(): Promise<ContentSummaryStats> {
        const res = await fetchBackend<ContentSummaryStats>('/content/summary');
        if (res)
            return res;
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    // --- ARTICLES ---
    async getArticles(category?: string, status?: string): Promise<ArticleItem[]> {
        const params = new URLSearchParams();
        if (category && category !== 'all')
            params.append('category', category);
        if (status && status !== 'all')
            params.append('status', status);
        const res = await fetchBackend<ArticleItem[]>(`/content/articles?${params.toString()}`);
        if (res)
            return res;
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async createArticle(data: Partial<ArticleItem>): Promise<ArticleItem> {
        const res = await fetchBackend<ArticleItem>('/content/articles', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (res)
            return res;
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async updateArticle(id: string, data: Partial<ArticleItem>): Promise<ArticleItem | null> {
        const res = await fetchBackend<ArticleItem>(`/content/articles/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        if (res)
            return res;
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async deleteArticle(id: string): Promise<boolean> { await fetchBackend('/content/articles/' + id, { method: 'DELETE' }); return true; },
    // --- BANNERS ---
    async getBanners(position?: string, activeOnly?: boolean): Promise<BannerItem[]> {
        const params = new URLSearchParams();
        if (position && position !== 'all')
            params.append('position', position);
        if (activeOnly)
            params.append('activeOnly', 'true');
        const res = await fetchBackend<BannerItem[]>(`/content/banners?${params.toString()}`);
        if (res)
            return res;
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async createBanner(data: Partial<BannerItem>): Promise<BannerItem> {
        const res = await fetchBackend<BannerItem>('/content/banners', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (res)
            return res;
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async updateBanner(id: string, data: Partial<BannerItem>): Promise<BannerItem | null> {
        const res = await fetchBackend<BannerItem>(`/content/banners/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        if (res)
            return res;
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async toggleBanner(id: string): Promise<boolean> { await fetchBackend('/content/banners/' + id + '/toggle', { method: 'PATCH' }); return true; },
    async deleteBanner(id: string): Promise<boolean> { await fetchBackend('/content/banners/' + id, { method: 'DELETE' }); return true; },
    // --- REVIEWS ---
    async getReviews(status?: string): Promise<ReviewItem[]> {
        const params = new URLSearchParams();
        if (status && status !== 'all')
            params.append('status', status);
        const res = await fetchBackend<ReviewItem[]>(`/content/reviews?${params.toString()}`);
        if (res)
            return res;
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async updateReviewStatus(id: string, status: 'approved' | 'rejected' | 'pending', rejectReason?: string): Promise<ReviewItem | null> {
        const res = await fetchBackend<ReviewItem>(`/content/reviews/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status, rejectReason })
        });
        if (res)
            return res;
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async replyReview(id: string, adminReply: string): Promise<ReviewItem | null> {
        const res = await fetchBackend<ReviewItem>(`/content/reviews/${id}/reply`, {
            method: 'POST',
            body: JSON.stringify({ adminReply })
        });
        if (res)
            return res;
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async deleteReview(id: string): Promise<boolean> { await fetchBackend('/content/reviews/' + id, { method: 'DELETE' }); return true; },
    // --- FAQS ---
    async getFaqs(category?: string): Promise<FaqItem[]> {
        const params = new URLSearchParams();
        if (category && category !== 'all')
            params.append('category', category);
        const res = await fetchBackend<FaqItem[]>(`/content/faqs?${params.toString()}`);
        if (res)
            return res;
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async createFaq(data: Partial<FaqItem>): Promise<FaqItem> {
        const res = await fetchBackend<FaqItem>('/content/faqs', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (res)
            return res;
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async updateFaq(id: string, data: Partial<FaqItem>): Promise<FaqItem | null> {
        const res = await fetchBackend<FaqItem>(`/content/faqs/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        if (res)
            return res;
        throw new Error("Phản hồi backend không hợp lệ.");
    },
    async toggleFaq(id: string): Promise<boolean> { await fetchBackend('/content/faqs/' + id + '/toggle', { method: 'PATCH' }); return true; },
    async deleteFaq(id: string): Promise<boolean> { await fetchBackend('/content/faqs/' + id, { method: 'DELETE' }); return true; }
};
