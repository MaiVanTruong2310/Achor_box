import React, { useState, useMemo, useRef, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  Home,
  Box,
  Cpu,
  ShieldCheck,
  Package,
  ShoppingBag,
  Users,
  FileText,
  History,
  Settings,
  LogOut,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Search,
  CheckCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  Radio,
  CreditCard,
  Layers,
  Headphones,
  ShieldAlert
} from 'lucide-react';
import { UserRole } from '../types/database';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'iot_alert' | 'warranty' | 'order' | 'system';
  unread: boolean;
  link?: string;
  roles: UserRole[];
}

interface MenuItem {
  path: string;
  name: string;
  roleNames?: Partial<Record<UserRole, string>>;
  icon: React.ReactNode;
  roles?: UserRole[];
}

const MENU_ITEMS: MenuItem[] = [
  {
    path: '/dashboard',
    name: 'Tổng quan Báo cáo',
    icon: <Home size={21} strokeWidth={1.8} />,
    roles: ['super_admin'],
  },
  {
    path: '/devices',
    name: 'Quản lý Thiết bị IoT',
    roleNames: {
      technician: 'Giám sát & Điều khiển IoT',
      super_admin: 'Quản lý Thiết bị IoT',
    },
    icon: <Cpu size={21} strokeWidth={1.8} />,
    roles: ['super_admin', 'technician'],
  },
  {
    path: '/warranties',
    name: 'Bảo hành & Hỗ trợ',
    roleNames: {
      technician: 'Sửa chữa Phần cứng & Bảo hành',
      support_agent: 'Tiếp nhận Khiếu nại & Bảo hành',
      super_admin: 'Bảo hành & Hỗ trợ Kỹ thuật',
    },
    icon: <ShieldCheck size={21} strokeWidth={1.8} />,
    roles: ['super_admin', 'technician', 'support_agent'],
  },
  {
    path: '/products',
    name: 'Sản phẩm & Tồn kho',
    roleNames: {
      product_manager: 'Sản phẩm & Định mức Tồn kho',
      super_admin: 'Sản phẩm & Tồn kho',
    },
    icon: <Package size={21} strokeWidth={1.8} />,
    roles: ['super_admin', 'product_manager'],
  },
  {
    path: '/orders',
    name: 'Quản lý Đơn hàng',
    roleNames: {
      accountant: 'Đơn hàng & Đối soát Doanh thu',
      product_manager: 'Đơn hàng Bán lẻ & Tồn kho',
      support_agent: 'Tra cứu Đơn hàng Vận chuyển',
      super_admin: 'Quản lý Đơn hàng & Doanh thu',
    },
    icon: <ShoppingBag size={21} strokeWidth={1.8} />,
    roles: ['super_admin', 'product_manager', 'accountant', 'support_agent'],
  },
  {
    path: '/users',
    name: 'Quản lý Khách hàng',
    roleNames: {
      support_agent: 'Hồ sơ Khách hàng & Thiết bị',
      super_admin: 'Quản lý Người dùng & Khách hàng',
    },
    icon: <Users size={21} strokeWidth={1.8} />,
    roles: ['super_admin', 'support_agent'],
  },
  {
    path: '/content',
    name: 'Nội dung PR & Blog',
    roleNames: {
      product_manager: 'Truyền thông PR & Đánh giá',
      super_admin: 'Nội dung PR & Blog',
    },
    icon: <FileText size={21} strokeWidth={1.8} />,
    roles: ['super_admin', 'product_manager'],
  },
  {
    path: '/audit-logs',
    name: 'Nhật ký Thao tác',
    icon: <History size={21} strokeWidth={1.8} />,
    roles: ['super_admin'],
  },
  {
    path: '/settings',
    name: 'Cài đặt Hệ thống',
    icon: <Settings size={21} strokeWidth={1.8} />,
    roles: ['super_admin'],
  },
];

