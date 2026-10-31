import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  UserRound,
  Menu,
  X,
  Search,
  SlidersHorizontal,
  LogOut,
  Package,
  Cpu,
  MapPin,
  ShieldCheck,
  LayoutDashboard
} from 'lucide-react';
import { useShop } from '../ShopContext';
import { shop } from '../api/shop';
import { getUserAvatar } from '../api/customer';
import { useResource } from './ShopUi';
import { NotificationCenter } from './NotificationCenter';
import { StoreSearch } from './StoreSearch';
import '../apple-home.css';

type NavDropdownKey = 'products' | 'technology' | 'app' | 'warranty' | 'about';

interface DropdownContent {
  eyebrow1: string;
  primaryLinks: { label: string; to: string }[];
  eyebrow2: string;
  secondaryLinks: { label: string; to: string }[];
  eyebrow3: string;
  specialLinks: { label: string; to: string }[];
}

const NAV_DROPDOWNS: Record<NavDropdownKey, DropdownContent> = {
  products: {
    eyebrow1: 'Dòng Tủ Thông Minh',
    primaryLinks: [
      { label: 'Tất cả sản phẩm AnchorBox', to: '/products' },
      { label: 'AnchorBox Base (Tiêu chuẩn 45L/75L)', to: '/products/anchorbox-base' },
      { label: 'AnchorBox Pro (Camera AI & Cân)', to: '/products/anchorbox-pro' },
      { label: 'AnchorBox Solar Max (Tấm pin mặt trời)', to: '/products/anchorbox-solar' },
      { label: 'So sánh các phiên bản', to: '/compare' }
    ],
    eyebrow2: 'Linh Kiện & Cảm Biến',
    secondaryLinks: [
      { label: 'Cảm biến tải trọng Loadcell ±5g', to: '/products#components' },
      { label: 'Khóa chốt điện tử Solenoid chịu lực', to: '/products#components' },
      { label: 'Đèn UV-C khử khuẩn bưu kiện', to: '/products#components' },
      { label: 'Pin sạc dự phòng Matter 72h', to: '/products#components' },
      { label: 'Chân đế trụ nâng cao chống ngập', to: '/products#accessories' }
    ],
    eyebrow3: 'Nghiệp Vụ & Dịch Vụ',
    specialLinks: [
      { label: 'Tra cứu hành trình đơn hàng', to: '/order-tracking' },
      { label: 'Chính sách bảo hành 12 - 24 tháng', to: '/warranty' },
      { label: 'Đăng ký khảo sát lắp đặt tại nhà', to: '/contact' },
      { label: 'Giải pháp cho tòa nhà & chung cư', to: '/contact' },
      { label: 'Xem giỏ hàng của bạn', to: '/cart' }
    ]
  },
  technology: {
    eyebrow1: 'Công Nghệ Cốt Lõi IoT',
    primaryLinks: [
      { label: 'Hệ điều hành nhúng AnchorOS', to: '/technology' },
      { label: 'Camera AI nhận diện bưu tá 1080p', to: '/technology#camera' },
      { label: 'Cảm biến cân nặng chống tráo hàng', to: '/technology#weight' },
      { label: 'Diệt khuẩn UV-C tự động 99.9%', to: '/technology#uvc' },
      { label: 'Chốt khóa điện tử chuẩn an ninh', to: '/technology#security' },
      { label: 'Giao thức Matter over Thread', to: '/technology#connectivity' }
    ],
    eyebrow2: 'Nền Tảng & Điều Khiển',
    secondaryLinks: [
      { label: 'Khám phá mô hình 3D tương tác', to: '/#technology' },
      { label: 'Mã hóa truyền thông đầu cuối AES-128', to: '/technology#security' },
      { label: 'Nguồn pin lưu điện duy trì 72 giờ', to: '/technology#battery' },
      { label: 'Cập nhật firmware từ xa qua OTA', to: '/technology' }
    ],
    eyebrow3: 'Tiêu Chuẩn Kỹ Thuật',
    specialLinks: [
      { label: 'Kháng thời tiết ngoài trời IP65', to: '/technology#ip65' },
      { label: 'Chống va đập cơ học chuẩn IK08', to: '/technology' },
      { label: 'Tương thích Apple HomeKit & Siri', to: '/app' },
      { label: 'Chứng nhận liên minh CSA Matter', to: '/technology' }
    ]
  },
  app: {
    eyebrow1: 'Ứng Dụng AnchorBox Home',
    primaryLinks: [
      { label: 'Tổng quan ứng dụng di động', to: '/app' },
      { label: 'Mở khóa từ xa không chạm 1 chạm', to: '/app' },
      { label: 'Tạo mã OTP dùng 1 lần cho shipper', to: '/app' },
      { label: 'Giám sát bưu kiện thời gian thực', to: '/app' },
      { label: 'Nhật ký hình ảnh bưu phẩm lưu kho', to: '/account' }
    ],
    eyebrow2: 'Cài Đặt & Kết Nối',
    secondaryLinks: [
      { label: 'Tải ứng dụng trên iOS App Store', to: '/app' },
      { label: 'Tải ứng dụng trên Google Play', to: '/app' },
      { label: 'Hướng dẫn cấu hình Wi-Fi lần đầu', to: '/how-it-works' },
      { label: 'Quản lý danh sách hộp đã kích hoạt', to: '/account/devices' }
    ],
    eyebrow3: 'Hệ Sinh Thái Thông Minh',
    specialLinks: [
      { label: 'Chia sẻ quyền mở khóa cho gia đình', to: '/app' },
      { label: 'Tự động đồng bộ mã vận đơn TMĐT', to: '/app' },
      { label: 'Tích hợp Apple Home & Siri Shortcuts', to: '/app' },
      { label: 'Hỗ trợ Google Assistant & Android', to: '/app' }
    ]
  },
  warranty: {
    eyebrow1: 'Bảo Hành Chính Hãng',
    primaryLinks: [
      { label: 'Tra cứu thông tin bảo hành điện tử', to: '/warranty' },
      { label: 'Gửi yêu cầu kỹ thuật viên tận nhà', to: '/warranty/claims/new' },
      { label: 'Chính sách bảo hành 12 - 24 tháng', to: '/warranty' },
      { label: 'Chính sách 1 đổi 1 trong 30 ngày', to: '/warranty' },
      { label: 'Quy trình giao hàng & lắp đặt', to: '/how-it-works' }
    ],
    eyebrow2: 'Dịch Vụ Kỹ Thuật',
    secondaryLinks: [
      { label: 'Đặt lịch bảo dưỡng & kiểm tra định kỳ', to: '/contact' },
      { label: 'Cung cấp linh kiện thay thế chính hãng', to: '/products' },
      { label: 'Dịch vụ di dời vị trí lắp đặt hộp', to: '/contact' },
      { label: 'Sổ tay hướng dẫn tự xử lý sự cố', to: '/about' }
    ],
    eyebrow3: 'Kênh Hỗ Trợ 24/7',
    specialLinks: [
      { label: 'Hotline hỗ trợ kỹ thuật: 1900 6868', to: '/contact' },
      { label: 'Trung tâm bảo hành & linh kiện', to: '/contact' },
      { label: 'Câu hỏi thường gặp về sản phẩm (FAQ)', to: '/faq' },
      { label: 'Tra cứu tình trạng vận chuyển đơn', to: '/order-tracking' }
    ]
  },
  about: {
    eyebrow1: 'Về Thương Hiệu AnchorBox',
    primaryLinks: [
      { label: 'Câu chuyện sứ mệnh AnchorBox', to: '/about' },
      { label: 'Tầm nhìn giải pháp bưu kiện IoT', to: '/about' },
      { label: 'Đội ngũ kỹ sư R&D phần cứng', to: '/about' },
      { label: 'Cam kết chất lượng & kiểm định', to: '/about' }
    ],
    eyebrow2: 'Tin Tức & Dự Án',
    secondaryLinks: [
      { label: 'Tin tức công nghệ bưu kiện mới', to: '/blog' },
      { label: 'Dự án khu đô thị & chung cư', to: '/about' },
      { label: 'Chính sách bảo mật quyền riêng tư', to: '/about' },
      { label: 'Điều khoản dịch vụ khách hàng', to: '/about' }
    ],
    eyebrow3: 'Hợp Tác Kinh Doanh',
    specialLinks: [
      { label: 'Đăng ký đại lý phân phối ủy quyền', to: '/contact' },
      { label: 'Hợp tác nhà thầu & ban quản lý tòa nhà', to: '/contact' },
      { label: 'Văn phòng đại diện & showroom', to: '/contact' },
      { label: 'Tuyển dụng & cơ hội hợp tác R&D', to: '/contact' }
    ]
  }
};

