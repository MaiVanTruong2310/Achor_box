import type { UserRole } from './types/database';

export const roleLabels: Record<UserRole, string> = {
  super_admin: 'Quản trị viên (Admin)',
  product_manager: 'Quản lý Kho & SP (PO)',
  technician: 'Kỹ thuật viên',
  customer: 'Khách hàng',
};

export interface NavigationItem {
  readonly path: string;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly roles: readonly UserRole[];
}

export const roleNavigation: Record<UserRole, NavigationItem[]> = {
  super_admin: [
    { path: '/admin/dashboard', label: 'Tổng quan', description: 'Chỉ số kinh doanh & vận hành', icon: 'dashboard', roles: ['super_admin'] },
    { path: '/admin/products', label: 'Sản phẩm & Kho', description: 'Danh mục, biến thể & tồn kho', icon: 'products', roles: ['super_admin'] },
    { path: '/admin/coupons', label: 'Khuyến mãi & Coupon', description: 'Mã giảm giá & Voucher', icon: 'coupons', roles: ['super_admin'] },
    { path: '/admin/orders', label: 'Quản lý đơn hàng', description: 'Theo dõi đơn hàng & tạo đơn mới', icon: 'orders', roles: ['super_admin'] },
    { path: '/admin/warranties', label: 'Quản lý Bảo hành', description: 'Yêu cầu & tra cứu bảo hành', icon: 'warranty', roles: ['super_admin'] },
    { path: '/admin/customers', label: 'Khách hàng', description: 'Hồ sơ & danh bạ khách', icon: 'users', roles: ['super_admin'] },
    { path: '/admin/users', label: 'Quản lý Nhân sự', description: 'Cán bộ & phân quyền', icon: 'permissions', roles: ['super_admin'] },
    { path: '/admin/emails', label: 'Nhật ký Email', description: 'Thông báo gửi khách', icon: 'email', roles: ['super_admin'] },
    { path: '/admin/reports', label: 'Báo cáo doanh thu', description: 'Xuất PDF / Excel', icon: 'reports', roles: ['super_admin'] },
    { path: '/admin/system', label: 'Cấu hình hệ thống', description: 'Thiết lập & Audit logs', icon: 'settings', roles: ['super_admin'] },
  ],
  product_manager: [
    { path: '/po/dashboard', label: 'Tổng quan', description: 'Chỉ số kinh doanh & tồn kho', icon: 'dashboard', roles: ['product_manager'] },
    { path: '/po/products', label: 'Sản phẩm & Kho', description: 'Danh mục, biến thể & tồn kho', icon: 'products', roles: ['product_manager'] },
    { path: '/po/approvals', label: 'Phê duyệt đơn PO', description: 'Xét duyệt đơn hàng & phiếu PO', icon: 'orders', roles: ['product_manager'] },
    { path: '/po/delivery', label: 'Điều phối & Nghiệm thu', description: 'Phân công kỹ thuật & duyệt nghiệm thu', icon: 'delivery', roles: ['product_manager'] },
    { path: '/po/coupons', label: 'Khuyến mãi & Coupon', description: 'Mã giảm giá & Voucher', icon: 'coupons', roles: ['product_manager'] },
    { path: '/po/reports', label: 'Báo cáo hàng hóa', description: 'Báo cáo Jasper loại hàng quản lý', icon: 'reports', roles: ['product_manager'] },
  ],
  technician: [
    { path: '/technician/dashboard', label: 'Tổng quan', description: 'Nhiệm vụ & chỉ số thi công', icon: 'dashboard', roles: ['technician'] },
    { path: '/technician/tasks', label: 'Công việc trong ngày', description: 'Thẻ công việc theo ngày & nộp minh chứng', icon: 'orders', roles: ['technician'] },
    { path: '/technician/delivery', label: 'Giao hàng & Lắp đặt', description: 'Tất cả ca thi công & kiểm thử thiết bị', icon: 'delivery', roles: ['technician'] },
    { path: '/technician/warranties', label: 'Quản lý Bảo hành', description: 'Xử lý yêu cầu bảo hành', icon: 'warranty', roles: ['technician'] },
  ],
  customer: []
};

export const navigation: readonly NavigationItem[] = [
  ...roleNavigation.super_admin,
  ...roleNavigation.product_manager,
  ...roleNavigation.technician,
  // Legacy aliases
  { path: '/customers', label: 'Khách hàng', description: 'Hồ sơ khách', icon: 'users', roles: ['super_admin'] },
  { path: '/users', label: 'Quản lý Nhân sự', description: 'Cán bộ & phân quyền', icon: 'permissions', roles: ['super_admin'] }
];

export const tabs: Record<string, { path: string; label: string; roles: UserRole[] }[]> = {
  'admin-products': [
    { path: '/admin/products', label: 'Sản phẩm & tồn kho', roles: ['super_admin'] },
    { path: '/admin/products/specifications', label: 'Thông số biến thể', roles: ['super_admin'] },
    { path: '/admin/products/categories', label: 'Danh mục', roles: ['super_admin'] }
  ],
  'admin-orders': [
    { path: '/admin/orders', label: 'Tất cả đơn hàng', roles: ['super_admin'] },
    { path: '/admin/orders/history', label: 'Lịch sử luồng đơn', roles: ['super_admin'] }
  ],
  'admin-warranties': [
    { path: '/admin/warranties', label: 'Quản lý bảo hành', roles: ['super_admin'] },
    { path: '/admin/warranties/lookup', label: 'Tra cứu thiết bị & Serial', roles: ['super_admin'] }
  ],
  'admin-system': [
    { path: '/admin/system', label: 'Thiết lập hệ thống', roles: ['super_admin'] },
    { path: '/admin/system/audit', label: 'Nhật ký Audit logs', roles: ['super_admin'] }
  ],

  'po-products': [
    { path: '/po/products', label: 'Sản phẩm & tồn kho', roles: ['product_manager'] },
    { path: '/po/products/specifications', label: 'Thông số biến thể', roles: ['product_manager'] },
    { path: '/po/products/categories', label: 'Danh mục', roles: ['product_manager'] }
  ],

  products: [
    { path: '/products', label: 'Sản phẩm & tồn kho', roles: ['super_admin', 'product_manager', 'technician'] },
    { path: '/products/specifications', label: 'Thông số biến thể', roles: ['super_admin', 'product_manager', 'technician'] },
    { path: '/products/categories', label: 'Danh mục', roles: ['super_admin', 'product_manager'] }
  ],
  orders: [
    { path: '/orders', label: 'Tất cả đơn hàng', roles: ['super_admin'] },
    { path: '/orders/approvals', label: 'Phê duyệt PO', roles: ['product_manager'] },
    { path: '/orders/delivery', label: 'Giao hàng & Lắp đặt', roles: ['product_manager', 'technician'] },
    { path: '/orders/history', label: 'Lịch sử xử lý', roles: ['super_admin'] }
  ]
};
