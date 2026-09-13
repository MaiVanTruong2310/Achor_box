export type UserRole = 
  | 'customer'
  | 'super_admin'
  | 'product_manager'
  | 'support_agent'
  | 'technician'
  | 'accountant';

export const ROLE_DEFAULT_ROUTES: Record<UserRole, string> = {
  super_admin: '/dashboard',
  technician: '/devices',
  product_manager: '/products',
  support_agent: '/warranties',
  accountant: '/orders',
  customer: '/403',
};

export const getRoleDefaultPath = (role: UserRole): string => {
  return ROLE_DEFAULT_ROUTES[role] || '/dashboard';
};

export type DeviceStatus = 'online' | 'offline' | 'maintenance' | 'error';
export type AccessLevel = 'view_only' | 'full_control';
export type PinType = 'permanent' | 'temporary' | 'one_time';
export type OrderStatus = 'pending' | 'processing' | 'shipping' | 'completed' | 'cancelled' | 'refunded';
export type WarrantyStatus = 'active' | 'expired' | 'void';
export type ClaimStatus = 'new' | 'in_progress' | 'resolved' | 'rejected';
export type ReviewStatus = 'pending' | 'approved' | 'hidden';

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  email?: string | null;
  avatar_url: string | null;
  default_address: string | null;
  role: UserRole;
  is_locked: boolean;
  is_2fa_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  product_id: string | null;
  owner_id: string | null;
  serial_number: string;
  name: string | null;
  location_label: string | null;
  status: DeviceStatus;
  battery_level: number | null;
  firmware_version: string | null;
  last_seen_at: string | null;
  created_at: string;
  owner?: Profile;
}

export interface DeviceEvent {
  id: string;
  device_id: string;
  event_type: string;
  payload: Record<string, any> | null;
  created_at: string;
}

export interface DeviceOtaUpdate {
  id: string;
  device_id: string;
  firmware_version: string;
  status: 'pending' | 'downloading' | 'success' | 'failed';
  triggered_by: string | null;
  created_at: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  color?: string;
  color_code?: string;
  firmware_version?: string;
  capacity?: string;
  price_adjustment: number;
  stock_quantity: number;
  image_url?: string;
}

export interface ProductSEO {
  meta_title: string;
  meta_description: string;
  slug: string;
  keywords?: string[];
  canonical_url?: string;
  og_image?: string;
}

export interface Product {
  id: string;
  category_id: string | null;
  sku: string;
  name: string;
  description: string | null;
  price: number;
  discount_price?: number | null;
  images: string[] | null;
  stock_quantity: number;
  is_active: boolean;
  is_featured?: boolean;
  variants?: ProductVariant[];
  seo?: ProductSEO;
  created_at: string;
}

export interface StockTransaction {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  transaction_type: 'in' | 'out';
  delta: number;
  previous_stock: number;
  new_stock: number;
  reason: string;
  created_at: string;
  created_by: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  min_order_value?: number;
  max_discount?: number;
  start_date: string;
  end_date: string;
  usage_limit: number;
  used_count: number;
  is_active: boolean;
}

export interface ValidateCouponResponse {
  isValid: boolean;
  message: string;
  code?: string;
  discountType?: 'percentage' | 'fixed_amount';
  discountValue?: number;
  discountAmount: number;
  originalTotal: number;
  finalTotal: number;
  promotionId?: string;
}

export interface ProductCombo {
  id: string;
  name: string;
  description: string;
  product_ids: string[];
  product_names: string[];
  original_price: number;
  combo_price: number;
  discount_percent: number;
  image_url?: string;
  is_active: boolean;
}

export interface Order {
  id: string;
  user_id: string | null;
  status: OrderStatus;
  shipping_address: string | null;
  tracking_number: string | null;
  promotion_id: string | null;
  total: number;
  created_at: string;
  updated_at: string;
  customer?: Profile;
}

export interface WarrantyClaim {
  id: string;
  warranty_id: string;
  description: string;
  images: string[] | null;
  status: ClaimStatus;
  assigned_to: string | null;
  internal_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  assignee?: Profile;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  meta: Record<string, any> | null;
  created_at: string;
  actor?: Profile;
}

export interface Customer360Details {
  profile: Profile;
  orders: Order[];
  devices: Device[];
  warranty_claims: WarrantyClaim[];
}

export type TemplateChannel = 'email' | 'sms' | 'push';

export interface MessageTemplate {
  id: string;
  code: string;
  name?: string | null;
  description?: string | null;
  channel: TemplateChannel | string;
  subject?: string | null;
  body: string;
  variables?: string | null;
  is_active?: boolean | null;
  updated_at?: string | null;
}

export interface TestSendTemplatePayload {
  templateCode: string;
  recipientEmail?: string;
  recipientPhone?: string;
  customSubject?: string;
  customBody?: string;
  mockVariables?: Record<string, string>;
}

export interface TestSendResponse {
  success: boolean;
  channel: string;
  recipient: string;
  renderedSubject: string;
  renderedBody: string;
  message: string;
  isRealSent?: boolean;
}