export function StoreHeader() {
  const { user, lines, logout } = useShop();
  const location = useLocation();
  const categories = useResource(shop.categories, 'catalog-categories');
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [logoutError, setLogoutError] = useState('');
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => getUserAvatar(user?.userId));
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [drawerTop, setDrawerTop] = useState(48);
  
  // Apple Hover Mega-Dropdown State
  const [activeDropdown, setActiveDropdown] = useState<NavDropdownKey | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const headerRoot = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const accountMenuRoot = useRef<HTMLDivElement>(null);

  const handleNavMouseEnter = (key: string) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (key in NAV_DROPDOWNS) {
      setActiveDropdown(key as NavDropdownKey);
    } else {
      setActiveDropdown(null);
    }
  };

  const handleNavMouseLeave = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 180);
  };

  const handleDropdownMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleDropdownMouseLeave = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 180);
  };

  const closeDropdown = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setActiveDropdown(null);
  };

  // Sync avatar when user changes or when an avatar update event fires
  useEffect(() => {
    setAvatarUrl(getUserAvatar(user?.userId));
    const handleAvatarUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ userId: string; url: string }>;
      if (!user || customEvent.detail?.userId === user.userId) {
        setAvatarUrl(customEvent.detail?.url || getUserAvatar(user?.userId));
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (user && e.key === `anchorbox_avatar_${user.userId}`) {
        setAvatarUrl(e.newValue);
      }
    };
    window.addEventListener('anchorbox:avatar_changed', handleAvatarUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('anchorbox:avatar_changed', handleAvatarUpdate);
      window.removeEventListener('storage', handleStorage);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, [user]);

  // Set fixed 48px header height css property and dynamic drawer top offset
  useEffect(() => {
    document.documentElement.style.setProperty('--store-header-height', '48px');
    const updateTop = () => {
      const rect = headerRoot.current?.getBoundingClientRect();
      if (rect) {
        setDrawerTop(Math.max(0, Math.round(rect.bottom)));
      }
    };
    updateTop();
    window.addEventListener('resize', updateTop);
    window.addEventListener('scroll', updateTop);
    return () => {
      window.removeEventListener('resize', updateTop);
      window.removeEventListener('scroll', updateTop);
    };
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menu) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [menu]);

  // Sync route changes
  useEffect(() => {
    setMenu(false);
    setAccountMenuOpen(false);
    setActiveDropdown(null);
    setIsSearchOpen(false);
    const params = new URLSearchParams(location.search);
    setQuery(params.get('q') || '');
    setCategory(params.get('category') || '');
  }, [location.key, location.search]);

  // Click outside and escape key handling
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!accountMenuRoot.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (isSearchOpen) {
        setIsSearchOpen(false);
      } else if (activeDropdown) {
        setActiveDropdown(null);
      } else if (menu) {
        setMenu(false);
        menuButton.current?.focus();
      } else if (accountMenuOpen) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [menu, accountMenuOpen, activeDropdown, isSearchOpen]);

  const count = lines.reduce((total, line) => total + line.quantity, 0);

  return (
    <>
      <header className={`apple-global-nav ${location.pathname === '/' || location.pathname === '/technology' ? 'apple-nav-dark' : ''}`} ref={headerRoot} role="banner">
        <div className="apple-nav-container" onMouseLeave={handleNavMouseLeave}>
          
          {/* 1. Logo AnchorBox thanh mảnh tinh xảo */}
          <Link to="/" className="apple-nav-brand" aria-label="AnchorBox trang chủ" onMouseEnter={() => handleNavMouseEnter('home')}>
            <span className="apple-brand-symbol">A</span>
            <span className="apple-brand-name">anchorbox</span>
          </Link>

          {/* 2. Apple Desktop Nav Menu Links with Hover Dropdown Trigger */}
          <nav className="apple-nav-menu" aria-label="Điều hướng chính">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `apple-nav-link ${isActive ? 'is-active' : ''}`}
              onMouseEnter={() => handleNavMouseEnter('home')}
            >
              Trang chủ
            </NavLink>

            <NavLink
              to="/products"
              className={({ isActive }) => `apple-nav-link ${isActive || activeDropdown === 'products' ? 'is-active' : ''}`}
              onMouseEnter={() => handleNavMouseEnter('products')}
            >
              Sản phẩm
            </NavLink>

            <NavLink
              to="/technology"
              className={({ isActive }) => `apple-nav-link ${isActive || activeDropdown === 'technology' ? 'is-active' : ''}`}
              onMouseEnter={() => handleNavMouseEnter('technology')}
            >
              Công nghệ
            </NavLink>

            <NavLink
              to="/app"
              className={({ isActive }) => `apple-nav-link ${isActive || activeDropdown === 'app' ? 'is-active' : ''}`}
              onMouseEnter={() => handleNavMouseEnter('app')}
            >
              Ứng dụng
            </NavLink>

            <NavLink
              to="/how-it-works"
              className={({ isActive }) => `apple-nav-link ${isActive ? 'is-active' : ''}`}
              onMouseEnter={() => handleNavMouseEnter('how-it-works')}
            >
              Giao & lắp đặt
            </NavLink>

            <NavLink
              to="/warranty"
              className={({ isActive }) => `apple-nav-link ${isActive || activeDropdown === 'warranty' ? 'is-active' : ''}`}
              onMouseEnter={() => handleNavMouseEnter('warranty')}
            >
              Bảo hành
            </NavLink>

            <NavLink
              to="/about"
              className={({ isActive }) => `apple-nav-link ${isActive || activeDropdown === 'about' ? 'is-active' : ''}`}
              onMouseEnter={() => handleNavMouseEnter('about')}
            >
              Về AnchorBox
            </NavLink>
          </nav>

          {/* 3. Minimalist Apple Action Icons */}
          <div className="apple-nav-actions" onMouseEnter={() => handleNavMouseEnter('actions')}>
            
            {/* Nút Tìm kiếm biểu tượng Apple tối giản (Mở drawer dưới header) */}
            <button
              type="button"
              className={`apple-nav-action-btn apple-nav-search-trigger ${isSearchOpen ? 'is-active' : ''}`}
              aria-label="Tìm kiếm sản phẩm"
              title="Tìm kiếm sản phẩm"
              onClick={() => {
                setActiveDropdown(null);
                setMenu(false);
                setAccountMenuOpen(false);
                setIsSearchOpen(prev => !prev);
              }}
            >
              {isSearchOpen ? <X size={17} strokeWidth={1.5} /> : <Search size={17} strokeWidth={1.5} />}
            </button>

            {/* Nút So sánh dưới dạng biểu tượng Apple tối giản */}
            <Link
              to="/compare"
              className="apple-nav-action-btn"
              aria-label="So sánh sản phẩm"
              title="So sánh sản phẩm"
            >
              <SlidersHorizontal size={17} strokeWidth={1.5} />
            </Link>

            {/* Notification Center nếu đã đăng nhập */}
            {user && <NotificationCenter key={user.userId} />}

            {/* Nút Giỏ hàng dưới dạng biểu tượng Apple tối giản */}
            <Link
              to="/cart"
              className="apple-nav-action-btn apple-nav-cart"
              aria-label={`Giỏ hàng (${count})`}
              title={`Giỏ hàng (${count})`}
            >
              <ShoppingBag size={17} strokeWidth={1.5} />
              {count > 0 && <span className="apple-cart-count">{count}</span>}
            </Link>

            {/* Nút Đăng nhập / Tài khoản dạng biểu tượng Apple tối giản */}
            {user ? (
              <div className="commerce-account-wrapper" ref={accountMenuRoot}>
                <button
                  type="button"
                  className="apple-nav-action-btn apple-nav-user"
                  onClick={() => setAccountMenuOpen(prev => !prev)}
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="true"
                  title={user.fullName || user.email}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={user.fullName || user.email}
                      style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <UserRound size={17} strokeWidth={1.5} />
                  )}
                </button>

                {accountMenuOpen && (
                  <div className="commerce-user-dropdown" role="menu">
                    <div className="dropdown-user-header">
                      <div className="dropdown-avatar-wrap">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="dropdown-avatar-img" />
                        ) : (
                          <span className="dropdown-avatar-initials">
                            {((user.fullName || user.email || 'U').trim().charAt(0)).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="dropdown-user-info">
                        <strong className="dropdown-user-name">{user.fullName || 'Khách hàng'}</strong>
                        <span className="dropdown-user-email">{user.email}</span>
                        <span className="dropdown-user-role">
                          {user.role === 'customer' ? 'Khách hàng cá nhân' : user.role || 'Thành viên'}
                        </span>
                      </div>
                    </div>

                    <div className="dropdown-divider" />

                    <div className="dropdown-nav-list">
                      <Link to="/account" onClick={() => setAccountMenuOpen(false)} className="dropdown-nav-item">
                        <LayoutDashboard size={16} />
                        <div>
                          <strong>Tổng quan tài khoản</strong>
                          <small>Hồ sơ, bảo mật & thông tin chung</small>
                        </div>
                      </Link>
                      <Link to="/account/orders" onClick={() => setAccountMenuOpen(false)} className="dropdown-nav-item">
                        <Package size={16} />
                        <div>
                          <strong>Đơn hàng của tôi</strong>
                          <small>Xem trạng thái & lịch sử mua</small>
                        </div>
                      </Link>
                      <Link to="/account/devices" onClick={() => setAccountMenuOpen(false)} className="dropdown-nav-item">
                        <Cpu size={16} />
                        <div>
                          <strong>Thiết bị AnchorBox</strong>
                          <small>Quản lý hộp & cảm biến</small>
                        </div>
                      </Link>
                      <Link to="/account/profile" onClick={() => setAccountMenuOpen(false)} className="dropdown-nav-item">
                        <UserRound size={16} />
                        <div>
                          <strong>Thông tin cá nhân</strong>
                          <small>Họ tên, SĐT & đổi mật khẩu</small>
                        </div>
                      </Link>
                      <Link to="/account/addresses" onClick={() => setAccountMenuOpen(false)} className="dropdown-nav-item">
                        <MapPin size={16} />
                        <div>
                          <strong>Sổ địa chỉ</strong>
                          <small>Địa chỉ nhận hàng mặc định</small>
                        </div>
                      </Link>
                      <Link to="/warranty" onClick={() => setAccountMenuOpen(false)} className="dropdown-nav-item">
                        <ShieldCheck size={16} />
                        <div>
                          <strong>Tra cứu bảo hành</strong>
                          <small>Phiếu bảo hành điện tử & CSKH</small>
                        </div>
                      </Link>
                    </div>

                    <div className="dropdown-divider" />

                    <div className="dropdown-footer">
                      <button
                        type="button"
                        className="dropdown-logout-btn"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          void logout().catch(() =>
                            setLogoutError('Đã xóa phiên trên thiết bị này. Chưa xác nhận thu hồi phiên tại máy chủ.')
                          );
                        }}
                      >
                        <LogOut size={15} />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="apple-nav-action-btn apple-nav-user"
                aria-label="Đăng nhập"
                title="Đăng nhập"
              >
                <UserRound size={17} strokeWidth={1.5} />
              </Link>
            )}

            {/* Mobile Menu Hamburger Toggle */}
            <button
              ref={menuButton}
              type="button"
              className="apple-mobile-menu-btn"
              aria-expanded={menu}
              aria-label="Menu"
              onClick={() => setMenu(prev => !prev)}
            >
              {menu ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
            </button>
          </div>

        </div>

        {/* Apple Global Mega-Dropdown Overlay */}
        {activeDropdown && NAV_DROPDOWNS[activeDropdown] && (
          <div
            className="apple-nav-dropdown-overlay"
            onMouseEnter={handleDropdownMouseEnter}
            onMouseLeave={handleDropdownMouseLeave}
            role="region"
            aria-label="Menu điều hướng mở rộng"
          >
            <div className="apple-dropdown-container">
              {/* Column 1: Primary Large Links */}
              <div className="apple-dropdown-column">
                <span className="apple-dropdown-eyebrow">
                  {NAV_DROPDOWNS[activeDropdown].eyebrow1}
                </span>
                <div className="apple-dropdown-primary-links">
                  {NAV_DROPDOWNS[activeDropdown].primaryLinks.map((item, idx) => (
                    <Link
                      key={idx}
                      to={item.to}
                      className="apple-dropdown-primary-link"
                      onClick={closeDropdown}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Column 2: Quick Links */}
              <div className="apple-dropdown-column">
                <span className="apple-dropdown-eyebrow">
                  {NAV_DROPDOWNS[activeDropdown].eyebrow2}
                </span>
                <div className="apple-dropdown-secondary-links">
                  {NAV_DROPDOWNS[activeDropdown].secondaryLinks.map((item, idx) => (
                    <Link
                      key={idx}
                      to={item.to}
                      className="apple-dropdown-secondary-link"
                      onClick={closeDropdown}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Column 3: Special Category Links */}
              <div className="apple-dropdown-column">
                <span className="apple-dropdown-eyebrow">
                  {NAV_DROPDOWNS[activeDropdown].eyebrow3}
                </span>
                <div className="apple-dropdown-secondary-links">
                  {NAV_DROPDOWNS[activeDropdown].specialLinks.map((item, idx) => (
                    <Link
                      key={idx}
                      to={item.to}
                      className="apple-dropdown-secondary-link"
                      onClick={closeDropdown}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Apple Global Search Overlay (Rendered outside header to escape backdrop-filter clipping) */}
      {isSearchOpen && (
        <StoreSearch
          categories={categories.data || []}
          initialCategory={category}
          initialQuery={query}
          topOffset={drawerTop}
          onClose={() => setIsSearchOpen(false)}
        />
      )}

      {/* Mobile Slide-down Drawer (Rendered outside header so position:fixed spans the full viewport) */}
      {menu && (
        <div
          className="apple-mobile-drawer is-open"
          style={{ top: `${drawerTop}px` }}
          role="dialog"
          aria-label="Menu di động"
        >
          <NavLink to="/" end onClick={() => setMenu(false)} className="apple-nav-link">
            <span>Trang chủ</span>
          </NavLink>
          <NavLink to="/products" onClick={() => setMenu(false)} className="apple-nav-link">
            <span>Sản phẩm AnchorBox</span>
          </NavLink>
          <NavLink to="/technology" onClick={() => setMenu(false)} className="apple-nav-link">
            <span>Công nghệ IoT</span>
          </NavLink>
          <NavLink to="/app" onClick={() => setMenu(false)} className="apple-nav-link">
            <span>Ứng dụng di động</span>
          </NavLink>
          <NavLink to="/how-it-works" onClick={() => setMenu(false)} className="apple-nav-link">
            <span>Giao hàng & lắp đặt</span>
          </NavLink>
          <NavLink to="/warranty" onClick={() => setMenu(false)} className="apple-nav-link">
            <span>Bảo hành chính hãng</span>
          </NavLink>
          <NavLink to="/about" onClick={() => setMenu(false)} className="apple-nav-link">
            <span>Về AnchorBox</span>
          </NavLink>

          <div className="apple-drawer-divider" />

          <Link to="/compare" onClick={() => setMenu(false)} className="apple-nav-link">
            <span>So sánh các phiên bản tủ</span>
            <SlidersHorizontal size={16} />
          </Link>
          <Link to="/cart" onClick={() => setMenu(false)} className="apple-nav-link">
            <span>Giỏ hàng ({count})</span>
            <ShoppingBag size={16} />
          </Link>
          <Link to="/order-tracking" onClick={() => setMenu(false)} className="apple-nav-link">
            <span>Tra cứu đơn hàng</span>
            <Package size={16} />
          </Link>

          {user ? (
            <Link to="/account" onClick={() => setMenu(false)} className="apple-nav-link apple-drawer-user">
              <span>Tài khoản ({user.fullName || user.email})</span>
              <UserRound size={16} />
            </Link>
          ) : (
            <Link to="/login" onClick={() => setMenu(false)} className="apple-nav-link apple-drawer-user">
              <span>Đăng nhập tài khoản</span>
              <UserRound size={16} />
            </Link>
          )}
        </div>
      )}

      {/* Dimmed Blurred Backdrop behind Mega-Menu */}
      {activeDropdown && (
        <div
          className="apple-nav-backdrop-dim"
          style={{ top: `${drawerTop}px` }}
          onClick={closeDropdown}
          aria-hidden="true"
        />
      )}

      {logoutError && <p className="notice" role="status">{logoutError}</p>}
    </>
  );
}