const ROLE_INFO: Record<UserRole, {
  label: string;
  color: string;
  workspaceTitle: string;
  searchPlaceholder: string;
  statusBadges: Array<{ label: string; color: string; ping?: string }>;
}> = {
  super_admin: {
    label: 'Super Admin',
    color: '#6366f1',
    workspaceTitle: 'Quản Trị Hệ Thống',
    searchPlaceholder: 'Tìm kiếm thiết bị, đơn hàng, khách hàng, bảo hành...',
    statusBadges: [
      { label: 'Gateway ESP32: Online', color: '#10b981' },
      { label: 'Cổng VNPAY: Kết nối', color: '#0ea5e9' }
    ]
  },
  technician: {
    label: 'Kỹ thuật viên IoT',
    color: '#10b981',
    workspaceTitle: 'Phân Hệ Kỹ Thuật & Giám Sát IoT',
    searchPlaceholder: 'Tìm theo Serial ESP32, MAC, địa chỉ hộp...',
    statusBadges: [
      { label: 'Broker EMQX: Online (24ms)', color: '#10b981' },
      { label: 'Cảm biến: 3 OK, 1 Lỗi', color: '#f59e0b' }
    ]
  },
  accountant: {
    label: 'Kế toán & Tài chính',
    color: '#ec4899',
    workspaceTitle: 'Phân Hệ Kế Toán & Đối Soát Doanh Thu',
    searchPlaceholder: 'Tìm mã đơn hàng, đối soát VNPAY, SĐT khách...',
    statusBadges: [
      { label: 'Cổng VNPAY: Hoạt động', color: '#10b981' },
      { label: 'Đối soát hôm nay: Khớp 100%', color: '#38bdf8' }
    ]
  },
  product_manager: {
    label: 'Quản lý Sản phẩm',
    color: '#0ea5e9',
    workspaceTitle: 'Phân Hệ Quản Lý Sản Phẩm & Tồn Kho',
    searchPlaceholder: 'Tìm tên sản phẩm, mã SKU, biến thể...',
    statusBadges: [
      { label: 'Tồn kho: 3 SKU hoạt động', color: '#10b981' },
      { label: 'Cảnh báo: 2 SKU sắp hết', color: '#f59e0b' }
    ]
  },
  support_agent: {
    label: 'Chăm sóc Khách hàng',
    color: '#f59e0b',
    workspaceTitle: 'Phân Hệ Chăm Sóc Khách Hàng (CSKH)',
    searchPlaceholder: 'Tìm khách hàng, số điện thoại, mã bảo hành...',
    statusBadges: [
      { label: 'Kênh Hỗ Trợ: Trực tuyến', color: '#10b981' },
      { label: 'SLA Phản Hồi: 98.5%', color: '#38bdf8' }
    ]
  },
  customer: {
    label: 'Khách hàng',
    color: '#64748b',
    workspaceTitle: 'Cổng Khách Hàng',
    searchPlaceholder: 'Tìm kiếm...',
    statusBadges: []
  },
};

