import { ConsultationCall } from './components/ConsultationCall';
import { consultationPhone } from './contact';
import { CustomerDevices } from './pages/CustomerDevices';
import { StoreHome } from './pages/StoreHome';
import { AccountHome } from './pages/AccountHome';
import { VnpayReturn } from './pages/VnpayReturn';
import { SalesInvoice } from './pages/SalesInvoice';
import { useEffect, useRef } from 'react';
import { StoreHeader } from './components/StoreHeader';
import { Link, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { ShopProvider } from './ShopContext';
import { CatalogProvider } from './CatalogContext';
import { Guard } from './components/ShopUi';
import { Compare, Faq, Journey, ProductDetail, Technology } from './pages/ShopPublic';
import { Cart, Checkout, CheckoutRedirect, OrderDetail, OrderTicket, PaymentResult } from './pages/ShopCommerce';
import { useMarketingMotion } from './components/MarketingMotion';
import { Contact, DemoPayment } from './pages/ShopPlanned';
import { AuthRecovery } from './pages/AuthRecovery';
import { InstallationTracking, Warranty } from './pages/CustomerWarranty';
import { AppStory, Blog } from './pages/ShopStories';
import { OrderTracking } from './pages/OrderTracking';
import { ProductCatalogPage } from './pages/ProductCatalogPage';
import { AboutPage } from './pages/AboutPage';
import { AuthPortal } from './pages/AuthPortal';
function Shell() {
  const location = useLocation();
  useMarketingMotion(location.pathname);
  const prevPathRef = useRef(location.pathname);
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/forgot-password' || location.pathname === '/reset-password';
  useEffect(() => {
    const titles: Record<string, string> = {
      '/': 'Tủ Nhận Hàng Thông Minh Chống Trộm Tự Động 24/7',
      '/products': 'Danh Mục Sản Phẩm Tủ Nhận Hàng & Phụ Kiện',
      '/cart': 'Giỏ Hàng Của Bạn',
      '/checkout': 'Thanh Toán Đơn Hàng An Toàn',
      '/login': 'Đăng Nhập Tài Khoản Khách Hàng',
      '/register': 'Đăng Ký Tài Khoản Mới',
      '/forgot-password': 'Khôi Phục Mật Khẩu',
      '/reset-password': 'Đặt Lại Mật Khẩu Mới',
      '/account': 'Trung Tâm Quản Lý Thiết Bị & Tài Khoản',
      '/account/devices': 'Quản Lý Thiết Bị AnchorBox (Apple Home)',
      '/account/orders': 'Lịch Sử Đơn Hàng Của Tôi',
      '/account/profile': 'Hồ Sơ Cá Nhân',
      '/account/addresses': 'Sổ Địa Chỉ Giao Hàng',
      '/account/warranty': 'Bảo Hành Thiết Bị Của Tôi',
      '/warranty': 'Trung Tâm Bảo Hành & Chăm Sóc Khách Hàng',
      '/about': 'Về AnchorBox — Bản Trình Chiếu Công Nghệ',
      '/contact': 'Tư Vấn Khảo Sát & Hỗ Trợ Kỹ Thuật',
      '/compare': 'So Sánh Thông Số 3 Dòng Tủ AnchorBox Base, Pro & Solar',
      '/order-tracking': 'Tra Cứu Tiến Độ Đơn Hàng Trực Tuyến',
      '/technology': 'Công Nghệ Phần Cứng & Giao Thức IoT Kháng Nước IP65',
      '/app': 'Ứng Dụng Di Động AnchorBox Home — iOS & Android',
    };

    if (location.pathname.startsWith('/products/')) {
      const slug = location.pathname.replace('/products/', '');
      const slugTitles: Record<string, string> = {
        'anchorbox-base': 'AnchorBox Base — Tủ Nhận Bưu Kiện Thông Minh Tiêu Chuẩn 45L/75L',
        'anchorbox-pro': 'AnchorBox Pro — Flagship Camera AI 1080p & Cân Chống Tráo Hàng',
        'anchorbox-solar': 'AnchorBox Solar Max — Năng Lượng Mặt Trời Độc Lập 45 Ngày',
      };
      document.title = (slugTitles[slug] || 'Chi Tiết Sản Phẩm') + ' | AnchorBox';
    } else {
      document.title = titles[location.pathname] ? `${titles[location.pathname]} | AnchorBox` : 'AnchorBox — Tủ Nhận Hàng Thông Minh Tự Động 24/7';
    }
    const isAuthToggle =
      (prevPathRef.current === '/login' && location.pathname === '/register') ||
      (prevPathRef.current === '/register' && location.pathname === '/login');
    const pathChanged = prevPathRef.current !== location.pathname;
    prevPathRef.current = location.pathname;
    const frame = requestAnimationFrame(() => {
      const target = location.hash ? document.getElementById(location.hash.slice(1)) : null;
      if (target) {
        target.classList.add('motion-visible');
        target.setAttribute('tabindex', '-1');
        target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
        target.focus({ preventScroll: true });
      } else if (pathChanged && !isAuthToggle) {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);
  return <><a className="skip" href="#main">Đi đến nội dung</a>
    {!isAuthPage && (
      <div className="store-topbar">
        <div className="container">
          <span>ANCHORBOX — HỘP NHẬN HÀNG THÔNG MINH</span>
          <div className="store-topbar-links">
            <a href={consultationPhone.href} aria-label={`Gọi tư vấn ${consultationPhone.display}`}>Tư vấn: {consultationPhone.display}</a>
            <Link to="/order-tracking">Tra cứu đơn hàng →</Link>
          </div>
        </div>
      </div>
    )}
    <StoreHeader /><main id="main" tabIndex={-1}><Routes>
      <Route path="/" element={<StoreHome />} /><Route path="/products" element={<ProductCatalogPage />} /><Route path="/products/:id" element={<ProductDetail />} /><Route path="/compare" element={<Compare />} /><Route path="/technology" element={<Technology />} /><Route path="/app" element={<AppStory />} /><Route path="/faq" element={<Faq />} />
      <Route path="/order-tracking" element={<OrderTracking />} /><Route path="/tracking" element={<Navigate to="/order-tracking" replace />} />
      <Route path="/how-it-works" element={<section className="container section"><p className="eyebrow">TỪ LỰA CHỌN ĐẾN SỬ DỤNG</p><h1>Một hành trình kết nối.</h1><Journey /><h2>Sau khi kích hoạt.</h2><p>Bạn theo dõi trạng thái thiết bị, gửi lệnh điều khiển và xem lịch sử bưu kiện trong tài khoản của mình.</p></section>} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<Contact />} /><Route path="/blog" element={<Blog />} /><Route path="/blog/:slug" element={<Blog />} />
      <Route path="/login" element={<AuthPortal initialMode="login" />} />
      <Route path="/register" element={<AuthPortal initialMode="register" />} />
      <Route path="/forgot-password" element={<AuthRecovery mode="forgot" />} />
      <Route path="/reset-password" element={<AuthRecovery mode="reset" />} />
      <Route path="/cart" element={<Cart />} /><Route path="/checkout" element={<CheckoutRedirect />} /><Route path="/checkout/:orderId" element={<Guard><Checkout /></Guard>} /><Route path="/payments/vnpay/return" element={<Guard><VnpayReturn /></Guard>} /><Route path="/payment/result" element={<Guard><PaymentResult /></Guard>} /><Route path="/order-success/:id" element={<Guard><PaymentResult /></Guard>} />
      <Route path="/account" element={<Guard><AccountHome /></Guard>} />
      <Route path="/account/profile" element={<Guard><AccountHome defaultTab="profile" /></Guard>} />
      <Route path="/account/orders" element={<Guard><AccountHome defaultTab="orders" /></Guard>} />
      <Route path="/account/orders/:id" element={<Guard><OrderDetail /></Guard>} />
      <Route path="/account/orders/:id/invoice" element={<Guard><SalesInvoice /></Guard>} />
      <Route path="/account/orders/:id/ticket" element={<Guard><OrderTicket /></Guard>} />
      <Route path="/account/orders/:id/installation" element={<Guard><InstallationTracking /></Guard>} />
      <Route path="/account/devices" element={<Guard><AccountHome defaultTab="devices" /></Guard>} />
      <Route path="/account/devices/:id" element={<Guard><CustomerDevices /></Guard>} />
      <Route path="/account/notifications" element={<Guard><Navigate to="/account?notifications=open" replace /></Guard>} />
      <Route path="/warranty" element={<Warranty />} />
      <Route path="/account/warranty" element={<Navigate to="/warranty" replace />} />
      <Route path="/account/warranties" element={<Navigate to="/warranty" replace />} />
      <Route path="/account/warranty/claims/new" element={<Guard><Warranty claim /></Guard>} />
      <Route path="/account/addresses" element={<Guard><AccountHome defaultTab="addresses" /></Guard>} />
      <Route path="/demo-payment/:paymentId" element={<Guard><DemoPayment /></Guard>} />
      <Route path="*" element={<section className="container section"><p className="eyebrow">404</p><h1>Không tìm thấy trang.</h1><Link className="button" to="/">Về trang chủ</Link></section>} />
    </Routes></main><footer className="store-footer"><div className="container store-footer-grid"><div><Link className="brand" to="/">anchorbox.</Link><p>Một nơi dành cho bưu kiện.<br />Một lựa chọn cho ngôi nhà của bạn.</p></div><div><h2>Khám phá</h2><Link to="/products">Tất cả sản phẩm</Link><Link to="/compare">So sánh cấu hình</Link><Link to="/technology">Công nghệ</Link></div><div><h2>Hỗ trợ mua hàng</h2><Link to="/how-it-works">Quy trình giao & lắp</Link><Link to="/faq">Câu hỏi thường gặp</Link><Link to="/contact">Liên hệ tư vấn</Link><a href={consultationPhone.href} aria-label={`Gọi tư vấn ${consultationPhone.display}`}>Tư vấn: {consultationPhone.display}</a></div><div><h2>Tài khoản của bạn</h2><Link to="/account">Thông tin tài khoản</Link><Link to="/order-tracking">Theo dõi đơn hàng</Link><Link to="/warranty">Tra cứu bảo hành</Link></div></div><div className="container store-footer-bottom"><span>AnchorBox · Hộp nhận hàng thông minh</span><Link to="/about">Về AnchorBox ↗</Link></div></footer><ConsultationCall /></>;
}
export function App() { return <ShopProvider><CatalogProvider><Shell /></CatalogProvider></ShopProvider>; }
export default App;
