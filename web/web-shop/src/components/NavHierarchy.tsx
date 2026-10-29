import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  Package,
  SlidersHorizontal,
  Box,
  Cpu,
  Radio,
  LockKeyhole,
  Smartphone,
  KeyRound,
  ShieldCheck,
  Truck,
  HelpCircle,
  User,
  ShoppingBag,
  MapPin,
  LogOut
} from 'lucide-react';
import './nav-hierarchy.css';

interface NavHierarchyProps {
  user: any;
  lines: any[];
  logout: () => Promise<void>;
  setLogoutError: (msg: string) => void;
  onNavigate?: () => void;
}

export function NavHierarchy({ user, lines, logout, setLogoutError, onNavigate }: NavHierarchyProps) {
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = (menuKey: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpenDropdown(menuKey);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 180);
  };

  const toggleDropdown = (menuKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenDropdown(prev => (prev === menuKey ? null : menuKey));
  };

  // Đóng dropdown khi đổi đường dẫn
  useEffect(() => {
    setOpenDropdown(null);
  }, [location.pathname, location.hash]);

  const cartCount = lines.reduce((n, x) => n + x.quantity, 0);

  return (
    <div className="nav-hierarchy-container">
      {/* 1. MENU PHÂN CẤP: SẢN PHẨM */}
      <div
        className={`nav-item-dropdown ${openDropdown === 'products' ? 'is-open' : ''}`}
        onMouseEnter={() => handleMouseEnter('products')}
        onMouseLeave={handleMouseLeave}
      >
        <Link
          to="/products"
          className={`nav-parent-link ${location.pathname.startsWith('/products') || location.hash === '#choose' ? 'active' : ''}`}
          onClick={onNavigate}
        >
          <span>Sản phẩm</span>
          <ChevronDown
            size={14}
            className="chevron-indicator"
            onClick={(e) => toggleDropdown('products', e)}
          />
        </Link>
        <div className="dropdown-panel">
          <div className="dropdown-panel-inner">
            <Link to="/products" className="dropdown-sub-item" onClick={onNavigate}>
              <div className="sub-icon"><Package size={18} /></div>
              <div className="sub-text">
                <strong>Tất cả sản phẩm</strong>
                <small>Danh mục đầy đủ, lọc dung tích & kho</small>
              </div>
            </Link>
            <Link to="/compare" className="dropdown-sub-item" onClick={onNavigate}>
              <div className="sub-icon"><SlidersHorizontal size={18} /></div>
              <div className="sub-text">
                <strong>So sánh cấu hình</strong>
                <small>Đối chiếu Base và Pro theo từng thông số</small>
              </div>
            </Link>
            <Link to="/#choose" className="dropdown-sub-item" onClick={onNavigate}>
              <div className="sub-icon"><Box size={18} /></div>
              <div className="sub-text">
                <strong>Bộ sưu tập bán chạy</strong>
                <small>Chọn nhanh cấu hình trên trang chủ</small>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. MENU PHÂN CẤP: CÔNG NGHỆ */}
      <div
        className={`nav-item-dropdown ${openDropdown === 'tech' ? 'is-open' : ''}`}
        onMouseEnter={() => handleMouseEnter('tech')}
        onMouseLeave={handleMouseLeave}
      >
        <Link
          to="/technology"
          className={`nav-parent-link ${location.pathname === '/technology' || location.hash === '#technology' ? 'active' : ''}`}
          onClick={onNavigate}
        >
          <span>Công nghệ</span>
          <ChevronDown
            size={14}
            className="chevron-indicator"
            onClick={(e) => toggleDropdown('tech', e)}
          />
        </Link>
        <div className="dropdown-panel">
          <div className="dropdown-panel-inner">
            <Link to="/technology" className="dropdown-sub-item" onClick={onNavigate}>
              <div className="sub-icon"><Cpu size={18} /></div>
              <div className="sub-text">
                <strong>Kiến trúc IoT & Phản hồi</strong>
                <small>Cơ chế kết nối MQTT, ESP32 & Khóa điện tử</small>
              </div>
            </Link>
            <Link to="/technology#technology" className="dropdown-sub-item" onClick={onNavigate}>
              <div className="sub-icon"><Radio size={18} /></div>
              <div className="sub-text">
                <strong>Cảm biến tải trọng & Siêu âm</strong>
                <small>Đo trọng lượng và phát hiện bưu kiện vào tủ</small>
              </div>
            </Link>
            <Link to="/#technology" className="dropdown-sub-item" onClick={onNavigate}>
              <div className="sub-icon"><LockKeyhole size={18} /></div>
              <div className="sub-text">
                <strong>Mô hình 3D xoay 360°</strong>
                <small>Khám phá cấu tạo đa góc nhìn</small>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* 3. MENU PHÂN CẤP: ỨNG DỤNG APP */}
      <div
        className={`nav-item-dropdown ${openDropdown === 'app' ? 'is-open' : ''}`}
        onMouseEnter={() => handleMouseEnter('app')}
        onMouseLeave={handleMouseLeave}
      >
        <Link
          to="/app"
          className={`nav-parent-link ${location.pathname === '/app' || location.hash === '#mobile-app' ? 'active' : ''}`}
          onClick={onNavigate}
        >
          <span>Ứng dụng App</span>
          <ChevronDown
            size={14}
            className="chevron-indicator"
            onClick={(e) => toggleDropdown('app', e)}
          />
        </Link>
        <div className="dropdown-panel">
          <div className="dropdown-panel-inner">
            <Link to="/app" className="dropdown-sub-item" onClick={onNavigate}>
              <div className="sub-icon"><Smartphone size={18} /></div>
              <div className="sub-text">
                <strong>Hệ sinh thái Mobile App</strong>
                <small>Trang chuyên sâu về ứng dụng di động AnchorBox</small>
              </div>
            </Link>
            <Link to="/#mobile-app" className="dropdown-sub-item" onClick={onNavigate}>
              <div className="sub-icon"><KeyRound size={18} /></div>
              <div className="sub-text">
                <strong>Trải nghiệm tương tác thử</strong>
                <small>Mở khóa từ xa & tạo mã OTP shipper trên mockup</small>
              </div>
            </Link>
            <Link to="/account/devices" className="dropdown-sub-item" onClick={onNavigate}>
              <div className="sub-icon"><ShieldCheck size={18} /></div>
              <div className="sub-text">
                <strong>Thiết bị của tôi</strong>
                <small>Quản lý hộp đã kích hoạt sau nghiệm thu</small>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* 4. MENU PHÂN CẤP: GIAO & LẮP ĐẶT */}
      <div
        className={`nav-item-dropdown ${openDropdown === 'delivery' ? 'is-open' : ''}`}
        onMouseEnter={() => handleMouseEnter('delivery')}
        onMouseLeave={handleMouseLeave}
      >
        <Link
          to="/how-it-works"
          className={`nav-parent-link ${location.pathname === '/how-it-works' || location.pathname === '/warranty' || location.pathname === '/faq' || location.hash === '#how' ? 'active' : ''}`}
          onClick={onNavigate}
        >
          <span>Giao & lắp đặt</span>
          <ChevronDown
            size={14}
            className="chevron-indicator"
            onClick={(e) => toggleDropdown('delivery', e)}
          />
        </Link>
        <div className="dropdown-panel">
          <div className="dropdown-panel-inner">
            <Link to="/how-it-works" className="dropdown-sub-item" onClick={onNavigate}>
              <div className="sub-icon"><Truck size={18} /></div>
              <div className="sub-text">
                <strong>Quy trình 4 bước hoàn tất</strong>
                <small>Từ đặt hàng, kiểm duyệt, thi công đến nghiệm thu</small>
              </div>
            </Link>
            <Link to="/warranty" className="dropdown-sub-item" onClick={onNavigate}>
              <div className="sub-icon"><ShieldCheck size={18} /></div>
              <div className="sub-text">
                <strong>Chính sách & Tra cứu bảo hành</strong>
                <small>Bảo hành điện tử theo serial và nghiệm thu</small>
              </div>
            </Link>
            <Link to="/faq" className="dropdown-sub-item" onClick={onNavigate}>
              <div className="sub-icon"><HelpCircle size={18} /></div>
              <div className="sub-text">
                <strong>Câu hỏi thường gặp (FAQ)</strong>
                <small>Giải đáp về nguồn điện, chống nước & vận hành</small>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* 5. TÀI KHOẢN NGƯỜI DÙNG (CÓ DROPDOWN KHI ĐÃ ĐĂNG NHẬP) */}
      {user ? (
        <div
          className={`nav-item-dropdown ${openDropdown === 'user' ? 'is-open' : ''}`}
          onMouseEnter={() => handleMouseEnter('user')}
          onMouseLeave={handleMouseLeave}
        >
          <NavLink
            to="/account"
            className={`nav-parent-link user-pill ${location.pathname.startsWith('/account') ? 'active' : ''}`}
            onClick={onNavigate}
          >
            <User size={15} />
            <span>{user.fullName || user.email?.split('@')[0]}</span>
            <ChevronDown
              size={13}
              className="chevron-indicator"
              onClick={(e) => toggleDropdown('user', e)}
            />
          </NavLink>
          <div className="dropdown-panel dropdown-panel-right">
            <div className="dropdown-panel-inner">
              <Link to="/account" className="dropdown-sub-item" onClick={onNavigate}>
                <div className="sub-icon"><User size={17} /></div>
                <div className="sub-text">
                  <strong>Tổng quan tài khoản</strong>
                  <small>{user.email}</small>
                </div>
              </Link>
              <Link to="/account/orders" className="dropdown-sub-item" onClick={onNavigate}>
                <div className="sub-icon"><ShoppingBag size={17} /></div>
                <div className="sub-text">
                  <strong>Đơn hàng của tôi</strong>
                  <small>Theo dõi tiến độ duyệt & giao lắp</small>
                </div>
              </Link>
              <Link to="/account/addresses" className="dropdown-sub-item" onClick={onNavigate}>
                <div className="sub-icon"><MapPin size={17} /></div>
                <div className="sub-text">
                  <strong>Sổ địa chỉ nhận hàng</strong>
                  <small>Địa chỉ lắp đặt AnchorBox</small>
                </div>
              </Link>
              <Link to="/account/warranty" className="dropdown-sub-item" onClick={onNavigate}>
                <div className="sub-icon"><ShieldCheck size={17} /></div>
                <div className="sub-text">
                  <strong>Hồ sơ bảo hành thiết bị</strong>
                  <small>Tra cứu bảo hành & yêu cầu kỹ thuật</small>
                </div>
              </Link>
              <div className="dropdown-divider" />
              <button
                type="button"
                className="dropdown-logout-btn"
                onClick={() => {
                  void logout().catch(() => setLogoutError('Đã xóa phiên trên thiết bị này.'));
                  if (onNavigate) onNavigate();
                }}
              >
                <LogOut size={16} />
                <span>Đăng xuất tài khoản</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <NavLink to="/login" className="nav-parent-link login-btn" onClick={onNavigate}>
          Đăng nhập
        </NavLink>
      )}

      {/* 6. GIỎ HÀNG */}
      <NavLink to="/cart" className="nav-parent-link cart-pill" onClick={onNavigate}>
        <ShoppingBag size={16} />
        <span>Giỏ hàng ({cartCount})</span>
      </NavLink>
    </div>
  );
}