// Comprehensive, enterprise-level role-targeted notifications
const ALL_SYSTEM_NOTIFICATIONS: NotificationItem[] = [
  // Technician & IoT Hardware Notifications (Hạ tầng, Trạm Gateway, Firmware, Bảo hành RMA)
  {
    id: 'n-tech-1',
    title: 'Hạ tầng Trạm Gateway IoT',
    message: 'Trạm Gateway Hub Hà Nội kết nối ổn định qua kênh MQTT TLS v1.3. Băng thông 1.200 msg/s.',
    time: '15 phút trước',
    type: 'iot_alert',
    unread: true,
    link: '/devices',
    roles: ['super_admin', 'technician'],
  },
  {
    id: 'n-tech-2',
    title: 'Điều phối Sửa chữa / Bảo hành RMA',
    message: 'Ticket kỹ thuật #WR-1091 (Lỗi chốt cơ Servo MG90S) đã được điều phối cho Kỹ thuật viên tiếp quản.',
    time: '30 phút trước',
    type: 'warranty',
    unread: true,
    link: '/warranties',
    roles: ['super_admin', 'technician'],
  },
  {
    id: 'n-tech-3',
    title: 'Phát hành Firmware OTA v1.2.1-stable',
    message: 'Bản firmware mới đã qua kiểm thử lab, bổ sung thuật toán lọc nhiễu cân LoadCell HX711 sẵn sàng nạp.',
    time: '2 giờ trước',
    type: 'system',
    unread: false,
    link: '/devices',
    roles: ['super_admin', 'technician'],
  },
  {
    id: 'n-tech-4',
    title: 'Kiểm định Mạch cảm biến Siêu âm',
    message: 'Lô linh kiện cảm biến HC-SR04 thay thế đã được nhập kho kỹ thuật và sẵn sàng phục vụ bảo hành.',
    time: '4 giờ trước',
    type: 'system',
    unread: false,
    link: '/warranties',
    roles: ['super_admin', 'technician'],
  },

  // Accountant & Financial Reconciliation Notifications (Đối soát, Cổng thanh toán, Quyết toán, Hóa đơn VAT)
  {
    id: 'n-acc-1',
    title: 'Quyết toán Cổng Thanh toán VNPAY',
    message: 'Đối soát tự động cổng thanh toán VNPAY ngày 08/03 hoàn tất, tổng tiền đối chiếu: 4.650.000 ₫.',
    time: '12 phút trước',
    type: 'order',
    unread: true,
    link: '/orders',
    roles: ['super_admin', 'accountant'],
  },
  {
    id: 'n-acc-2',
    title: 'Biên bản Thu hộ COD Đơn vị Vận chuyển',
    message: 'Bưu cục VNPost / GHTK đã gửi bảng kê đối soát tiền mặt thu hộ kỳ 1 tháng 3, cần xác nhận khớp lệnh.',
    time: '35 phút trước',
    type: 'order',
    unread: true,
    link: '/orders',
    roles: ['super_admin', 'accountant'],
  },
  {
    id: 'n-acc-3',
    title: 'Phát hành Hóa đơn Điện tử VAT',
    message: 'Hệ thống đã tự động xuất hóa đơn điện tử VAT hợp lệ #INV-2026-042 cho đơn hàng phân phối.',
    time: '1 giờ trước',
    type: 'order',
    unread: true,
    link: '/orders',
    roles: ['super_admin', 'accountant'],
  },
  {
    id: 'n-acc-4',
    title: 'Báo cáo Doanh thu Định kỳ Tháng',
    message: 'Báo cáo doanh thu đối soát tài chính tháng 02/2026 đã được tổng hợp, sẵn sàng xuất file Excel.',
    time: '4 giờ trước',
    type: 'system',
    unread: false,
    link: '/orders',
    roles: ['super_admin', 'accountant'],
  },

  // Product Manager & Inventory Notifications (Tồn kho cấp kho tổng, Sản lượng SKU, Bán lẻ)
  {
    id: 'n-pm-1',
    title: 'Cảnh báo Định mức Tồn kho Tối thiểu',
    message: 'SmartBox Pro tại Kho Tổng Hà Nội còn 6 chiếc (dưới ngưỡng an toàn 10). Cần lập lệnh sản xuất lô mới.',
    time: '15 phút trước',
    type: 'order',
    unread: true,
    link: '/products',
    roles: ['super_admin', 'product_manager'],
  },
  {
    id: 'n-pm-2',
    title: 'Định mức Linh kiện Phụ trợ',
    message: 'Bàn phím chống nước Keypad 4x4 kim loại chỉ còn 3 bộ trong kho thành phẩm.',
    time: '50 phút trước',
    type: 'order',
    unread: true,
    link: '/products',
    roles: ['super_admin', 'product_manager'],
  },
  {
    id: 'n-pm-3',
    title: 'Tiếp nhận Đơn xuất kho Bán lẻ',
    message: 'Đơn hàng mới #ORD-2026-901 đã được duyệt thành công, chuyển sang bộ phận kho đóng gói xuất xưởng.',
    time: '1 giờ trước',
    type: 'order',
    unread: true,
    link: '/orders',
    roles: ['super_admin', 'product_manager'],
  },
  {
    id: 'n-pm-4',
    title: 'Kiểm duyệt Đánh giá Sản phẩm Mới',
    message: 'Hệ thống ghi nhận 1 đánh giá mới về dòng SmartBox Pro trên cổng PR, sẵn sàng duyệt công khai.',
    time: '3 giờ trước',
    type: 'system',
    unread: false,
    link: '/content',
    roles: ['super_admin', 'product_manager'],
  },

  // Support Agent & Customer Care Notifications (Tiếp nhận Ticket, Phản hồi SLA)
  {
    id: 'n-cskh-1',
    title: 'Tiếp nhận Ticket Bảo hành Mới',
    message: 'Hệ thống ghi nhận Ticket #WR-1092 từ cổng bảo hành cần điều phối kiểm tra kỹ thuật.',
    time: '10 phút trước',
    type: 'warranty',
    unread: true,
    link: '/warranties',
    roles: ['super_admin', 'support_agent'],
  },
  {
    id: 'n-cskh-2',
    title: 'Hoàn tất Xử lý Khiếu nại Kỹ thuật',
    message: 'Ticket #WR-1088 đã được Kỹ thuật viên xử lý và kiểm định xong, sẵn sàng đóng hồ sơ.',
    time: '40 phút trước',
    type: 'warranty',
    unread: true,
    link: '/warranties',
    roles: ['super_admin', 'support_agent'],
  },
  {
    id: 'n-cskh-3',
    title: 'Cập nhật Trạng thái Vận đơn Khách',
    message: 'Mã vận đơn bưu tá GHTK-9901234 đã chuyển trạng thái đang phát tới địa chỉ nhận.',
    time: '1 giờ trước',
    type: 'order',
    unread: true,
    link: '/orders',
    roles: ['super_admin', 'support_agent'],
  },
  {
    id: 'n-cskh-4',
    title: 'Chỉ số SLA Hỗ trợ Khách hàng Tuần',
    message: 'Tỷ lệ phản hồi ticket kỹ thuật dưới 2 giờ đạt 98.5% trong tuần qua.',
    time: '3 giờ trước',
    type: 'system',
    unread: false,
    link: '/warranties',
    roles: ['super_admin', 'support_agent'],
  },

  // Super Admin System & Security Alerts (Bảo mật, Sao lưu, Hạ tầng Cloud)
  {
    id: 'n-admin-1',
    title: 'Bảo mật: Xác thực Phiên Quản trị',
    message: 'Ghi nhận phiên đăng nhập quản trị viên cấp cao hợp lệ từ địa chỉ mạng nội bộ.',
    time: '10 phút trước',
    type: 'system',
    unread: true,
    link: '/audit-logs',
    roles: ['super_admin'],
  },
  {
    id: 'n-admin-2',
    title: 'Hạ tầng MQTT Broker EMQX Cluster',
    message: 'Cụm Broker IoT duy trì tỷ lệ uptime 99.99%, thời gian phản hồi ping trung bình 22ms.',
    time: '2 giờ trước',
    type: 'iot_alert',
    unread: false,
    link: '/devices',
    roles: ['super_admin'],
  },
];

export const AdminLayout: React.FC = () => {
  const { user, profile, logout, hasRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [globalSearch, setGlobalSearch] = useState('');

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const activeRole: UserRole = profile?.role || 'super_admin';
  const roleConfig = ROLE_INFO[activeRole] || ROLE_INFO.super_admin;

  // Filter accessible menus strictly for the current role
  const accessibleMenuItems = useMemo(() => {
    return MENU_ITEMS.filter((item) => !item.roles || hasRole(item.roles));
  }, [profile, hasRole]);

  // Determine current active item index in accessible menus
  const activeIndex = useMemo(() => {
    const currentPath = location.pathname;
    const index = accessibleMenuItems.findIndex((item) => currentPath.startsWith(item.path));
    return index !== -1 ? index : 0;
  }, [location.pathname, accessibleMenuItems]);

  // Filter notifications strictly for the current role
  const [notifications, setNotifications] = useState<NotificationItem[]>(ALL_SYSTEM_NOTIFICATIONS);

  const roleFilteredNotifications = useMemo(() => {
    return notifications.filter(n => n.roles.includes(activeRole));
  }, [notifications, activeRole]);

  // Unread count strictly for this role
  const unreadCount = useMemo(() => {
    return roleFilteredNotifications.filter((n) => n.unread).length;
  }, [roleFilteredNotifications]);

  // Dynamic filter tabs based on active role
  const notificationTabs = useMemo(() => {
    const base = [
      { id: 'all', label: 'Tất cả' },
      { id: 'unread', label: `Chưa đọc (${unreadCount})` },
    ];

    if (activeRole === 'technician') {
      return [...base, { id: 'iot_alert', label: 'Sự cố IoT' }, { id: 'warranty', label: 'Bảo hành' }];
    }
    if (activeRole === 'accountant') {
      return [...base, { id: 'order', label: 'Giao dịch VNPAY' }, { id: 'system', label: 'Đối soát' }];
    }
    if (activeRole === 'product_manager') {
      return [...base, { id: 'order', label: 'Đơn & Kho' }, { id: 'system', label: 'PR & Review' }];
    }
    if (activeRole === 'support_agent') {
      return [...base, { id: 'warranty', label: 'Khiếu nại' }, { id: 'system', label: 'Tài khoản' }];
    }
    return [...base, { id: 'iot_alert', label: 'Sự cố IoT' }, { id: 'order', label: 'Đơn hàng' }];
  }, [activeRole, unreadCount]);

  // Filtered notifications within the dropdown
  const displayedNotifications = useMemo(() => {
    if (activeFilter === 'unread') return roleFilteredNotifications.filter((n) => n.unread);
    if (activeFilter === 'iot_alert') return roleFilteredNotifications.filter((n) => n.type === 'iot_alert');
    if (activeFilter === 'warranty') return roleFilteredNotifications.filter((n) => n.type === 'warranty');
    if (activeFilter === 'order') return roleFilteredNotifications.filter((n) => n.type === 'order');
    if (activeFilter === 'system') return roleFilteredNotifications.filter((n) => n.type === 'system');
    return roleFilteredNotifications;
  }, [roleFilteredNotifications, activeFilter]);

  // Click outside listeners
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((n) => (n.roles.includes(activeRole) ? { ...n, unread: false } : n))
    );
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, unread: false } : n)));
    setNotificationsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isTopNavMode = activeRole !== 'super_admin';

  // Responsive Sidebar States
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(() => {
    return localStorage.getItem('smartbox_sidebar_expanded') === 'true';
  });
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [location.pathname]);

  const toggleSidebarExpanded = () => {
    setIsSidebarExpanded(prev => {
      const next = !prev;
      localStorage.setItem('smartbox_sidebar_expanded', String(next));
      return next;
    });
  };

  return (
    <div className={`app-container ${isTopNavMode ? 'no-sidebar' : ''}`}>
      {/* Floating Vertical Pill Sidebar Container (Rendered ONLY for Super Admin with 9 items) */}
      {!isTopNavMode && (
        <div className="floating-sidebar-container">
          <aside
            className={`floating-pill ${isSidebarExpanded ? 'expanded' : ''}`}
            style={{
              '--pill-active-index': activeIndex,
            } as React.CSSProperties}
          >
            {/* Top Brand Logo - Anchored at the very top of screen */}
            <div className="pill-brand-header">
              <div className="pill-brand-icon" title="SmartBox IoT Platform">
                <Box size={22} color="#ffffff" strokeWidth={2.2} />
              </div>
              {isSidebarExpanded && (
                <div className="pill-brand-info">
                  <span className="pill-brand-title">SmartBox</span>
                  <span className="pill-brand-sub">IoT Admin</span>
                </div>
              )}
            </div>

            <div className="pill-divider" style={{ margin: '4px 0 8px 0' }} />

            {/* Scrollable Navigation Items */}
            <div className="pill-items-scroll">
              {/* Liquid Notch Curved Indicator */}
              <div className="liquid-notch-indicator" />

              {/* Navigation Icons */}
              {accessibleMenuItems.map((item, idx) => {
                const isActive = activeIndex === idx;
                const displayName = (item.roleNames && item.roleNames[activeRole]) || item.name;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`pill-nav-item ${isActive ? 'active' : ''}`}
                    title={isSidebarExpanded ? undefined : displayName}
                  >
                    <span className="pill-item-icon">
                      {item.icon}
                    </span>

                    {/* Text Label when Expanded */}
                    {isSidebarExpanded && (
                      <span className="pill-item-label">{displayName}</span>
                    )}

                    {/* Floating Glass Tooltip with role-tailored title (Compact Mode) */}
                    {!isSidebarExpanded && (
                      <div className="pill-tooltip">
                        {displayName}
                      </div>
                    )}
                  </NavLink>
                );
              })}
            </div>

            {/* Separator Divider */}
            <div className="pill-divider" />

            {/* Bottom Actions: Expand/Collapse & Logout Button */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              {/* Desktop Expand / Collapse Toggle Button */}
              <button
                type="button"
                onClick={toggleSidebarExpanded}
                className="pill-nav-item"
                style={{ background: 'transparent', border: 'none' }}
                title={isSidebarExpanded ? 'Thu gọn thanh bên' : 'Mở rộng thanh bên'}
              >
                <span className="pill-item-icon">
                  {isSidebarExpanded ? <ChevronLeft size={18} strokeWidth={2} /> : <ChevronRight size={18} strokeWidth={2} />}
                </span>
                {isSidebarExpanded && (
                  <span className="pill-item-label" style={{ opacity: 0.85 }}>Thu gọn</span>
                )}
                {!isSidebarExpanded && (
                  <div className="pill-tooltip">
                    Mở rộng thanh bên
                  </div>
                )}
              </button>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="pill-nav-item"
                style={{ background: 'transparent', border: 'none' }}
                title={isSidebarExpanded ? undefined : 'Đăng xuất'}
              >
                <span className="pill-item-icon">
                  <LogOut size={19} strokeWidth={1.8} />
                </span>
                {isSidebarExpanded && (
                  <span className="pill-item-label" style={{ color: '#fca5a5' }}>Đăng xuất</span>
                )}
                {!isSidebarExpanded && (
                  <div className="pill-tooltip">
                    Đăng xuất
                  </div>
                )}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Container */}
      <div className="main-content">

        {/* Sleek Minimalist Borderless Header */}
        <header className="sleek-header">

          {/* Left: Mobile Hamburger Button, Role Domain Workspace Badge & Borderless Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              className="mobile-hamburger-btn"
              onClick={() => setIsMobileDrawerOpen(true)}
              aria-label="Mở menu điều hướng"
              title="Mở menu"
            >
              <Menu size={19} />
            </button>
            {/* Role Workspace Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '8px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.8125rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: roleConfig.color, boxShadow: `0 0 8px ${roleConfig.color}` }} />
              <span>{roleConfig.workspaceTitle}</span>
            </div>

            {/* Borderless Search Input */}
            <div className="borderless-search-box" style={{ maxWidth: '340px' }}>
              <Search size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              <input
                type="text"
                placeholder={roleConfig.searchPlaceholder}
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
              />
              <span className="search-shortcut-badge">⌘K</span>
            </div>
          </div>

          {/* Right Controls: Role-Specific Status Badges, Theme Switch, Notifications, User Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

            {/* Dynamic Status Badges per role */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {roleConfig.statusBadges.map((badge, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: badge.color, display: 'inline-block', boxShadow: `0 0 8px ${badge.color}` }} />
                  <span>{badge.label}</span>
                </div>
              ))}
            </div>

            <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)' }} />

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="btn-ghost"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-primary)',
              }}
              title={theme === 'dark' ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}
            >
              {theme === 'dark' ? (
                <Sun size={17} strokeWidth={1.8} color="#fbbf24" />
              ) : (
                <Moon size={17} strokeWidth={1.8} color="#2563eb" />
              )}
            </button>

            {/* Notification Bell with Role-Targeted Dropdown */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="btn-ghost"
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  background: notificationsOpen ? 'var(--bg-surface-hover)' : 'transparent',
                  transition: 'all 0.15s ease'
                }}
                title={`Thông báo cho ${roleConfig.label}`}
              >
                <Bell size={17} strokeWidth={1.8} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    minWidth: '16px',
                    height: '16px',
                    padding: '0 4px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--accent-rose)',
                    color: '#ffffff',
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(244, 63, 94, 0.4)'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Menu */}
              {notificationsOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    right: -10,
                    width: '390px',
                    maxWidth: '92vw',
                    background: 'var(--bg-shell)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-elevated)',
                    border: '1px solid var(--border-glass)',
                    zIndex: 1000,
                    overflow: 'hidden',
                    animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  {/* Dropdown Header */}
                  <div style={{
                    padding: '16px 18px 12px 18px',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                          Thông báo {roleConfig.label}
                        </h3>
                        {unreadCount > 0 && (
                          <span style={{
                            padding: '2px 7px',
                            borderRadius: '10px',
                            background: 'var(--accent-rose-soft)',
                            color: 'var(--accent-rose-text)',
                            fontSize: '0.6875rem',
                            fontWeight: 700
                          }}>
                            {unreadCount} mới
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Chỉ hiển thị thông báo nghiệp vụ liên quan
                      </div>
                    </div>

                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--accent-primary)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 6px',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        <CheckCheck size={14} />
                        <span>Đã đọc</span>
                      </button>
                    )}
                  </div>

                  {/* Filter Tabs */}
                  <div style={{
                    display: 'flex',
                    gap: '6px',
                    padding: '8px 16px',
                    background: 'rgba(0, 0, 0, 0.05)',
                    borderBottom: '1px solid var(--border-subtle)',
                    overflowX: 'auto'
                  }}>
                    {notificationTabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveFilter(tab.id)}
                        style={{
                          background: activeFilter === tab.id ? 'var(--bg-card)' : 'transparent',
                          color: activeFilter === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                          border: 'none',
                          borderRadius: 'var(--radius-sm)',
                          padding: '4px 10px',
                          fontSize: '0.71875rem',
                          fontWeight: activeFilter === tab.id ? 600 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Notification List */}
                  <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                    {displayedNotifications.length === 0 ? (
                      <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        Không có thông báo nào trong mục này.
                      </div>
                    ) : (
                      displayedNotifications.map((n) => {
                        let icon = <Cpu size={16} color="#0ea5e9" />;
                        let iconBg = 'var(--accent-sky-soft)';
                        if (n.type === 'iot_alert') {
                          icon = <AlertTriangle size={16} color="var(--accent-rose)" />;
                          iconBg = 'var(--accent-rose-soft)';
                        } else if (n.type === 'warranty') {
                          icon = <ShieldCheck size={16} color="var(--accent-amber)" />;
                          iconBg = 'var(--accent-amber-soft)';
                        } else if (n.type === 'order') {
                          icon = <ShoppingBag size={16} color="var(--accent-emerald)" />;
                          iconBg = 'var(--accent-emerald-soft)';
                        }

                        return (
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            style={{
                              padding: '12px 16px',
                              display: 'flex',
                              gap: '12px',
                              alignItems: 'flex-start',
                              cursor: 'pointer',
                              background: n.unread ? 'var(--accent-primary-soft)' : 'transparent',
                              borderBottom: '1px solid var(--border-subtle)',
                              transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (!n.unread) e.currentTarget.style.background = 'var(--bg-surface-hover)';
                            }}
                            onMouseLeave={(e) => {
                              if (!n.unread) e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: iconBg,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: '2px'
                            }}>
                              {icon}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <span style={{
                                  fontSize: '0.8125rem',
                                  fontWeight: n.unread ? 700 : 600,
                                  color: 'var(--text-primary)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {n.title}
                                </span>
                                {n.unread && (
                                  <span style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--accent-primary)',
                                    flexShrink: 0
                                  }} />
                                )}
                              </div>
                              <p style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-secondary)',
                                margin: '3px 0 6px 0',
                                lineHeight: '1.35',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}>
                                {n.message}
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                                <Clock size={11} />
                                <span>{n.time}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Dropdown Footer */}
                  <div style={{
                    padding: '10px 16px',
                    background: 'rgba(0, 0, 0, 0.05)',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Tự động đồng bộ theo vai trò: <strong>{roleConfig.label}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill (Borderless with Dropdown) */}
            <div ref={userRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--bg-surface)',
                  border: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  padding: '4px 10px 4px 4px',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                <img
                  src={profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt="Avatar"
                  style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{profile?.full_name || 'Admin'}</span>
                <ChevronDown size={14} color="var(--text-muted)" />
              </button>

              {userDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '210px',
                    background: 'var(--bg-shell)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-elevated)',
                    border: '1px solid var(--border-glass)',
                    padding: '6px',
                    zIndex: 1000
                  }}
                >
                  <div style={{ padding: '8px 10px', fontSize: '0.6875rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                    Vai trò: <strong style={{ color: roleConfig.color }}>{roleConfig.label}</strong>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{roleConfig.workspaceTitle}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-rose-text)',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    <LogOut size={15} />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>

          </div>

        </header>

        {/* Sub-Navigation Bar for Domain Roles (GitHub / Vercel Subnav style) */}
        {isTopNavMode && (
          <div className="subnav-bar">
            <nav className="subnav-tabs">
              {accessibleMenuItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                const displayName = (item.roleNames && item.roleNames[activeRole]) || item.name;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`subnav-tab ${isActive ? 'active' : ''}`}
                  >
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      {item.icon}
                    </span>
                    <span>{displayName}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        )}

        {/* Page Body */}
        <main className="page-body">
          <Outlet />
        </main>
      </div>

      {/* Mobile Slide-Over Drawer (Toggled by Header Hamburger) */}
      {isMobileDrawerOpen && (
        <div className="mobile-drawer-backdrop" onClick={() => setIsMobileDrawerOpen(false)}>
          <div className="mobile-drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <div className="mobile-drawer-brand">
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: roleConfig.color, boxShadow: `0 0 10px ${roleConfig.color}` }} />
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    SmartBox Admin
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {roleConfig.workspaceTitle}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="mobile-drawer-close"
                onClick={() => setIsMobileDrawerOpen(false)}
                title="Đóng menu"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="mobile-drawer-nav">
              {accessibleMenuItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                const displayName = (item.roleNames && item.roleNames[activeRole]) || item.name;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className={`mobile-drawer-item ${isActive ? 'active' : ''}`}
                  >
                    <span className="pill-item-icon" style={{ color: isActive ? 'var(--accent-primary)' : 'inherit' }}>
                      {item.icon}
                    </span>
                    <span>{displayName}</span>
                  </NavLink>
                );
              })}
            </nav>

            <div className="mobile-drawer-footer">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 4px' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'var(--accent-primary-soft)',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}>
                  {user?.email?.[0]?.toUpperCase() || 'A'}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.email?.split('@')[0] || 'Admin'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: roleConfig.color, fontWeight: 600 }}>
                    {roleConfig.label}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="mobile-logout-btn"
              >
                <LogOut size={16} />
                <span>Đăng xuất khỏi hệ thống</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating Bottom Quick Dock (Quick access for touchscreens) */}
      {!isTopNavMode && (
        <nav className="mobile-bottom-dock">
          <NavLink to="/dashboard" className={({ isActive }) => `dock-item ${isActive ? 'active' : ''}`}>
            <Home size={18} />
            <span>Tổng quan</span>
          </NavLink>
          <NavLink to="/devices" className={({ isActive }) => `dock-item ${isActive ? 'active' : ''}`}>
            <Cpu size={18} />
            <span>Thiết bị</span>
          </NavLink>
          <NavLink to="/products" className={({ isActive }) => `dock-item ${isActive ? 'active' : ''}`}>
            <Package size={18} />
            <span>Sản phẩm</span>
          </NavLink>
          <NavLink to="/orders" className={({ isActive }) => `dock-item ${isActive ? 'active' : ''}`}>
            <ShoppingBag size={18} />
            <span>Đơn hàng</span>
          </NavLink>
          <button type="button" className="dock-item" onClick={() => setIsMobileDrawerOpen(true)}>
            <Menu size={18} />
            <span>Tất cả</span>
          </button>
        </nav>
      )}
    </div>
  );
};
